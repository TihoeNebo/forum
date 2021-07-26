const connection = require("../database/createConnection.js");
const express = require("express");
const visiters = require("./visiters.js");
const EntriesData = require("../models/entries.js");
const userObserver = require("./userObserver.js");
const router = express.Router();

const title = ' форумы "Тихое Небо" ';

console.log("Модуль forumGET.js подключен");

router.get("/createForum", async function (req, res) {

  let [parts]= await connection.query('SELECT * FROM parts')
   .catch( (err) => {console.log(err);});

  if (visiters.get(req.cookies['tempId']).access != 4) res.send('У вас нет доступа.');
  res.render("createForum", {
                                                    title: "Создать форум -" + title,
                                                    __proto__: new EntriesData(req),
                                                    parts: parts
                                                   });

});

router.get("/:forumURN/createTopic", function(req, res) {
 if (visiters.get(req.cookies['tempId']).access > 1) res.render("createTopic", {
                                                                                              title: "Создать тему -" + title,
                                                                                              __proto__: new EntriesData(req)
                                                                                             });
   else res.send('У вас нет доступа.')
});

router.get("/profile/:userId", async function (req, res) {

  let [profile] = await connection.query(`select * from userProfiles where userId = ${req.params.userId}`)
    .catch( (err) => {return res.send('empty');});
  let [user] = await connection.query(`select access from users where userId = ${req.params.userId}`)
    .catch( (err) => {return res.send('empty');});
  let users = visiters.allWhoAlive();
  let isLive = false;
  users.forEach( (key) => {
    if (key.userId == profile[0].userId) isLive = true;
  });

  res.render("profile", {
                                           title: `Профиль: ${profile[0].userName} -` + title,
                                           user: profile[0],
                                           isDeleted: (!user.length),
                                           isUnder: (user.length && visiters.get(req.cookies['tempId']).access > user[0].access ),
                                           isModerator: (user.length && user[0].access == 3),
                                           online:  users,
                                           isLive: isLive,
                                           lastComing:  profile[0].lastComing,
                                           referer: req.headers.referer,
                                            __proto__: new EntriesData(req)
                                         });
});

router.get("/:forumURN/:topicId", async function (req, res) {

  let page = req.query.p - 1 || 0;
  let [postSum] = await connection.query(`SELECT postId from ${req.params.forumURN}_posts where topicId = ?`, [req.params.topicId])
    .catch( (err) => {return res.send('empty');});

  if (Math.ceil(postSum.length/11) - 1 < page) page =  Math.ceil(postSum.length/11) - 1;

  let [pageMessages] = await connection.query(`SELECT ${req.params.forumURN}_posts.*, userProfiles.userName FROM ${req.params.forumURN}_posts left JOIN userProfiles on userProfiles.userId = ${req.params.forumURN}_posts.userId WHERE topicId =  ${req.params.topicId}  limit ${page *11}, 11`)
   .catch( (err) => {console.log(err);});

  let names = await getNames(req.params.forumURN, req.params.topicId);

  connection.query(`UPDATE ${req.params.forumURN}_topics SET views = views + 1 WHERE topicId = ${req.params.topicId}`).catch( err => {console.log(err);});

  let users = visiters.allWhoAlive();
  userObserver.isLiveChecking (pageMessages, users);

  switch(visiters.get(req.cookies['tempId']).access) {
    case 3:
    case 4:
      pageMessages.forEach( (message) => {
        message.redactable = true;
        message.deletable = true;
      });
      break;
    case 2:
      pageMessages.forEach( (message) => {
        if (visiters.get(req.cookies['tempId']).userId == message.userId) {
          message.redactable = true;
          message.deletable = true;
        }
      });
  }

  let subTopic = false;
  if (visiters.get(req.cookies['tempId']).subscribes) {
    let sortedNotifies = [];
    let sub = { forumURN: req.params.forumURN, topicId: req.params.topicId };
    subTopic = visiters.get(req.cookies['tempId']).subscribes.find( item => item.forumURN == sub.forumURN && item.topicId == sub.topicId );
    if (subTopic) subTopic.lastComing = new Date();
  
    visiters.get(req.cookies['tempId']).notifies.forEach((notify) => {
      if (notify.forumURN != req.params.forumURN && notify.topicId != req.params.topicId) sortedNotifies.push( notify);
    });
    visiters.get(req.cookies['tempId']).notifies = sortedNotifies;
  }
  res.render("poster", {
                                       title: `Тема "${names[0].theme}" -` + title,
                                       messages: pageMessages,
                                       pages: getPages(+postSum.length, +req.query.p, req.params.forumURN, req.params.topicId),
                                       params: req.params,
                                       names: names[0],
                                       isSubscribed: subTopic,
                                       __proto__: new EntriesData(req)
                                    });
});

