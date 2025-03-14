const axios = require("axios");
const chalk = require("chalk");
const moment = require("moment");
const modbus = require("jsmodbus");
const fs = require("fs");
const { SerialPort } = require("serialport");
const FormData = require("form-data");
require("dotenv").config();

let loggerFilling;
const server_url = process.env.server_url;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const log = (color, message) => {
  const timestamp = moment().format("DD/MM/YY HH:mm:ss");
  console.log(chalk[color](`[${timestamp}] ${message}`));
};
const checkDate = (date) => {
  return moment(date).isSame(moment(), "day");
};
const checkRunning = (speed) => {
  return speed == 0 ? "Off" : "On";
};

if (fs.existsSync("log-filling.json")) {
  loggerFilling = JSON.parse(fs.readFileSync("log-filling.json", "utf8"));
}

const configuration = new SerialPort({
  path: "COM3",
  baudRate: 9600,
  parity: "even",
  stopBits: 1,
  dataBits: 8,
});

const getFillingData = async (slaveId) => {
  try {
    const client = new modbus.client.RTU(configuration, slaveId, 5000);
    const numberOfRegisters = 1;

    if (checkDate(loggerFilling[slaveId].hourMeter)) {
      loggerFilling[slaveId].hourMeter = moment().toISOString();
    }

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
    const isRunning = checkRunning(speed);
    let hourMeter = moment
      .duration(moment().diff(moment(loggerFilling[slaveId].hourMeter)))
      .seconds();
    let downtime = 0;

    if (isRunning == "Off" && cupCounter > 48) {
      if (loggerFilling[slaveId].downtime === null) {
        loggerFilling[slaveId].downtime = moment().toISOString();
        loggerFilling[slaveId].logHourMeter =
          loggerFilling[slaveId].logHourMeter > 0
            ? loggerFilling[slaveId].logHourMeter + hourMeter
            : loggerFilling[slaveId].logHourMeter;
      } else {
        hourMeter = loggerFilling[slaveId].logHourMeter;
        downtime = moment
          .duration(moment().diff(moment(loggerFilling[slaveId].downtime)))
          .seconds();
        downtime =
          loggerFilling[slaveId].logDowntime > 0
            ? loggerFilling[slaveId].logDowntime + downtime
            : downtime;
      }
    }

    if (isRunning == "On") {
      if (loggerFilling[slaveId].downtime !== null) {
        loggerFilling[slaveId].logDowntime = loggerFilling[slaveId].downtime;
        loggerFilling[slaveId].downtime = null;
        loggerFilling[slaveId].hourMeter = moment().toISOString();
        hourMeter = loggerFilling[slaveId].logHourMeter;
      } else {
        hourMeter += loggerFilling[slaveId].logHourMeter;
      }
    }

    const form = new FormData();
    form.append("machine_id", loggerFilling[slaveId].id);
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

    loggerFilling[slaveId].tanggal = moment().format("DD/MM/YY");
    fs.writeFileSync("log-filling.json", JSON.stringify(loggerFilling), "utf8");
  } catch (error) {
    console.log(error);
  }
};

configuration.setMaxListeners(0);
configuration.on("open", async () => {
  while (true) {
    for (let i = 37; i <= 40; i++) {
      loggerFilling[i].hourMeter =
        loggerFilling[i].hourMeter === null
          ? moment().toISOString()
          : loggerFilling[i].hourMeter;
      log("blue", `Wait for getting data from ${loggerFilling[i].machine}`);
      getFillingData(i).catch((err) => {
        console.log(err);
        process.exit(1);
      });
      await delay(2000);
    }
    log("blue", `Waiting 30s for next execution`);
    await delay(30 * 1000);
  }
});

configuration.on("error", (err) => {
  log("red", err.message);
});
