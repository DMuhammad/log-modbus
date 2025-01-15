const express = require("express");
const socket = require("./utils/socket");
const cors = require("cors");
const delay = require("delay");
const { createServer } = require("http");
const moment = require("moment");
const modbus = require("jsmodbus");
const { SerialPort } = require("serialport");
require("dotenv").config();

const app = express();
const server = createServer(app);
const io = socket.init(server);
const configuration = new SerialPort({
  path: "COM3",
  baudRate: 9600,
  parity: "none",
  stopBits: 1,
  dataBits: 8,
});
moment.locale("id");

// Inisialisasi variabel untuk menyimpan data terbaru
let latestData = {
  time: null,
  workshop: null,
  kompressor: null,
};

async function readModbusData(slaveId, area) {
  try {
    const client = new modbus.client.RTU(configuration, slaveId);
    let registerV1;
    let registerV2;
    let registerV3;
    let registerA1;
    let registerA2;
    let registerA3;
    let registerKwh;
    const numberOfRegisters = 2; // Jumlah register yang dibaca per data (Biasanya 2 untuk float)

    if (
      client.slaveId == 2 ||
      client.slaveId == 3 ||
      client.slaveId == 4 ||
      client.slaveId == 7
    ) {
      registerV1 = 0x0000;
      registerV2 = 0x0010;
      registerV3 = 0x0020;
      registerA1 = 0x0002;
      registerA2 = 0x0012;
      registerA3 = 0x0022;
      registerKwh = 0x005e;
    } else if (
      client.slaveId == 1 ||
      client.slaveId == 5 ||
      client.slaveId == 6 ||
      client.slaveId == 8 ||
      client.slaveId == 9 ||
      client.slaveId == 10
    ) {
      registerV1 = 0x0000;
      registerV2 = 0x000a;
      registerV3 = 0x0014;
      registerA1 = 0x0002;
      registerA2 = 0x000c;
      registerA3 = 0x0016;
      registerKwh = 0x003c;
    }

    let data;
    const dataV1 = await client.readHoldingRegisters(
      registerV1,
      numberOfRegisters
    );
    const dataV2 = await client.readHoldingRegisters(
      registerV2,
      numberOfRegisters
    );
    const dataV3 = await client.readHoldingRegisters(
      registerV3,
      numberOfRegisters
    );
    const dataA1 = await client.readHoldingRegisters(
      registerA1,
      numberOfRegisters
    );
    const dataA2 = await client.readHoldingRegisters(
      registerA2,
      numberOfRegisters
    );
    const dataA3 = await client.readHoldingRegisters(
      registerA3,
      numberOfRegisters
    );
    const dataKwh = await client.readHoldingRegisters(
      registerKwh,
      numberOfRegisters
    );

    data = {
      area: area,
      kwh: dataKwh.response.body.values[1],
      v1: dataV1.response.body.values[1] / 10,
      v2: dataV2.response.body.values[1] / 10,
      v3: dataV3.response.body.values[1] / 10,
      a1: dataA1.response.body.values[1] / 1000,
      a2: dataA2.response.body.values[1] / 1000,
      a3: dataA3.response.body.values[1] / 1000,
    };

    return data;
  } catch (error) {
    console.log(error);
  }
}

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.use(
  cors({
    credentials: true,
    origin: "https://npsfood.com",
  })
);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  // res.render("index");
  res.sendFile(__dirname + "/index.html");
});

// Endpoint untuk mengambil data Modbus
app.get("/api/data", (req, res) => {
  res.json(latestData);
});

server.listen(6969, "0.0.0.0", () => {
  console.log("Server is running on port: 6969");

  setInterval(async () => {
    const db_workshop = await readModbusData(1, "workshop");
    await delay(2000);
    const db_kompressor = await readModbusData(2, "kompressor");
    await delay(2000);
    const db_lvmdb = await readModbusData(3, "lvmdb");
    await delay(2000);
    const db_snack = await readModbusData(4, "snack");
    await delay(2000);
    const db_wtp = await readModbusData(5, "wtp");
    await delay(2000);
    const db_cooling = await readModbusData(6, "cooling");
    await delay(2000);
    const db_lt1 = await readModbusData(7, "lt1");
    await delay(2000);
    const db_packaging = await readModbusData(8, "packaging");
    await delay(2000);
    const db_lampult1 = await readModbusData(9, "lampult1");
    await delay(2000);
    const db_lampu_ruangdingin = await readModbusData(10, "lampuruangdingin");

    io.emit("modbusData", {
      time: moment().format("LTS"),
      workshop: db_workshop,
      kompressor: db_kompressor,
      lvmdb: db_lvmdb,
      snack: db_snack,
      wtp: db_wtp,
      cooling: db_cooling,
      lt1: db_lt1,
      packaging: db_packaging,
      lampult1: db_lampult1,
      lampuruangdingin: db_lampu_ruangdingin,
    });

    console.log(db_workshop);
    console.log(db_kompressor);
  }, 30000);
});
