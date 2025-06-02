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

const getCartonSealerData = async (server_url, devices, configuration) => {
  try {
    const { address, sealers, device, url, area } = devices;
    const client = new modbus.client.RTU(configuration, address);

    sealers.map(async ({ machine, registerAddress }) => {
      const resultSealerPAM = await readRegistersWithRetry(
        client,
        registerAddress
      );
      const sealerCounter = resultSealerPAM.response.body.values[0];
      const form = new FormData();
      form.append("tipe", `carton_sealer_${machine.replace(" ", "_")}`);
      form.append("carton_counter", sealerCounter);

      await axios.post(`${server_url}${url}`, form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      log("green", `Carton Sealer ${machine.toUpperCase()}: ${sealerCounter}`);
    });

    log("blue", `Reading data from ${device} ${area}`);

    await delay(1500);
  } catch (error) {
    log("red", error);
  }
};

module.exports = getCartonSealerData;