router.get("/:forumURN", async function (req, res) {

  let page = req.query.p - 1 || 0;
  let sqlreq = `SELECT topic.*, users2.userName AS postAuthor, users2.userId as authorId 
    FROM ( SELECT ${req.params.forumURN}_topics.*,
    COUNT(ALL ${req.params.forumURN}_posts.topicId) AS sumPosts, 
    MAX(${req.params.forumURN}_posts.postId) AS lastPostId, forums.forumURN, 
    MAX(${req.params.forumURN}_posts.postDate) AS postDate,     
    userProfiles.userName AS topicAuthor FROM ${req.params.forumURN}_topics 
    left JOIN userProfiles ON userProfiles.userId = ${req.params.forumURN}_topics.userId
    left JOIN ${req.params.forumURN}_posts 
    ON ${req.params.forumURN}_posts.topicId = ${req.params.forumURN}_topics.topicId 
    JOIN forums ON ${req.params.forumURN}_topics.forumId = forums.forumId
    GROUP BY ${req.params.forumURN}_topics.topicId ORDER BY lastPostId DESC) AS topic 
    left JOIN (select  ${req.params.forumURN}_posts.postId, ${req.params.forumURN}_posts.topicId, userProfiles.userName, userProfiles.userId from ${req.params.forumURN}_posts
    left JOIN userProfiles ON userProfiles.userId = ${req.params.forumURN}_posts.userId) as users2    
    ON users2.postId = topic.lastPostId and users2.topicId = topic.topicId
    limit ${page *11}, 11`;
  
  let [topicSum] = await connection.query(`SELECT topicId FROM ${req.params.forumURN}_topics`)
    .catch((err) =>{return res.send('empty')});
  if (Math.ceil(topicSum.length/11) - 1 < page) page =  Math.ceil(topicSum.length/11) - 1;

  let [pageTopics] = await connection.query(sqlreq)
    .catch((err) => {console.log(err);});

  let names = await getNames(req.params.forumURN);
  let exist = !!pageTopics.length;

  switch(visiters.get(req.cookies['tempId']).access) {
    case 3:
    case 4:
      pageTopics.forEach((topic) => {
                                           topic.redactable = true;
                                           topic.deletable = true;
      });
  }

  return res.render("topiclist", { 
                                     title: `Форум "${names[0].forumName}" -` + title,
                                     topics: pageTopics,
                                     exist: exist,
                                     pages: getPages(+topicSum.length, +req.query.p, req.params.forumURN),
                                     names: names[0],
                                     forumId: pageTopics[0].forumId,
                                     forumURN: pageTopics[0].forumURN,
                                     __proto__: new EntriesData(req)
  });
});


