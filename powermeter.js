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

const configuration = new SerialPort({
  path: "COM7",
  baudRate: 9600,
  parity: "none",
  stopBits: 1,
  dataBits: 8,
});

const nrgs = [1, 5, 6, 8, 9, 10, 15];
const cvms = [2, 3, 4, 7, 11, 12, 13, 14];
const areas = {
  1: "LVMDB",
  2: "Kompressor",
  3: "Workshop",
  4: "DB Snack",
  5: "DB Pump WTP",
  6: "DB Cooling Tower",
  7: "DB 1st Floor",
  8: "DB Packaging",
  9: "Lighting 1st Floor",
  10: "Cold Room Lighting",
  11: "DB Cold Room",
  12: "DB Sugar Area",
  13: "Warehouse",
  14: "DB 2nd Floor",
  15: "DB Filling Area",
  16: "DB Horizontal",
  17: "Lighting 2nd Floor",
  18: "DB Conveyor",
  19: "DB 3rd Floor",
  20: "Lighting 3rd Floor",
};

const getPowerMeterData = async (slaveId) => {
  try {
    const client = new modbus.client.RTU(configuration, slaveId, 5000);
    const numberOfRegisters = 2;

    let registerA1;
    let registerA2;
    let registerA3;
    let registerV1;
    let registerV2;
    let registerV3;
    let registerKwh;

    if (cvms.includes(slaveId)) {
      registerV1 = 0x0000;
      registerV2 = 0x0010;
      registerV3 = 0x0020;
      registerA1 = 0x0002;
      registerA2 = 0x0012;
      registerA3 = 0x0022;
      registerKwh = 0x005e;
    } else if (nrgs.includes(slaveId)) {
      registerV1 = 0x0000;
      registerV2 = 0x000a;
      registerV3 = 0x0014;
      registerA1 = 0x0002;
      registerA2 = 0x000c;
      registerA3 = 0x0016;
      registerKwh = 0x003c;
    }

    const dataV1 = await client.readHoldingRegisters(
      registerV1,
      numberOfRegisters
    );
    const dataV2 = await client.readHoldingRegisters(
      registerV2,
      numberOfRegisters
    );
    const dataV3 = await client.readHoldingRegisters(
      registerV3,
      numberOfRegisters
    );
    const dataA1 = await client.readHoldingRegisters(
      registerA1,
      numberOfRegisters
    );
    const dataA2 = await client.readHoldingRegisters(
      registerA2,
      numberOfRegisters
    );
    const dataA3 = await client.readHoldingRegisters(
      registerA3,
      numberOfRegisters
    );
    const dataKwh = await client.readHoldingRegisters(
      registerKwh,
      numberOfRegisters
    );

    const form = new FormData();
    form.append("area", areas[slaveId]);
    form.append("kwh", dataKwh.response.body.values[1]);
    form.append("a1", dataA1.response.body.values[1] / 1000);
    form.append("a2", dataA2.response.body.values[1] / 1000);
    form.append("a3", dataA3.response.body.values[1] / 1000);
    form.append("v1", dataV1.response.body.values[1] / 10);
    form.append("v2", dataV2.response.body.values[1] / 10);
    form.append("v3", dataV3.response.body.values[1] / 10);

    await axios.post(process.env.server_url, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    log("green", `kwh: ${dataKwh.response.body.values[1]}`);
    log("green", `a1: ${dataA1.response.body.values[1] / 1000}`);
    log("green", `a2: ${dataA2.response.body.values[1] / 1000}`);
    log("green", `a3: ${dataA3.response.body.values[1] / 1000}`);
    log("green", `v1: ${dataV1.response.body.values[1] / 10}`);
    log("green", `v2: ${dataV2.response.body.values[1] / 10}`);
    log("green", `v3: ${dataV3.response.body.values[1] / 10}`);
  } catch (error) {
    console.log(error);
  }
};

configuration.setMaxListeners(0);
configuration.on("open", async () => {
  while (true) {
    for (let i = 1; i <= 20; i++) {
      log("blue", `Wait for getting data from ${areas[i]}`);
      getPowerMeterData(i).catch((err) => {
        console.log(err);
        process.exit(1);
      });
      await delay(3000);
    }
    log("yellow", "Waiting for next execution");
    await delay(30 * 60 * 1000);
  }
});

configuration.on("error", (err) => {
  log("red", err.message);
});
