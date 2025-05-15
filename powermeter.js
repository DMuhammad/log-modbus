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

const nrgs = [1, 5, 6, 9, 10, 16];
const cvms = [2, 3, 4, 7, 8, 11, 12, 13, 14, 15, 17, 18, 19, 20];
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

const registerConfigs = {
  cvm: {
    registerV1: 0x00,
    registerV2: 0x01,
    registerV3: 0x02,
    registerA1: 0x03,
    registerA2: 0x12,
    registerA3: 0x22,
    registerCosP: 0x3a,
    registerThdV1: 0x46,
    registerThdV2: 0x48,
    registerThdV3: 0x4a,
    registerThdA1: 0x4c,
    registerThdA2: 0x4e,
    registerThdA3: 0x50,
    registerKwh: 0xdc,
    scaleKwh: 1,
    scaleCurrent: 1000,
    scaleVoltage: 10,
    scaleThd: 10,
  },
  nrg: {
    registerV1: 0x00,
    registerV2: 0x0a,
    registerV3: 0x14,
    registerA1: 0x02,
    registerA2: 0x0c,
    registerA3: 0x16,
    registerCosP: 0x24,
    registerThdV1: 0x30,
    registerThdV2: 0x32,
    registerThdV3: 0x34,
    registerThdA1: 0x36,
    registerThdA2: 0x38,
    registerThdA3: 0x3a,
    registerKwh: 0x3c,
    scaleKwh: 1000,
    scaleCurrent: 1000,
    scaleVoltage: 10,
    scaleThd: 10,
  },
};

const combineDWord = (highWord, lowWord) => {
  highWord = highWord >>> 0;
  lowWord = lowWord >>> 0;

  return highWord * 0x10000 + lowWord; // 0x10000 == 2^16
};

const validateRegisterValue = (
  value,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (value === null || value === undefined || isNaN(value)) {
    return false;
  }
  return value >= min && value <= max;
};

const readRegistersWithRetry = async (
  client,
  register,
  numberOfRegisters,
  maxRetries = 3
) => {
  let retries = 0;
  let lastError = null;

  while (retries < maxRetries) {
    try {
      const result = await client.readHoldingRegisters(
        register,
        numberOfRegisters
      );
      return result;
    } catch (error) {
      lastError = error;
      retries++;
      log(
        "yellow",
        `Retry ${retries}/${maxRetries} for register ${register.toString(
          16
        )}: ${error.message}`
      );
      await delay(1000 * retries); // Exponential backoff
    }
  }

  throw new Error(
    `Failed to read register ${register.toString(
      16
    )} after ${maxRetries} retries: ${lastError.message}`
  );
};

const processRegisterData = (data, scale = 1) => {
  if (
    !data ||
    !data.response ||
    !data.response.body ||
    !data.response.body.values ||
    data.response.body.values.length < 2
  ) {
    throw new Error("Invalid register data format");
  }

  const value =
    combineDWord(data.response.body.values[0], data.response.body.values[1]) /
    scale;

  if (!validateRegisterValue(value)) {
    throw new Error(`Invalid register value: ${value}`);
  }

  return value;
};

