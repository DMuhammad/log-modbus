const axios = require("axios");
const delay = require("delay");
const FormData = require("form-data");
const modbus = require("jsmodbus");
const { SerialPort } = require("serialport");
require("dotenv").config();

const configuration = new SerialPort({
  path: "COM3",
  baudRate: 9600,
  parity: "even",
  stopBits: 1,
  dataBits: 8,
});
const client = new modbus.client.RTU(configuration, 1, 2000);

const scheduleNextExecution = (callback) => {
  const delay = 30 * 60 * 1000;
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
  configuration.on("open", async () => {
    console.log("Serial port opened");
    await fetchData();
  });
};

main().catch((error) => {
  console.log(error);
});
