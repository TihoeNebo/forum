const connection = require("../database/createConnection.js");
const express = require("express");
const visiters = require("./visiters.js");
const router = express.Router();
const pars = require("body-parser");
const jpars = pars.json();

console.log( "Подключен модуль forumPUT.js");

router.put("/:forumURN/updatePost", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(403);

  let sqlUpdatePost = 'update ' + req.params.forumURN + '_posts set content = "' +
    req.body.content + '" where postId = ' + req.body.postId;

  if (visiters.get(req.cookies['tempId']).access == 2) sqlUpdatePost = sqlUpdatePost + ' and userId = ' + visiters.get(req.cookies['tempId']).userId;

  await connection.query(sqlUpdatePost)
    .catch( (err) => {
                                   console.log(err);
                                   return res.sendStatus(403);
                                  });
  if (req.body.topicId) {
    res.redirect('/' + req.params.forumURN + '/updateTopic');
  }
  return res.json(req.body.content);
});

router.put("/:forumURN/updateTopic", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(403);

  let sqlUpdateTopic = "update " + req.params.forumURN + "_topics set theme = '" +
    req.body.theme + "', comment = '" + req.body.comment + "' where topicId = " + req.body.topicId;

  if (visiters.get(req.cookies['tempId']).access == 2) sqlUpdateTopic = sqlUpdateTopic + ' and userId = ' + visiters.get(req.cookies['tempId']).userId;

  await connection.query(sqlUpdateTopic)
    .catch( (err) => {
                                   console.log(err);
                                   return res.sendStatus(403);
                                  });
  return res.json(req.body);
});

router.put("/:forumURN/changeForum", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 3) return res.sendStatus(403);

  if (req.query.topicId && req.query.chosenURN) {
    let [topicNewId] =  await connection.query(`insert into ${req.query.chosenURN}_topics (theme, comment, userId, views, closed) 
      select ${req.params.forumURN}_topics.theme, ${req.params.forumURN}_topics.comment, ${req.params.forumURN}_topics.userId, ${req.params.forumURN}_topics.views, ${req.params.forumURN}_topics.closed from ${req.params.forumURN}_topics 
      where ${req.params.forumURN}_topics.topicId = ${+req.query.topicId} and ${req.params.forumURN}_topics.essential = 0`)
      .catch( (err) => {
                                   console.log(err);
                                   return res.sendStatus(403);
                                  });
    topicNewId = topicNewId.insertId;

    console.log(topicNewId);
    await connection.query(`insert into ${req.query.chosenURN}_posts (topicId, userId, content, postDate, essential) 
     select  abs(${topicNewId}) as topicId, ${req.params.forumURN}_posts.userId, ${req.params.forumURN}_posts.content, ${req.params.forumURN}_posts.postDate, ${req.params.forumURN}_posts.essential from ${req.params.forumURN}_posts 
     where ${req.params.forumURN}_posts.topicId = ${+req.query.topicId}`)
      .catch( (err) => {
                                   console.log(err);
                                   return res.sendStatus(403);
                                  });
    
    return res.sendStatus(200);
  } else {
    let message = '';
    await getForumNames();
    forumArr.forEach( (key) => {
      let selected = (req.params.forumURN == key.forumURN) ? " selected>" : " >"; 
      message = message + "<option value = '" + key.forumURN + "'" + selected + key.forumName + "</option>";
    });
    return res.json(message);
  }
});

router.put("/:forumURN/:topicId", async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 3) return res.sendStatus(403);

  await connection.query(`update ${req.params.forumURN}_topics set closed = ${+req.query.close} where topicId = ${req.params.topicId}`)
    .catch( (err) => {console.log(err);});
  return res.sendStatus(200);
});

router.put("/updatePart", jpars, function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 4) return res.sendStatus(403);

  let sqlUpdatePart = "update parts set partName = '" + req.body.partName + "' where partId = " + req.body.partId;

  return connection.query(sqlUpdatePart, (err, result) => {
    console.log(err);
    return res.json(req.body);
  });
});

router.put("/updateForum", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 4) return res.sendStatus(403);

  let newURN = req.body.newURN || '';
  let sqlNewURN = (req.body.newURN != false) ? `', forumURN = '${req.body.newURN}'` : `'`;
  let sqlUpdateForum = "update forums set forumName = '" + req.body.forumName + sqlNewURN + " where forumId = " + req.body.forumId;
  let sqlRenamePosts = "rename table "+ req.body.oldURN + "_posts to " + newURN + "_posts";
  let sqlRenameTopics = "rename table "+ req.body.oldURN + "_topics to " + newURN + "_topics";
  if (req.body.newURN != false) {
    connection.query( sqlRenamePosts).catch( (err) => {console.log(err);});
    connection.query( sqlRenameTopics).catch( (err) => {console.log(err);});
  };
  await connection.query(sqlUpdateForum).catch( (err) => {console.log(err);});
  return res.json(req.body);
});

module.exports = router;

//====================================================================

async function getForumNames () {
  [forumArr] = await connection.query(`select forumName, forumURN from forums`) 
    .catch( err => {console.log(err);});
}