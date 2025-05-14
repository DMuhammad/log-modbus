const axios = require("axios");
const FormData = require("form-data");
const modbus = require("jsmodbus");
const { log, delay } = require("../utils");

const getMetalData = async (server_url, devices, configuration) => {
  try {
    const { address, registerAddresses, device, url, area } = devices;
    const client = new modbus.client.RTU(configuration, address, 10000);

    const dataCounter = await readRegistersWithRetry(
      client,
      registerAddresses[0]
    );
    const metalCounter = dataCounter.response.body.values[0];

    const form = new FormData();
    form.append("tipe", "metal_detector");
    form.append("metal_counter", metalCounter);

    await axios.post(`${server_url}${url}`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    log("green", `Metal Counter: ${metalCounter}`);
    log("blue", `Reading data from ${device} ${area}`);
  } catch (error) {
    console.log(error);
  }
};

const readRegistersWithRetry = async (
  client,
  registerAddress,
  maxRetries = 3
) => {
  let retries = 0;
  let lastError = null;

  while (retries < maxRetries) {
    try {
      const result = await client.readHoldingRegisters(registerAddress, 1);
      return result;
    } catch (error) {
      lastError = error;
      retries++;
      log(
        "yellow",
        `Retry ${retries}/${maxRetries} for register ${registerAddress.toString(
          16
        )}: ${error.message}`
      );
      await delay(1000 * retries);
    }
  }

  throw new Error(
    `Failed to read register ${registerAddress.toString(
      16
    )} after ${maxRetries} retries: ${lastError.message}`
  );
};

module.exports = getMetalData;
