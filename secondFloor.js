require("dotenv").config();
const {
  serialConfiguration,
  delay,
  log,
  readFileFromJson,
  delayWithCallback,
} = require("./utils");
const getFillingData = require("./src/fillingMJL");
const getMetalData = require("./src/metalDetector");
const getCartonData = require("./src/cartonErectorMJL");
const getPrinterData = require("./src/printerTarami");

const {
  devices,
  general: { serial_port },
} = readFileFromJson("data/secondFloor.json");
const server_url = process.env.server_url;
const configuration = serialConfiguration(serial_port);

configuration.setMaxListeners(0);
configuration.on("open", async () => {
  log("green", `Serial port opened successfully`);

  while (true) {
    try {
      for (let i = 0; i < devices.length; i++) {
        log(
          "blue",
          `Reading data from ${devices[i].device} ${devices[i].area} with address: ${devices[i].address}`
        );
        try {
          if (devices[i].device.includes("printer")) {
            await getPrinterData(server_url, devices[i], configuration);
          }
          if (devices[i].device.includes("metal detector")) {
            await getMetalData(server_url, devices[i], configuration);
          }
          if (devices[i].device.includes("carton erector")) {
            await getCartonData(server_url, devices[i], configuration);
          }
          if (devices[i].device.includes("GF")) {
            await getFillingData(server_url, devices[i], configuration);
          }
        } catch (error) {
          log(
            "red",
            `Failed to read data from ${devices[i].device} ${devices[i].area}: ${error.message}`
          );
        }
        await delay(5000);
      }
      log("yellow", `Completed one cycle, waiting for next execution`);
      await delay(15 * 60 * 1000); //run every 15minutes
    } catch (error) {
      log("error", `Error in main cycle: ${error.message}`);
      await delay(60000);
    }
  }
});

configuration.on("error", (err) => {
  log("red", `Serial port error: ${err.message}`);
  delayWithCallback(() => {
    log("yellow", `Attempting to reconnect...`);
    configuration, open();
  }, 10000);
});