const getPowerMeterData = async (slaveId) => {
  if (!areas[slaveId]) {
    throw new Error(`Invalid slave ID: ${slaveId}`);
  }

  const deviceType = cvms.includes(slaveId)
    ? "cvm"
    : nrgs.includes(slaveId)
    ? "nrg"
    : null;
  if (!deviceType) {
    throw new Error(
      `Slave ID ${slaveId} is not configured for any device type`
    );
  }

  const config = registerConfigs[deviceType];
  const numberOfRegisters = 2;

  const client = new modbus.client.RTU(configuration, slaveId, 5000);

  try {
    const dataV1 = await readRegistersWithRetry(
      client,
      config.registerV1,
      numberOfRegisters
    );
    const dataV2 = await readRegistersWithRetry(
      client,
      config.registerV2,
      numberOfRegisters
    );
    const dataV3 = await readRegistersWithRetry(
      client,
      config.registerV3,
      numberOfRegisters
    );
    const dataA1 = await readRegistersWithRetry(
      client,
      config.registerA1,
      numberOfRegisters
    );
    const dataA2 = await readRegistersWithRetry(
      client,
      config.registerA2,
      numberOfRegisters
    );
    const dataA3 = await readRegistersWithRetry(
      client,
      config.registerA3,
      numberOfRegisters
    );
    const dataCosP = await readRegistersWithRetry(
      client,
      config.registerCosP,
      numberOfRegisters
    );
    const dataThdA1 = await readRegistersWithRetry(
      client,
      config.registerThdA1,
      numberOfRegisters
    );
    const dataThdA2 = await readRegistersWithRetry(
      client,
      config.registerThdA2,
      numberOfRegisters
    );
    const dataThdA3 = await readRegistersWithRetry(
      client,
      config.registerThdA3,
      numberOfRegisters
    );
    const dataThdV1 = await readRegistersWithRetry(
      client,
      config.registerThdV1,
      numberOfRegisters
    );
    const dataThdV2 = await readRegistersWithRetry(
      client,
      config.registerThdV2,
      numberOfRegisters
    );
    const dataThdV3 = await readRegistersWithRetry(
      client,
      config.registerThdV3,
      numberOfRegisters
    );
    const dataKwh = await readRegistersWithRetry(
      client,
      config.registerKwh,
      numberOfRegisters
    );

    const a1 = processRegisterData(dataA1, config.scaleCurrent);
    const a2 = processRegisterData(dataA2, config.scaleCurrent);
    const a3 = processRegisterData(dataA3, config.scaleCurrent);
    const v1 = processRegisterData(dataV1, config.scaleVoltage);
    const v2 = processRegisterData(dataV2, config.scaleVoltage);
    const v3 = processRegisterData(dataV3, config.scaleVoltage);
    const thdA1 = processRegisterData(dataThdA1, config.scaleThd);
    const thdA2 = processRegisterData(dataThdA2, config.scaleThd);
    const thdA3 = processRegisterData(dataThdA3, config.scaleThd);
    const thdV1 = processRegisterData(dataThdV1, config.scaleThd);
    const thdV2 = processRegisterData(dataThdV2, config.scaleThd);
    const thdV3 = processRegisterData(dataThdV3, config.scaleThd);
    const cosP = processRegisterData(dataCosP);
    const kwh = processRegisterData(dataKwh, config.scaleKwh);

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

    try {
      const response = await axios.post(`${server_url}/powermeter`, form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 10000,
      });

      log("green", `Successfully sent data for ${areas[slaveId]}`);
      log("green", `kwh: ${kwh}`);

      const logCurrent = (value, phase) => {
        const color = value > 10 ? "red" : value > 5 ? "yellow" : "green";
        log(color, `a${phase}: ${value}`);
      };
      logCurrent(a1, 1);
      logCurrent(a2, 2);
      logCurrent(a3, 3);

      const logVoltage = (value, phase) => {
        const color =
          value < 200 || value > 240
            ? "red"
            : value < 210 || value > 230
            ? "yellow"
            : "green";
        log(color, `v${phase}: ${value}`);
      };
      logVoltage(v1, 1);
      logVoltage(v2, 2);
      logVoltage(v3, 3);

      const logCosP = (value) => {
        const color = value < 0.8 ? "red" : value < 0.9 ? "yellow" : "green";
        log(color, `cosP: ${value}`);
      };
      logCosP(cosP);

      const logThd = (value, type, phase) => {
        const color = value > 10 ? "red" : value > 5 ? "yellow" : "green";
        log(color, `THD ${type}${phase}: ${value}`);
      };
      logThd(thdA1, "A", 1);
      logThd(thdA2, "A", 2);
      logThd(thdA3, "A", 3);
      logThd(thdV1, "V", 1);
      logThd(thdV2, "V", 2);
      logThd(thdV3, "V", 3);

      return response.data;
    } catch (apiError) {
      log("red", `API Error for ${areas[slaveId]}: ${apiError.message}`);
      throw apiError;
    }
  } catch (error) {
    log("red", `Error reading data from ${areas[slaveId]}: ${error.message}`);
    throw error;
  } finally {
    log("blue", `Completed reading data from ${areas[slaveId]}`);
  }
};

configuration.setMaxListeners(0);
configuration.on("open", async () => {
  log("green", "Serial port opened successfully");

  while (true) {
    try {
      for (let i = 1; i <= 20; i++) {
        log("blue", `Reading data from ${areas[i]}`);
        try {
          await getPowerMeterData(i);
        } catch (err) {
          log("red", `Failed to read data from ${areas[i]}: ${err.message}`);
        }
        await delay(3000);
      }
      log("yellow", "Completed one cycle, waiting for next execution");
      await delay(30 * 60 * 1000);
    } catch (cycleError) {
      log("red", `Error in main cycle: ${cycleError.message}`);
      await delay(60 * 1000);
    }
  }
});

configuration.on("error", (err) => {
  log("red", `Serial port error: ${err.message}`);
  setTimeout(() => {
    log("yellow", "Attempting to reconnect...");
    configuration.open();
  }, 5000);
});
