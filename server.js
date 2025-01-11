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

    if (client.slaveId == 2 || client.slaveId == 6) {
      registerV1 = 0x0000;
      registerV2 = 0x0010;
      registerV3 = 0x0020;
      registerA1 = 0x0002;
      registerA2 = 0x0012;
      registerA3 = 0x0022;
      registerKwh = 0x005e;
    } else if (client.slaveId == 1) {
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
      v1: dataV1.response.body.values[1],
      v2: dataV2.response.body.values[1],
      v3: dataV3.response.body.values[1],
      a1: dataA1.response.body.values[1] / 1000,
      a2: dataA2.response.body.values[1] / 1000,
      a3: dataA3.response.body.values[1] / 1000,
    };

    return data;
  } catch (error) {
    console.log(error);
  }
}

// function readModbusData() {
//   let datas = [
//     {
//       area: "Workshop",
//       data: {
//         v1: "",
//         v2: "",
//         v3: "",
//         a1: "",
//         a2: "",
//         a3: "",
//         kwh: "",
//       },
//     },
//     {
//       area: "Kompressor",
//       data: {
//         v1: "",
//         v2: "",
//         v3: "",
//         a1: "",
//         a2: "",
//         a3: "",
//         kwh: "",
//       },
//     },
//   ];
//   let registerV1;
//   let registerV2;
//   let registerV3;
//   let registerA1;
//   let registerA2;
//   let registerA3;
//   let registerKwh;
//   const numberOfRegisters = 2; // Jumlah register yang dibaca per data (Biasanya 2 untuk float)

//   if (client.slaveId == 2 || client.slaveId == 6) {
//     registerV1 = 0x0000;
//     registerV2 = 0x0010;
//     registerV3 = 0x0020;
//     registerA1 = 0x0002;
//     registerA2 = 0x0012;
//     registerA3 = 0x0022;
//     registerKwh = 0x005e;
//   } else if (client.slaveId == 1) {
//     registerV1 = 0x0000;
//     registerV2 = 0x000a;
//     registerV3 = 0x0014;
//     registerA1 = 0x0002;
//     registerA2 = 0x000c;
//     registerA3 = 0x0016;
//     registerKwh = 0x003c;
//   }

//   let data;

//   Promise.all([
//     client.readHoldingRegisters(registerV1, numberOfRegisters),
//     client.readHoldingRegisters(registerV2, numberOfRegisters),
//     client.readHoldingRegisters(registerV3, numberOfRegisters),
//     client.readHoldingRegisters(registerA1, numberOfRegisters),
//     client.readHoldingRegisters(registerA2, numberOfRegisters),
//     client.readHoldingRegisters(registerA3, numberOfRegisters),
//     client.readHoldingRegisters(registerKwh, numberOfRegisters),
//   ])
//     .then((values) => {
//       const [dataV1, dataV2, dataV3, dataA1, dataA2, dataA3, dataKwh] = values;

//       data = {
//         kwh: dataKwh.response.body.values[1],
//         v1: dataV1.response.body.values[1],
//         v2: dataV2.response.body.values[1],
//         v3: dataV3.response.body.values[1],
//         a1: dataA1.response.body.values[1] / 1000,
//         a2: dataA2.response.body.values[1] / 1000,
//         a3: dataA3.response.body.values[1] / 1000,
//       }

//       // Kirim data ke klien melalui Socket.IO
//       io.emit("modbusData", {
//         time: moment().format("LTS"),
//         kwh: dataKwh.response.body.values[1],
//         v1: dataV1.response.body.values[1],
//         v2: dataV2.response.body.values[1],
//         v3: dataV3.response.body.values[1],
//         a1: dataA1.response.body.values[1] / 1000,
//         a2: dataA2.response.body.values[1] / 1000,
//         a3: dataA3.response.body.values[1] / 1000,
//       });

//       console.log("Data Modbus:");
//       console.log("V1:", dataV1.response.body.values[1]);
//       console.log("V2:", dataV2.response.body.values[1]);
//       console.log("V3:", dataV3.response.body.values[1]);
//       console.log("A1:", dataA1.response.body.values[1] / 1000);
//       console.log("A2:", dataA2.response.body.values[1] / 1000);
//       console.log("A3:", dataA3.response.body.values[1] / 1000);
//       console.log("kWh:", dataKwh.response.body.values[1]);
//     })
//     .catch((err) => {
//       console.error("Error:", err);
//     });
// }

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

server.listen(8000, () => {
  console.log("Server is running on port: 8000");

  setInterval(async () => {
    const db_workshop = await readModbusData(1, "workshop");
    await delay(2000);
    const db_kompressor = await readModbusData(2, "kompressor");
    // const db_kompressor = await readModbusData(2);

    io.emit("modbusData", {
      time: moment().format("LTS"),
      workshop: db_workshop,
      kompressor: db_kompressor,
    });

    console.log(db_workshop);
    console.log(db_kompressor);
  }, 3000);
});
