const mailer = require("nodemailer");
const trans = mailer.createTransport({
  service: 'gmail',
  auth: {user: 'tihoe.nebo@gmail.com', pass: 'idinahuy3raza!!'}
});

console.log("Модуль connectMailServer.js подключен");

module.exports = trans;