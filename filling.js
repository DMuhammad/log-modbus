const axios = require("axios");
const chalk = require("chalk");
const moment = require("moment");
const modbus = require("jsmodbus");
const { SerialPort } = require("serialport");
const FormData = require("form-data");
require("dotenv").config();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const log = (color, message) => {
  const timestamp = moment().format("DD/MM/YY HH:mm:ss");
  console.log(chalk[color](`[${timestamp}] ${message}`));
};
const server_url = process.env.server_url;

const configuration = new SerialPort({
  path: "COM3",
  baudRate: 9600,
  parity: "even",
  stopBits: 1,
  dataBits: 8,
});

const machines = {
  31: {
    id: 1,
    machine: "GF 1",
    downtime: null,
    hourMeter: moment(),
  },
  32: {
    id: 2,
    machine: "GF 2",
    downtime: null,
    hourMeter: moment(),
  },
  33: {
    id: 3,
    machine: "GF 3",
    downtime: null,
    hourMeter: moment(),
  },
  34: {
    id: 4,
    machine: "GF 4",
    downtime: null,
    hourMeter: moment(),
  },
  35: {
    id: 5,
    machine: "GF 5",
    downtime: null,
    hourMeter: moment(),
  },
  36: {
    id: 6,
    machine: "GF 6",
    downtime: null,
    hourMeter: moment(),
  },
  37: {
    id: 7,
    machine: "GF 7",
    downtime: null,
    hourMeter: moment(),
  },
  38: {
    id: 8,
    machine: "GF 8",
    downtime: null,
    hourMeter: moment(),
  },
  39: {
    id: 9,
    machine: "GF 9",
    downtime: null,
    hourMeter: moment(),
  },
  40: {
    id: 10,
    machine: "GF 10",
    downtime: null,
    hourMeter: moment(),
  },
};

console.log(machines);

const getFillingData = async (slaveId) => {
  try {
    const client = new modbus.client.RTU(configuration, slaveId, 2000);
    const numberOfRegisters = 1;

    const registerCupCounter = 4496;
    const registerSpeed = 4192;

    const dataCupCounter = await client.readHoldingRegisters(
      registerCupCounter,
      numberOfRegisters
    );
    const dataSpeed = await client.readHoldingRegisters(
      registerSpeed,
      numberOfRegisters
    );

    // speed == 0 ? (machines[slaveId].downtime != null ? machines[slaveId].downtime : moment()) : null;
    // const duration = moment.duration(now.diff(machines[slaveId].hourMeter));

    const temperature = 0;
    const cupCounter = dataCupCounter.response.body.values[0];
    const speed = dataSpeed.response.body.values[0];
    const downtime = 0;
    const hourMeter = moment
      .duration(moment().diff(machines[slaveId].hourMeter))
      .minutes();
    const isRunning = speed == 0 ? "Off" : "On";

    const form = new FormData();
    form.append("machine_id", machines[slaveId].id);
    form.append("temperature", temperature);
    form.append("cup_counter", cupCounter);
    form.append("downtime", downtime);
    form.append("hour_meter", hourMeter);
    form.append("status", isRunning);

    await axios.post(`${server_url}/filling-mjl`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    log("green", `Bucket: ${isRunning}`);
    log("green", `Temperature: ${temperature}`);
    log("green", `Cup Counter: ${cupCounter}`);
    log("green", `Speed: ${speed}`);
    log("green", `Downtime: ${downtime}`);
    log("green", `Hour Meter: ${hourMeter}`);
  } catch (error) {
    console.log(error);
  }
};

configuration.setMaxListeners(0);
configuration.on("open", async () => {
  while (true) {
    for (let i = 37; i <= 40; i++) {
      log("blue", `Wait for getting data from ${machines[i].machine}`);
      getFillingData(i).catch((err) => {
        console.log(err);
        process.exit(1);
      });
      await delay(5000);
    }
    log("blue", `Waiting for next execution`);
    await delay(30 * 1000);
  }
});

configuration.on("error", (err) => {
  log("red", err.message);
});
