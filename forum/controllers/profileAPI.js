const express = require("express");
const pars = require("body-parser");
const visiters = require("./visiters.js");
const connection = require("../database/createConnection.js");
const EntriesData = require("../models/entries.js");
const userObserver = require("./userObserver.js");

const router = express.Router();
const jpars = pars.json();
const title = ' форумы "Тихое Небо" ';

console.log( "Подключен модуль profileAPI.js");

router.delete("/delSubscribes", (req, res) => {
console.log("fdsfdssf" + req.path);

  let i = visiters.get(req.cookies['tempId']).subscribes.findIndex(item =>
    +item.topicId == +req.query.topicId && item.forumURN == req.query.forum);
 console.log(i);
  visiters.get(req.cookies['tempId']).subscribes.splice(i, 1);
 console.log(visiters.get(req.cookies['tempId']).subscribes);
  res.sendStatus(200);
  
});


router.get("/", function (req, res) {
  if (!visiters.get(req.cookies['tempId']).access) return res.redirect('/');
  res.render('me', {
                                  title: "Настройки аккаунта -" + title,
                                  mail: visiters.get(req.cookies['tempId']).mail,
                                  referer: req.headers.referer,
                                  __proto__: new EntriesData(req)
  });
});

router.get("/getSubscribes", jpars, (req, res) => {
  if (!visiters.get(req.cookies['tempId']).access) return;
  res.json(visiters.get(req.cookies['tempId']).subscribes);
});

router.get("/getIgnored", jpars, (req, res) => {
  let ignoreList = [];
  visiters.get(req.cookies['tempId']).inbox.forEach( (user) => {
    if (user.ignored) ignoreList.push(user);
  });
  res.send(ignoreList);
});


router.put("/forgive", (req, res) => {
  let userId = +req.query.userId;
  let ignoredUser = visiters.get(req.cookies['tempId']).inbox.find( item => +item.userId == userId);
  ignoredUser.ignored = 0;
  return res.sendStatus(200);
});

router.put("/changePass", jpars, async function(req, res) {
  let userId = visiters.get(req.cookies['tempId']).userId;
  let oldPass = userObserver.hashPass(req.body.oldPass);
  let myPass = visiters.get(req.cookies['tempId']).pass;
  if (oldPass != myPass) return res.sendStatus(504);
  let newPass = hashPass(req.body.newPass);
  connection.query(`update users set pass = '${newPass}' where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })
   .catch( (err) => {return res.sendStatus(403);});
});

router.put("/changeMail", jpars, function(req, res) {
  let userId =visiters.get(req.cookies['tempId']).userId;
  let newMail = req.body.newMail;
  connection.query(`update users set mail = '${newMail}' where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(403); });
});

router.put("/changeName", function(req, res) {
  let userId =visiters.get(req.cookies['tempId']).userId;
  let newName = req.query.newName;
  visiters.get(req.cookies['tempId']).profile.userName = newName;
  connection.query(`update userProfiles set userName = '${newName}' where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(403); });
});

router.put("/changeSex", function(req, res) {
  let userId =visiters.get(req.cookies['tempId']).userId;
  let newSex = +req.query.newSex;
  visiters.get(req.cookies['tempId']).profile.sex = newSex;
  connection.query(`update userProfiles set sex = ${newSex} where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(403); });
});

router.put("/changeBirth", function(req, res) {
  let userId =visiters.get(req.cookies['tempId']).userId;
  let newBirth = req.query.newBirth;
  console.log(newBirth);
  visiters.get(req.cookies['tempId']).profile.birthday = new Date(newBirth);
  connection.query(`update userProfiles set birthday = ${newBirth} where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(403); });
});

router.put("/changeSubMode", function(req, res) {
  let mode = +req.query.mode;
  let userId = visiters.get(req.cookies['tempId']).userId;
  visiters.get(req.cookies['tempId']).profile.subMode = mode;
  connection.query(`update userProfiles set subMode = ${mode} where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(403); });    
});

module.exports = router;