const express = require("express");
const cors = require("cors");
const chalk = require('chalk')
const modbus = require("jsmodbus");
const moment = require('moment')
const { SerialPort } = require("serialport");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
const configuration = new SerialPort({
  path: "COM4",
  baudRate: 9600,
  parity: "even",
  stopBits: 1,
  dataBits: 8,
});
const client = new modbus.client.RTU(configuration, 1, 2000);

app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use(
  cors({
    origin: "https://npsfood.com/",
  })
);

const scheduleNextExecution = (callback) => {
  const delay = 30 * 60 * 1000; // every 30 minute
  setTimeout(callback, delay);
};

const fetchData = async () => {
  const startPolling = async () => {
    try {
      const res = await client.readInputRegisters(1000, 1);
      const data = res.response.body.values[0];
      const form = new FormData();
      form.append("area", "mjl");
      form.append("nilai", data);

      await axios.post(process.env.server_url, form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      console.log(chalk.green(`[${moment().format('DD/MM/YY HH:mm:ss')}] - Successfully get pasteur temperature: ${data}`))
    } catch (error) {
      console.log(error);
    }

    scheduleNextExecution(() => startPolling());
  };
  return startPolling();
};

const main = async () => {
  await fetchData();
};

app.get("/api/test", (req, res) => {
  return res.status(200).json({
    status: true,
    message: "Success",
  });
});

app.post("/api/writePasteurData", async (req, res) => {
  try {
    const { pasteur } = req.body;
    const result = await client.writeSingleRegister(0o00, Number(pasteur));

    console.log(chalk.green(`[${moment().format('DD/MM/YY HH:mm:ss')}] - Successfully set pasteur temperature to: ${result.response.body.fc}`))

    return res.status(200).json({
      status: true,
      data: result.response.body.fc,
    });
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: error,
    });
  }
});

configuration.on("open", () => {
  main().catch((error) => {
    console.log(error);
  });
  app.listen("8888", "0.0.0.0", () => {
    console.log(chalk.yellow(`App running on port: 8888`));
  });
});

configuration.on("error", (err) => {
  console.error(err.message);
});
