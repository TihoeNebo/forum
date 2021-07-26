const connection = require("../database/createConnection.js");
const express = require("express");
const visiters = require("./visiters.js");
const router = express.Router();
const pars = require("body-parser");
const jpars = pars.json();

console.log( "Подключен модуль forumDELETE.js");

router.delete("/deleteForum", jpars, async function (req, res) {                   

  if (visiters.get(req.cookies['tempId']).access < 4) return res.sendStatus(403);

  console.log(req.body.forumURN);
  let isDeletable = false;

  let sqlDropPosts = `drop table ${req.params.forumURN}_posts`;
  let sqlDropTopics = `drop table ${req.params.forumURN}_topics`;
  let sqlDeleteForum = `delete from forums where forumURN = '${req.body.forumURN}'`;
  let sqlForumsPart = `select forumId from forums where partId = (select partId from forums where forumURN = '${req.body.forumURN}')`;
  let sqlDeletePart = `delete from parts where partId = (select partId from forums where forumURN = '${req.body.forumURN}')`;

  await connection.query(sqlForumsPart)
    .then( ([ids]) => { if (ids.length == 1) return isDeletable = true;})
    .catch((err)=>{console.log(err);});
  if (isDeletable) {
    await connection.query(sqlDeletePart).catch((err)=>{console.log(err);});
  };

  await connection.query(sqlDropPosts).catch((err)=>{console.log(err);});
  await connection.query(sqlDropTopics).catch((err)=>{console.log(err);});
  await connection.query(sqlDeleteForum).catch((err)=>{console.log(err);});
  return res.sendStatus(200);
});  

router.delete("/:forumURN/deletePosts", jpars, async function (req, res) {
  console.log(req.body.id);
  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(403);
  if(!visiters.get(req.cookies['tempId']).drop.posts) {
    visiters.get(req.cookies['tempId']).drop.forumURN =  req.params.forumURN;
    visiters.get(req.cookies['tempId']).drop.posts = [req.body.id];
  } else {
    let post = visiters.get(req.cookies['tempId']).drop.posts.indexOf(req.body.id, 0);
    if ( post+1 ) visiters.get(req.cookies['tempId']).drop.posts.splice(post, 1);
    else visiters.get(req.cookies['tempId']).drop.posts.push(req.body.id);
  }

  return res.sendStatus(200);
});

router.delete("/:forumURN/deleteTopics", jpars, async function (req, res) {

  if (visiters.get(req.cookies['tempId']).access < 3) return res.sendStatus(403);
  if(!visiters.get(req.cookies['tempId']).drop.topics) {
    visiters.get(req.cookies['tempId']).drop.forumURN =  req.params.forumURN;
    visiters.get(req.cookies['tempId']).drop.topics = [req.body.id];
  } else {
    let topic = visiters.get(req.cookies['tempId']).drop.topics.indexOf(req.body.id, 0);
    if ( topic + 1 ) visiters.get(req.cookies['tempId']).drop.topics.splice(topic, 1);
    else visiters.get(req.cookies['tempId']).drop.topics.push(req.body.id);
  }

  return res.sendStatus(200);
});

module.exports = router;