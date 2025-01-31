const delay = require("delay");
const ModbusRTU = require("modbus-serial");
// const modbus = require("jsmodbus");
const { SerialPort } = require("serialport");
require("dotenv").config();

// console.log(SerialPort.list());

const configuration = new SerialPort({
  path: process.env.PATH,
  baudRate: 9600,
  // parity: "even",
  // stopBits: 1,
  // dataBits: 8,
});
console.log(configuration);

const main = async () => {
  const client = new ModbusRTU();
  // const client = new modbus.client.RTU(configuration, 1, 2000);
  // console.log(client);

  // const numberOfRegisters = 2;
  client.connectRTUBuffered("COM7", { baudRate: 9600 });
  await client.setID(1);

  client.readHoldingRegisters(0, 10, function (err, data) {
    console.log(data.data);
  });

  // const data = await client.readInputRegisters(1000, 1);
  // // const data = await client.readInputRegisters(1001, 10);
  // console.log(data);

  // setTimeout(
  //   () =>
  //     main().catch((error) => {
  //       console.log(error);
  //     }),
  //   1000
  // );
};

main().catch((error) => {
  console.log(error);
});
