const mailer = require("nodemailer");
const trans = mailer.createTransport({
  service: 'gmail',
  auth: {user: 'adress@gmail.com', pass: 'password'} //только google
});

console.log("Модуль connectMailServer.js подключен");

module.exports = trans;