router.get("/", async function (req, res) {

  let createForumButton = false;
  const joinTable = `select forums.forumName, forums.forumURN, parts.partName, parts.partId, 
    forumlist.forumId, forumlist.topicId, forumlist.theme, forumlist.sumPosts as lastPage, sum(forumlist.sumTopics) as sumTopics, 
    sum(forumlist.sumPosts) as sumPosts, forumlist.lastPostId, forumlist.lastPostDate, forumlist.userName, forumlist.userId
    from forumlist 
    right join forums on forums.forumId = forumlist.forumId 
    left join parts on parts.partId = forums.partId
    group by forums.forumId 
    order by parts.partId`; 
 
  let tempTable = 'create table if not exists forumlist ';

  let [forums] = await connection.query('select forumURN from forums')
    .catch( (err) =>{console.log(err);});
  console.log(forums);
  if (!forums.length) { 
    if (visiters.get(req.cookies['tempId']).access == 4) createForumButton = true;
    return res.render("emptylist", { 
                                                            title: title,
                                                            createForumButton: createForumButton,
                                                             __proto__: new EntriesData(req)
                                                          });
  }

  function select(name) {
    return ` select topic.*, user.userName, user.userId from (select ${name}_topics.forumId,  
      ${name}_topics.topicId, ${name}_topics.theme, count(distinct ${name}_topics.topicId) as sumTopics,
      count( ${name}_posts.postId) as sumPosts, 
      max(${name}_posts.postId) as lastPostId, max(${name}_posts.postDate) as lastPostDate
      from ${name}_topics
      left join ${name}_posts on ${name}_posts.topicId = ${name}_topics.topicId 
       group by ${name}_topics.topicId) as topic
      left join (select ${name}_posts.postId, userProfiles.userName, userProfiles.userId from ${name}_posts left join userProfiles on userProfiles.userId = ${name}_posts.userId) as user on user.postId = topic.lastPostId `; 

  }
  tempTable += select(forums[0].forumURN);
  if (forums.length == 1) {
   tempTable += 'order by lastPostId desc';
  };

  if (forums.length > 1) {
    for ( let i = 1; i < forums.length; i++) {
      tempTable += 'union (' + select(forums[i].forumURN) + ') ';

    }; 
   tempTable += ' order by lastPostId desc'; 
  };

  await connection.query( tempTable).catch( (err) => {console.log(err);});
  let [pageForums] = await connection.query( joinTable)
    .catch( (err) => {console.log(err);});

  if (visiters.get(req.cookies['tempId']).access == 4) {
    createForumButton = true;
    pageForums.forEach( (forum) => {
      forum.redactable = true;
    });
  }

  return res.render("forumlist", { 
                                                            title: title,
                                                            forums: pageForums,
                                                            createForumButton: createForumButton,
                                                             __proto__: new EntriesData(req)
                                                          });
});

module.exports = router;

//==================================================================================

async function getNames(forumURN, topicId) {

  let sqlForumName = `select forumName from forums where forumURN = "${forumURN}"`;
  let sqlTopicName = (topicId) ? `select forums.forumName, ${forumURN}_topics.theme, ${forumURN}_topics.comment, ${forumURN}_topics.closed
    from ${forumURN}_topics
    left join forums on ${forumURN}_topics.forumId = forums.forumId
    where ${forumURN}_topics.topicId = ${topicId} ` : false;
  let sqlReq = sqlTopicName || sqlForumName;

  let [names] = await connection.query(sqlReq)
    .catch( (err) => {console.log(err);});
  names[0].topicId = topicId;
  console.log(names);
  return names;
}

function getPages(n, p, forumURN, topicId) {
  topicId = (topicId) ? ('/' + topicId) : '';
  if (n <= 11) return;

  let allPages = Math.ceil(n/11);
  let addLinks = '';

  for (let i = 1; i <= allPages; i++) {
    if ( i == p || (!p && i == 1)) {
      addLinks += '[ ' + i + ' ]';
      continue;
    }
    addLinks += '<a href="/' + forumURN + topicId + '?p=' + i + '">[ ' + i + ' ]</a>';
  };
  return new hbs.SafeString(addLinks);
}