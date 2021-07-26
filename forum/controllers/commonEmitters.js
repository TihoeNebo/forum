const connection = require("../database/createConnection.js");
const visiters = require("./visiters.js");
const sendMail = require("./sendMail.js");
const Emitter = require("events");
const emitter = new Emitter();

module.exports = emitter;

console.log( "Подключен модуль commonEmitters.js");

//==============CommonEmitters===================

emitter.on( "offlinePM", (data) => {
  connection.query(`select mail from users where userId = ${data.to}`)
  .then( ([user])=>{
    sendMail.sendNotifyLetter(user[0].mail, data)
  })
});

emitter.on('forAll', (data) => {
  for (let visiter of visiters.values() ) {
    visiter.emit(data.event, data.params);
  }
});
emitter.on('forOne', (data) => {
  for (let visiter of visiters.values() ) {
    if (visiter.userId == data.userId) visiter.emit(data.event, data.params);
  }  
});