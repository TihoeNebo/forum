const connection = require("../database/createConnection.js");
const express = require("express");
const visiters = require("./visiters.js");
const emitter = require("./commonEmitters.js");
const router = express.Router();
const pars = require("body-parser");
const jpars = pars.json();
const sqldroptable='DROP TABLE IF EXISTS forumlist';

console.log( "Подключен модуль forumPOST.js");

router.post("/createForum", jpars, async function (req, res) {
  
  if (visiters.get(req.cookies['tempId']).access < 4) return res.sendStatus(403);

  let forumData = req.body.forumData;
  console.log(forumData);
  let topicName = req.body.topicName;
  let topicComment = req.body.topicComment;
  let firstPost = req.body.firstPost;
  
  console.log(topicName, topicComment, firstPost);

  let sqlNewTopic = `insert into ${forumData.forumURN}_topics(theme, comment, userId, essential) values( '${topicName}', '${topicComment}', ${visiters.get(req.cookies['tempId']).userId}, 1)`;
  let sqlNewPost = `insert into ${forumData.forumURN}_posts(topicId, content, userId, postDate, essential) values( 1, '${firstPost}', ${visiters.get(req.cookies['tempId']).userId}, NOW(), 1)`; 
 
   if (req.body.isNewPart) {

    await connection.query('insert into parts(partName) values(?)', forumData.partName).catch( (err) => {console.log(err);});
  }; 

  let [part] = await connection.query('select partId from parts where partName = ? ', forumData.partName)
    .catch( (err) => {console.log(err);});

  await connection.query(`insert into forums(partId, forumURN, forumName) values( ${part[0].partId}, '${forumData.forumURN}', '${forumData.forumName}')`).catch( (err) => {console.log(err);});
  let [forum] = await connection.query('select forumId from forums where forumURN = ?', forumData.forumURN)
    .catch( (err) => {console.log(err);});

  await createTables(forumData.forumURN, forum[0].forumId);

  connection.query(sqldroptable).catch( (err) => {console.log(err);});
  return res.json(req.body);
  
  async function createTables(name, id) {
    let sqlcreatetopics = `create table if not exists ${name}_topics 
      (topicId smallint unsigned auto_increment primary key, 
      forumId tinyint unsigned not null default ${id}, 
      theme varchar(70) not null, 
      comment varchar(70), 
      userId mediumint unsigned not null, 
      views int unsigned default 0, 
      essential tinyint(1) default 0, 
      closed tinyint(1) default 0, 
      foreign key (forumId) references forums (forumId) on delete cascade) default charset = utf8`;

    let sqlcreateposts = `create table if not exists ${name}_posts 
      (postId mediumint unsigned auto_increment primary key, 
      topicId smallint unsigned not null, 
      userId mediumint unsigned not null, 
      content mediumtext not null, 
      postDate datetime not null, 
      essential tinyint(1) default 0, 
      foreign key (topicId) references ${name}_topics (topicId) on delete cascade) default charset = utf8`;
    
    await connection.query(sqlcreatetopics).catch( (err) => {console.log(err);});
    await connection.query(sqlcreateposts).catch( (err) => {console.log(err);});
    await connection.query(sqlNewTopic).catch( (err) => {console.log(err);});
    await connection.query(sqlNewPost).catch( (err) => {console.log(err);});
  }
});

