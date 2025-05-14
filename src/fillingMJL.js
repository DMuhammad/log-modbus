const FormData = require("form-data");
const { log, delay, checkDate, checkRunning } = require("../utils");
const fs = require("fs");
const moment = require("moment");
const modbus = require("jsmodbus");
const axios = require("axios");

let loggerFilling;

if (fs.existsSync("log-filling.json")) {
  loggerFilling = JSON.parse(fs.readFileSync("log-filling.json"));
}

const getFillingData = async (server_url, devices, configuration) => {
  try {
    const { address, registerAddresses, device, url, area } = devices;
    const client = new modbus.client.RTU(configuration, address, 5000);

    if (checkDate(loggerFilling[address].hourMeter)) {
      loggerFilling[address].hourMeter = moment().toISOString();
    }

    const dataCupCounter = await readRegistersWithRetry(
      client,
      registerAddresses[0]
    );
    const dataSpeed = await readRegistersWithRetry(
      client,
      registerAddresses[1]
    );
    const dataRunningHour = await readRegistersWithRetry(
      client,
      registerAddresses[2]
    );

    // speed == 0 ? (machines[address].downtime != null ? machines[address].downtime : moment()) : null;
    // const duration = moment.duration(now.diff(machines[address].hourMeter));

    const temperature = 0;
    const cupCounter = dataCupCounter.response.body.values[0];
    const speed = dataSpeed.response.body.values[0];
    const runningHour = dataRunningHour.response.body.values[0];
    const isRunning = checkRunning(speed);
    let hourMeter = moment
      .duration(moment().diff(moment(loggerFilling[address].hourMeter)))
      .seconds();
    let downtime = 0;

    if (isRunning == "Off" && cupCounter > 48) {
      if (loggerFilling[address].downtime === null) {
        loggerFilling[address].downtime = moment().toISOString();
        loggerFilling[address].logHourMeter =
          loggerFilling[address].logHourMeter > 0
            ? loggerFilling[address].logHourMeter + hourMeter
            : loggerFilling[address].logHourMeter;
      } else {
        hourMeter = loggerFilling[address].logHourMeter;
        downtime = moment
          .duration(moment().diff(moment(loggerFilling[address].downtime)))
          .seconds();
        downtime =
          loggerFilling[address].logDowntime > 0
            ? loggerFilling[address].logDowntime + downtime
            : downtime;
      }
    }

    if (isRunning == "On") {
      if (loggerFilling[address].downtime !== null) {
        loggerFilling[address].logDowntime = loggerFilling[address].downtime;
        loggerFilling[address].downtime = null;
        loggerFilling[address].hourMeter = moment().toISOString();
        hourMeter = loggerFilling[address].logHourMeter;
      } else {
        hourMeter += loggerFilling[address].logHourMeter;
      }
    }

    const form = new FormData();
    form.append("machine_id", loggerFilling[address].id);
    form.append("temperature", temperature);
    form.append("cup_counter", cupCounter);
    form.append("downtime", downtime);
    form.append("hour_meter", runningHour);
    form.append("status", isRunning);

    await axios.post(`${server_url}${url}`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    log("green", `Bucket: ${isRunning}`);
    log("green", `Temperature: ${temperature}`);
    log("green", `Cup Counter: ${cupCounter}`);
    log("green", `Speed: ${speed}`);
    log("green", `Downtime: ${downtime}`);
    log("green", `Hour Meter: ${runningHour}`);
    log("blue", `Reading data from ${device} ${area}`);

    loggerFilling[address].tanggal = moment().format("DD/MM/YY");
    fs.writeFileSync("log-filling.json", JSON.stringify(loggerFilling), "utf8");
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
      await delay(1000 * retries); // Exponential backoff
    }
  }

  throw new Error(
    `Failed to read register ${registerAddress.toString(
      16
    )} after ${maxRetries} retries: ${lastError.message}`
  );
};

module.exports = getFillingData;
