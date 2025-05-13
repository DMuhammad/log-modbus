const fs = require("fs");
const chalk = require("chalk");
const moment = require("moment");
const { SerialPort } = require("serialport");

const serialConfiguration = (serial) => {
  return new SerialPort({
    path: serial,
    baudRate: 9600,
    parity: "even",
    stopBits: 1,
    dataBits: 8,
  });
};

const checkDate = (date) => {
  return moment(date).isSame(moment(), "day");
};

const checkRunning = (speed) => {
  return speed === 0 ? "Off" : "On";
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const delayWithCallback = (callback, ms) => {
  setTimeout(callback, ms);
};

const log = (color, message) => {
  const timestamp = moment().format("DD/MM/YY HH:mm:ss");
  console.log(chalk[color](`[${timestamp}] ${message}`));
};

const readFileFromJson = (path) => {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
};

module.exports = {
  serialConfiguration,
  checkDate,
  checkRunning,
  delay,
  delayWithCallback,
  log,
  readFileFromJson,
};