router.post("/sendPM", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 1) return res.sendStatus(403); 

  if (req.query.ignore) {
    visiters.get(req.cookies['tempId']).inbox.forEach( (key) => {
      if(key.userId == req.query.ignore) key.ignored = 1;
    });
    connection.query(`update inbox_${visiters.get(req.cookies['tempId']).userId} set ignored = 1 where userId = ${req.query.ignore}`)
      .catch( (err) => {console.log(err);});
    return res.send();
  }

  let [to] = await connection.query(`select userId, ignored from inbox_${req.body.to}
    where userId = ${visiters.get(req.cookies['tempId']).userId}`)
    .catch( (err) => {console.log(err);});
  console.log(to);
  if (to.length && +to[0].ignored) return  res.sendStatus(403); 
        console.log(visiters);
  let isOnline = false;
  let recipientId = '';
  for (let key of visiters.keys()) {

    if (+visiters.get(key).userId == +req.body.to) {
      isOnline = true;
      recipientId = key;
    }
  }
  if (isOnline) {
    let isSender = false;
    visiters.get(recipientId).inbox.forEach( (key) => {

      if (key.userId == visiters.get(req.cookies['tempId']).userId) {
        isSender = true;

        if (!key.ignored) {
          ++key.newMessages;
          emitter.emit("forOne", {
            event: "newPM", 
            userId: req.body.to,
            params: {
              to: req.body.to,
              fromId: visiters.get(req.cookies['tempId']).userId,
              fromName: visiters.get(req.cookies['tempId']).profile.userName
            }  
          });
        }
      }
    });
    if (!isSender) {
      let author = {
                               userId: visiters.get(req.cookies['tempId']).userId, 
                               newMessages: 1, 
                               ignored: 0,
                               userName: visiters.get(req.cookies['tempId']).profile.userName, 
                             };
      if (!visiters.get(recipientId).inbox.length) visiters.get(recipientId).inbox[0] = author;
      else visiters.get(recipientId).inbox.unshift(author);
    console.log(visiters.get(recipientId).inbox)
      emitter.emit("forOne", {
        event: "newPM",
        userId: req.body.to,
        params: {
          to: req.body.to,
          fromId: visiters.get(req.cookies['tempId']).userId,
          fromName: visiters.get(req.cookies['tempId']).profile.userName
        }
      });
    }
  } else {
    let sqlInputInbox = (to.length && to[0].userId) ? `update inbox_${req.body.to} set newMessages = newMessages +1 where userId = ${to[0].userId}` :
                                                                   `insert into inbox_${req.body.to}(userId) values(${visiters.get(req.cookies['tempId']).userId})`;
    connection.query(sqlInputInbox).catch( (err) => {console.log(err);});
    emitter.emit("offlinePM", {
                                                    to: req.body.to,
                                                    toName: req.body.toName,
                                                    fromId: visiters.get(req.cookies['tempId']).userId,
                                                    fromName: visiters.get(req.cookies['tempId']).profile.userName,
                                                    fromSex: visiters.get(req.cookies['tempId']).profile.sex
                                                   });
  };

  if ( !visiters.get( req.cookies['tempId']).inbox.find( item => +item.userId == +req.body.to ) ) {
    visiters.get( req.cookies['tempId']).inbox.push({userId: req.body.to, newMessages: 0, ignored: 0, userName: req.body.toName, lastComing: req.body.toStatus});
  }

  let user1 = Math.min(visiters.get(req.cookies['tempId']).userId, req.body.to);
  let user2 = Math.max(visiters.get(req.cookies['tempId']).userId, req.body.to);

  await connection.query(`create table if not exists session_${user1}_${user2}_ (
    pmId mediumint unsigned not null auto_increment,
    userId mediumint unsigned not null,
    content mediumtext, 
    isNew tinyint default 1,
    postDate datetime not null,
    primary key(pmId)) default charset = utf8`).catch( (err) => {console.log(err);});

  await connection.query(`insert into session_${user1}_${user2}_ (userId, content, postDate) values(${visiters.get(req.cookies['tempId']).userId}, '${req.body.pm}', NOW())`)
    .catch( (err) => {console.log(err);
                                    return res.sendStatus(504); });

  res.send();
});

