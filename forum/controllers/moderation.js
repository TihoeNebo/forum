const visiters = require("./visiters.js");
let bannedUsers = [];
const connection = require("../database/createConnection.js");
const emitter = require("./commonEmitters.js");

console.log("Модуль moderation.js подключен");

exports.bannedUsers = bannedUsers;

exports.banUser = function (req, res) {
  if (visiters.get(req.cookies['tempId']).access < 3) return;
console.log(req.body);

  if (req.body.userId) {

    let date = new Date(req.body.period);
    let banPeriod = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`; 
    connection.query(`update userProfiles set banned ='${banPeriod}' where userId = ${req.body.userId}`) 
      .catch( err => {console.log(err);});  
    bannedUsers.push({banned: date, userId: +req.body.userId});
    for (let visiter of visiters.values() ) {
      if (!visiter.userId || +visiter.userId != +req.body.userId ) continue;
      visiter.profile.banned = date;
      visiter.access = 1;
      emitter.emit("forOne", {
        event: 'ban', 
        userId: req.body.userId,
        params: {
          period: req.body.period, 
          userId: req.body.userId
        }
      });
      break;
    }
  }
  return res.send();
};

exports.reabilitate = function (req, res) {
  if (!bannedUsers.length) return res.sendStatus(403);

  if (req.query.userId && visiters.get(req.cookies['tempId']).access > 2) {
console.log('ll')
    let user = bannedUsers.find(item => +item.userId == +req.query.userId);
    user.banned = new Date(0);
  }

  let now = new Date();
  let sorted = [];
  bannedUsers.forEach( (user) => {

    if (user.banned <= now) {

      connection.query(`update userProfiles set banned = null where userId = ${user.userId}`)
        .catch( err => {console.log(err);});
     for (let visiter of visiters.values() ) {
       if (+visiter.userId != +user.userId) continue;

       visiter.profile.banned = null;
       visiter.access = 2;
       emitter.emit( "forOne", {
         event: "disban",
         userId: visiter.userId,
         params: {}
       });
     }
   } else sorted.push(user);
  });
  bannedUsers = sorted;
  return res.sendStatus(200);
};

exports.moderate = function (req, res) {
  if (!req.query.userId || visiters.get(req.cookies['tempId']).access != 4) return res.sendStatus(403);
  let access = (+req.query.rights) ? 2 : 3;
  connection.query(`update users set access = ${access} where userId = ${req.query.userId}`)
    .catch( err => {console.log(err);});
  for(let visiter of visiters.values()){
    if (visiter.userId == req.query.userId) {
      visiter.access = access;
      break;
    }
  }
  return res.sendStatus(200);
};
 
exports.deleteUser = async function (req, res) {
  if (visiters.get(req.cookies['tempId']).userId != req.query.userId && visiters.get(req.cookies['tempId']).access != 4) return res.sendStatus(504);
console.log(req.query.userId);
  await connection.query(`delete from users where userId = ${req.query.userId}`)
    .catch( err => {console.log(err);});
  await connection.query(`update userProfiles set birthday = null, lastComing = null, banned = null, subscribes = null where userId = ${req.query.userId} `)
    .catch( err => {console.log(err);});

  let [deletedInbox] = await connection.query(`select userId from inbox_${req.query.userId}`)
    .catch( err => {console.log(err);});
  connection.query(`drop table inbox_${req.query.userId}`).catch( err => {console.log(err);});

  if (deletedInbox.length) {
    deletedInbox.forEach( async (user) => {
      let [contacts] = await connection.query(`select userId, ignored from inbox_${user.userId} where userId = ${req.query.userId}`)
        .catch( err => {console.log(err);});
      if (contacts.length && !contacts[0].ignored) return;
      if (contacts.length && contacts[0].ignored) connection.query(`delete from inbox_${user.userId} where userId = ${req.query.userId}`).catch( err => {console.log(err);});
      let user1= Math.min(+req.query.userId, +user.userId);
      let user2= Math.max(+req.query.userId, +user.userId);
      connection.query(`drop table session_${user1}_${user2}_`).catch( err => {console.log(err);});
    });
  }
  for (let key of visiters.keys() ) {
    if (+visiters.get(key).userId != +req.query.userId) continue;
    visiters.delete(key);
    emitter.emit( "forAll", {
      event: "logout", 
      params: {
        userId: visiters.get(req.cookies['tempId']).userId,
        lastComing: null
      }
    });
  }
  return res.sendStatus(200);
};  