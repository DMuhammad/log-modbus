const modbus = require('jsmodbus')
const { SerialPort } = require('serialport')
require('dotenv').config()

const configuration = new SerialPort({
    path: process.env.serial_port,
    baudrate: 9600,
    parity: "even",
    stopBits: 1,
    dataBits: 8,
})
const client = new modbus.client.RTU(configuration, 1)

configuration.on("open", async () => {
    console.log("serial port opened");

    client.writeSingleRegister(1000, 123).then(function (resp) {
        console.log(resp)
        configuration.close()
    }).fail(function (err) {
        console.log(err)
        configuration.close()
    })
})

configuration.on('error', (err) => {
    console.log(err);
})