router.post("/getSession", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 1) return res.sendStatus(403);

  let user1 = Math.min(visiters.get(req.cookies['tempId']).userId, req.query.id);
  let user2 = Math.max(visiters.get(req.cookies['tempId']).userId, req.query.id);

  if (req.query.readed) {
    let message = {};
    let session= visiters.get(req.cookies['tempId']).inbox.find( item => item.userId == req.query.id);
    --session.newMessages;  
    connection.query(`update session_${user1}_${user2}_ set isNew = 0 where pmId = ${req.query.readed}`).catch( (err) => {console.log(err);});
    for (let value of visiters.values()) {
      if (value.userId == req.query.id) {
        message = {
                              to: value.userId, 
                              fromId: visiters.get(req.cookies['tempId']).userId, 
                              pmId: req.query.readed
                            }
        emitter.emit( "forOne", {
          event: "readedPM",
          userId: value.userId, 
          params: message
        });
      }
    }
    return;
  }

  let [message] = await connection.query(`select session_${user1}_${user2}_.*, userProfiles.userName from session_${user1}_${user2}_ join userProfiles on session_${user1}_${user2}_.userId = userProfiles.userId order by pmId`)
    .catch( (err) => {console.log(err);
                                    return res.sendStatus(403); });
  return res.json(message);
});

router.post("/subscribe", jpars, async function(req, res) {
  let sub = {
                     forumURN: req.body.forumURN, 
                     topicId: req.body.topicId, 
                     theme: req.body.theme,
                     comment: req.body.comment,
                     lastComing: new Date()
                   };
  let index = visiters.get(req.cookies['tempId']).subscribes.findIndex( item => item.forumURN== sub.forumURN && item.topicId == sub.topicId ) 
  if (!(index + 1)) visiters.get(req.cookies['tempId']).subscribes.push(sub);
  else visiters.get(req.cookies['tempId']).subscribes.splice(index, 1);
  res.sendStatus(200);
});

router.post("/:forumURN/createTopic", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(403);

  connection.query(sqldroptable).catch( (err) => {console.log(err);});
  let [topicId] = await connection.query(`INSERT INTO ${req.params.forumURN}_topics(theme, comment, userId) VALUES('${req.body.topic.theme}', '${req.body.topic.comment}', ${visiters.get(req.cookies['tempId']).userId})`)
    .catch( (err) => {console.log(err);});
  topicId = topicId.insertId;
  await connection.query(`INSERT INTO ${req.params.forumURN}_posts(content, userId, topicId, postDate, essential) VALUES(?, ?, ?, NOW(), 1)`, [req.body.firstPost, visiters.get(req.cookies['tempId']).userId, topicId])
    .catch( (err) => {console.log(err);});
  if (+visiters.get(req.cookies['tempId']).profile.subMode & 2) {
    let sub = {
                     forumURN: req.params.forumId, 
                     topicId: topicId, 
                     theme: req.body.topic.theme,
                     comment: req.body.topic.comment,
                     lastComing: new Date()
                      };
    notify(req, sub);
  }

  return res.send();
});


router.post("/:forumId/createPost", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(403);

  connection.query(sqldroptable).catch( (err) => {console.log(err);});
  if (+visiters.get(req.cookies['tempId']).profile.subMode & 1) {
    let sub = {
                     forumURN: req.params.forumId, 
                     topicId: req.body.topicId, 
                     theme: req.body.theme,
                     comment: req.body.comment,
                     lastComing: new Date()
                     };
 
   notify(req, sub);
  }

  emitter.emit("forAll", {
    event: "newPost",
    params: {
      userId: visiters.get(req.cookies['tempId']).userId,
      forumURN: req.params.forumId, 
      topicId: req.body.topicId, 
      theme: req.body.theme
    }
  });

  await connection.query(`INSERT INTO ${req.params.forumId}_posts(content, topicId, userId, postDate) VALUES('${req.body.mess}', ${req.body.topicId}, ${visiters.get(req.cookies['tempId']).userId}, NOW())`)
    .catch( (err) => {console.log(err);});

  return res.send(); 
});

module.exports = router;

function notify(req, sub) {  
  if ( !visiters.get(req.cookies['tempId']).subscribes.find( item => item.forumURN== sub.forumURN && item.topicId == sub.topicId ) ) {
    visiters.get(req.cookies['tempId']).subscribes.push(sub);
  }
}