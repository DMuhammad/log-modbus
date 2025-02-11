const express = require("express");
const cors = require("cors");
const modbus = require("jsmodbus");
const { SerialPort } = require("serialport");
const axios = require("axios");
const FormData = require("form-data");
const delay = require("delay");
require("dotenv").config();

const app = express();
const configuration = new SerialPort({
  path: process.env.serial_port,
  baudrate: 9600,
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
  const delay = 10 * 60 * 1000; // every 10 minute
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

      const response = await axios.post(process.env.server_url, form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      console.log(response.data);
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
    console.log("App running on port: 8888");
  });
});

configuration.on("error", (err) => {
  console.error(err.message);
});
