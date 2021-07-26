const connection = require("../database/createConnection.js");
const visiters = require("./visiters.js");
const emitter = require("./commonEmitters.js");
const userObserver = require("./userObserver.js");
const User = require("../models/users.js");
const sendMail = require("./sendMail.js");
const crypto = require("crypto");
const moderation = require("./moderation.js");
const bannedUsers = moderation.bannedUsers;
const salt = 'ghio9jf23v959blljiucds7ettrd6srechg47oouiuk8';
const confirmList = sendMail.confirmList;

console.log("Модуль authentification.js подключен");

let p = 0; //number for hash

exports.confirmOnline = function(req, res) {
  if ( visiters.has(req.cookies['tempId']))  visiters.get(req.cookies['tempId']).confirmOnline();
};

exports.checkUser = async function(req, res, next) {

 console.log(req.path);
 console.log('запрос из:');
 console.log(req.headers.referer);
 console.log(bannedUsers);
  if (visiters.size == 0) p = 0;
  if ( !visiters.has(req.cookies['tempId'])) {
    let date = new Date();
    let tempId = crypto.createHash('sha256');
    tempId.update(date + p + salt);
    tempId= tempId.digest('hex');
    p = p +1;
    res.cookie('tempId', tempId) //, {path: '/'});
    visiters.set(tempId, new User(tempId, {}));
    visiters.get(tempId).confirmOnline();
    req.cookies['tempId'] = tempId;
   console.log(req.cookies['tempId']);   
    if (req.cookies['mail']) {
     await userObserver.login(req.cookies['mail'], req.cookies['pass'], req.cookies['tempId']);
    } 
  }
 next();
};

exports.deleteSelected = async function(req, res, next) {
  if (req.method != 'GET') return next();
  let visiter = visiters.get(req.cookies['tempId']);
  if (visiter.access < 2) return next();
  if (visiters.get(req.cookies['tempId']).drop.posts) {
    await deletePosts(visiter.drop.forumURN, visiter.drop.posts, visiter.access, visiter.userId); 
    visiters.get(req.cookies['tempId']).drop = {};
  }
  if (visiter.access < 3) return next();
  if (visiters.get(req.cookies['tempId']).drop.topics) {
    await deleteTopics(visiter.drop.forumURN, visiter.drop.topics); 
    visiters.get(req.cookies['tempId']).drop = {};
  }
  next();
};

exports.register = async function(req, res) {
  let [isUserExist] = await connection.query(`select userId from users where mail = '${req.body.mail}' `)
    .catch( err => {console.log(err);});
  isUserExist = isUserExist.length;

  if (isUserExist) return res.sendStatus(403);
  let userId = 0;
  let hash = crypto.createHash('sha256');
  hash.update(req.body.pass + salt);
  hash = hash.digest('hex');
  await connection.query(`insert into users(pass, mail, access, registered) values('${hash}', '${req.body.mail}',1, now())`)
  .then( ([res])=> {userId = res.insertId;} )
  .catch( err => {console.log(err);});
  await connection.query(`insert into userProfiles(userId, userName, sex, subscribes, birthday) values(${userId}, '${req.body.login}', ${req.body.sex}, '[]', ?)`, [req.body.birthday])
    .catch( err => {console.log(err);});

  connection.query(`create table inbox_${userId} (
    userId mediumint unsigned not null,
    newMessages mediumint unsigned default 1,
    ignored tinyint(1) default 0,
    primary key(userId)) default charset = utf8`).catch( (err) => {console.log(err);});

  sendMail.sendRegLetter(req.body.mail, req.body.login);
  res.send();
};

exports.login = async function(req, res) {
  let isUser = await userObserver.login( req.body.mail, req.body.pass, req.cookies['tempId']);
  if (!isUser) return res.sendStatus(504);
  visiters.get(req.cookies['tempId']).confirmOnline();
  if (+req.body.rememberMe) {
    res.cookie('mail', req.body.mail);
    res.cookie('pass', req.body.pass); 
  }   
 console.log(visiters.get(req.cookies['tempId']).profile.userName);
  return res.sendStatus(200);
};

function sendLetter(req, res) {
  if (visiters.get(req.cookies['tempId']).access == 0 || visiters.get(req.cookies['tempId']).profile.isConfurmed) return;
  connection.query(`update users set mail = "${req.body.mail}" where userId = ${visiters.get(req.cookies['tempId']).userId}`)
    .catch( err => {console.log(err);});
  sendMail.sendRegLetter(req.body.mail, visiters.get(req.cookies['tempId']).profile.userName);
  res.send('');
};
exports.sendLetter = sendLetter;

exports.confirmReg = async function(req, res) {
  let code = req.query.code;
  if ( confirmList.has(code) ) {
    await connection.query(`update users set access=2 where mail = "${confirmList.get(code)}"`);
    let [user] = await connection.query(`select * from users where mail = "${confirmList.get(code)}"`);
    visiters.set(req.cookies['tempId'], new User(user[0].userId, user[0]));
    res.redirect('/logout');
  } else res.send('Извините, похоже, ссылка просрочена.');
};

exports.logout = function(req, res) {

  if (visiters.get(req.cookies['tempId']).access == 0) return res.redirect("/");
console.log(visiters.get(req.cookies['tempId']).notifies);
  let subscribes = JSON.stringify( visiters.get(req.cookies['tempId']).subscribes );
  let date = new Date();
  date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  connection.query(`update userProfiles set lastComing = '${date}', subscribes = '${subscribes}' where userId = ${visiters.get(req.cookies['tempId']).userId}`)
    .catch( err => {console.log(err);});
  userObserver.updateInbox (visiters.get(req.cookies['tempId']).inbox, visiters.get(req.cookies['tempId']).userId);
  clearTimeout( visiters.get(req.cookies['tempId']).timer );
  emitter.emit( "forAll", {
    event: "logout", 
    params: {
      userId: visiters.get(req.cookies['tempId']).userId,
      lastComing: date
    }
  });
  visiters.delete(req.cookies['tempId']);
  res.cookie('mail', '');
  res.cookie('pass', '');
  res.redirect('/');
};
