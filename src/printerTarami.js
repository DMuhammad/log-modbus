const axios = require("axios");
const FormData = require("form-data");
const modbus = require("jsmodbus");
const { log, delay } = require("../utils");

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

const getPrinterData = async (server_url, devices, configuration) => {
  try {
    const { address, registerAddresses, device, url, area } = devices;
    const client = new modbus.client.RTU(configuration, address);

    const dataCounter = await readRegistersWithRetry(
      client,
      registerAddresses[0]
    );
    const printerCounter = dataCounter.response.body.values[0];

    const form = new FormData();
    form.append("counter", printerCounter);

    await axios.post(`${server_url}${url}`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    log("green", `Printer Counter: ${printerCounter}`);
    log("blue", `Reading data from ${device} ${area}`);
  } catch (error) {
    console.log(error);
  }
};

module.exports = getPrinterData;
