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
  path: process.env.serial_port,
  baudRate: 9600,
  parity: "none",
  stopBits: 1,
  dataBits: 8,
});

const nrgs = [1, 5, 6, 8, 9, 10, 16];
const cvms = [2, 3, 4, 7, 11, 12, 13, 14, 15, 17, 18, 19, 20];
const areas = {
  1: "Workshop",
  2: "Kompressor",
  3: "LVMDB",
  4: "Genset - On Trigger",
  5: "DB Pump WTP",
  6: "DB Cooling Tower",
  7: "DB Production 1st Floor",
  8: "DB Packaging",
  9: "Lighting 1st Floor",
  10: "Lighting Cold Room",
  11: "DB Cold Room",
  12: "DB Sugar Area",
  13: "Warehouse",
  14: "DB Production 2nd Floor",
  15: "DB Filling Area",
  16: "DB Horizontal",
  17: "Lighting 2nd Floor",
  18: "DB Conveyor",
  19: "DB Production 3rd Floor",
  20: "Lighting 3rd Floor",
};

const combineDWord = (highWord, lowWord) => {
  highWord = highWord >>> 0;
  lowWord = lowWord >>> 0;

  return highWord * 0x10000 + lowWord; // 0x10000 == 2^16
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
    let registerCosP;
    let registerThdA1;
    let registerThdA2;
    let registerThdA3;
    let registerThdV1;
    let registerThdV2;
    let registerThdV3;
    let registerKwh;

    if (cvms.includes(slaveId)) {
      registerV1 = 0x00;
      registerV2 = 0x01;
      registerV3 = 0x02;
      registerA1 = 0x02;
      registerA2 = 0x12;
      registerA3 = 0x22;
      registerCosP = 0x3a;
      registerThdV1 = 0x46;
      registerThdV2 = 0x48;
      registerThdV3 = 0x4a;
      registerThdA1 = 0x4c;
      registerThdA2 = 0x4e;
      registerThdA3 = 0x50;
      registerKwh = 0xdc;
    } else if (nrgs.includes(slaveId)) {
      registerV1 = 0x00;
      registerV2 = 0x0a;
      registerV3 = 0x14;
      registerA1 = 0x02;
      registerA2 = 0x0c;
      registerA3 = 0x16;
      registerCosP = 0x24;
      registerThdV1 = 0x30;
      registerThdV2 = 0x32;
      registerThdV3 = 0x34;
      registerThdA1 = 0x36;
      registerThdA2 = 0x38;
      registerThdA3 = 0x3a;
      registerKwh = 0x3c;
    }

    const scaleKwh = nrgs.includes(slaveId) ? 1000 : 1;

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
    const dataCosP = await client.readHoldingRegisters(
      registerCosP,
      numberOfRegisters
    );
    const dataThdA1 = await client.readHoldingRegisters(
      registerThdA1,
      numberOfRegisters
    );
    const dataThdA2 = await client.readHoldingRegisters(
      registerThdA2,
      numberOfRegisters
    );
    const dataThdA3 = await client.readHoldingRegisters(
      registerThdA3,
      numberOfRegisters
    );
    const dataThdV1 = await client.readHoldingRegisters(
      registerThdV1,
      numberOfRegisters
    );
    const dataThdV2 = await client.readHoldingRegisters(
      registerThdV2,
      numberOfRegisters
    );
    const dataThdV3 = await client.readHoldingRegisters(
      registerThdV3,
      numberOfRegisters
    );
    const dataKwh = await client.readHoldingRegisters(
      registerKwh,
      numberOfRegisters
    );

    const a1 =
      combineDWord(
        dataA1.response.body.values[0],
        dataA1.response.body.values[1]
      ) / 1000;
    const a2 =
      combineDWord(
        dataA2.response.body.values[0],
        dataA2.response.body.values[1]
      ) / 1000;
    const a3 =
      combineDWord(
        dataA3.response.body.values[0],
        dataA3.response.body.values[1]
      ) / 1000;
    const v1 =
      combineDWord(
        dataV1.response.body.values[0],
        dataV1.response.body.values[1]
      ) / 10;
    const v2 =
      combineDWord(
        dataV2.response.body.values[0],
        dataV2.response.body.values[1]
      ) / 10;
    const v3 =
      combineDWord(
        dataV3.response.body.values[0],
        dataV3.response.body.values[1]
      ) / 10;
    const thdA1 =
      combineDWord(
        dataThdA1.response.body.values[0],
        dataThdA1.response.body.values[1]
      ) / 10;
    const thdA2 =
      combineDWord(
        dataThdA2.response.body.values[0],
        dataThdA2.response.body.values[1]
      ) / 10;
    const thdA3 =
      combineDWord(
        dataThdA3.response.body.values[0],
        dataThdA3.response.body.values[1]
      ) / 10;
    const thdV1 =
      combineDWord(
        dataThdV1.response.body.values[0],
        dataThdV1.response.body.values[1]
      ) / 10;
    const thdV2 =
      combineDWord(
        dataThdV2.response.body.values[0],
        dataThdV2.response.body.values[1]
      ) / 10;
    const thdV3 =
      combineDWord(
        dataThdV3.response.body.values[0],
        dataThdV3.response.body.values[1]
      ) / 10;
    const cosP = combineDWord(
      dataCosP.response.body.values[0],
      dataCosP.response.body.values[1]
    );
    const kwh =
      combineDWord(
        dataKwh.response.body.values[0],
        dataKwh.response.body.values[1]
      ) / scaleKwh;

    const form = new FormData();
    form.append("area", areas[slaveId]);
    form.append("kwh", kwh);
    form.append("a1", a1);
    form.append("a2", a2);
    form.append("a3", a3);
    form.append("v1", v1);
    form.append("v2", v2);
    form.append("v3", v3);
    form.append("cosP", cosP);
    form.append("thdA1", thdA1);
    form.append("thdA2", thdA2);
    form.append("thdA3", thdA3);
    form.append("thdV1", thdV1);
    form.append("thdV2", thdV2);
    form.append("thdV3", thdV3);

    await axios.post(`${server_url}/powermeter`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    log("green", `kwh: ${kwh}`);
    log("green", `a1: ${a1}`);
    log("green", `a2: ${a2}`);
    log("green", `a3: ${a3}`);
    log("green", `v1: ${v1}`);
    log("green", `v2: ${v2}`);
    log("green", `v3: ${v3}`);
    log("green", `cosP: ${cosP}`);
    log("green", `THD A1: ${thdA1}`);
    log("green", `THD A2: ${thdA2}`);
    log("green", `THD A3: ${thdA3}`);
    log("green", `THD V1: ${thdV1}`);
    log("green", `THD V2: ${thdV2}`);
    log("green", `THD V3: ${thdV3}`);
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
