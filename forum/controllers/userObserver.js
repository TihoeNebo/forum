const connection = require("../database/createConnection.js");
const visiters = require("./visiters.js");
const crypto = require("crypto");
const salt = 'ghio9jf23v959blljiucds7ettrd6srechg47oouiuk8';
const User = require("../models/users.js");

console.log( "Подключен модуль userObserver.js");

exports.getNotifies = async function(self) {
  self.notifies = [];
  let [news] = await connection.query(await sqlGetAllNew()).catch( err  => console.log(err) );
  news.forEach( item => { item.postDate = new Date(item.postDate); } );
  self.subscribes.forEach( (sub) => {
    sub.lastComing = new Date(sub.lastComing);
    let notify = news.find( item => item.forumURN == sub.forumURN && item.topicId == sub.topicId );
    if(notify) {
      if (sub.lastComing < notify.postDate) self.notifies.push(notify); 
    }
  });
}

exports.updateInbox  = async function (inbox, userId) {
console.log(inbox);
  let arr = [];
  let sql = 'insert into inbox_' + userId + '(userId, newMessages, ignored) values ?';
  inbox.forEach( (key) => {arr.push([key.userId, key.newMessages, key.ignored]);});
console.log(arr);
  await connection.query(`truncate table inbox_${userId}`).catch( (err) =>{console.log(err)});
  if (arr.length) connection.query(sql, [arr]).catch( (err) =>{console.log(err)});
}

exports.deleteTopics  = async function(forumURN, topics) {

  let sqlDeleteTopics =`delete from ${forumURN}_topics where topicId=${topics[0]}`;
  if (topics.length > 1) {
    for(let i = 1; i < topics.length; i++) {
      sqlDeleteTopics += ` or topicId=${topics[i]}`;
    };
  };
  await connection.query(sqlDeleteTopics).catch( (err) =>{console.log(err)});
}

exports.deletePosts  = async function (forumURN, posts, access, userId) {
  let sqlDeletePosts = `delete from ${forumURN}_posts where postId = ${posts[0]}`;

  if (posts.length > 1) {
    for(let i = 1; i < posts.length; i++) {
      sqlDeletePosts += ` or postId = ${posts[i]}`;
    };
  };
  if (access == 2) sqlDeletePosts = sqlDeletePosts + ' and userId = ' + userId;
  await connection.query(sqlDeletePosts)
    .catch( (err) => {console.log(err);});
}

function hashPass(pass) {
  let hash = crypto.createHash('sha256');
  hash.update(pass + salt);
  return hash.digest('hex');
}

exports.hashPass = hashPass;

exports.login = async function(mail, pass, visiter) {

  let hash = hashPass(pass);
  let [user] = await connection.query(`select * from users where mail = '${mail}' and pass ='${hash}'`)
    .catch( err => {console.log(err);});
    
  if (!user.length) return false;
  clearTimeout(visiters.get(visiter).timer);
  await visiters.set(visiter, await new User(visiter, user[0]));
  return true;
}

exports.isLiveChecking = function (control, online) {
  control.forEach( (message) => {
    message.isLive = false;
    online.forEach( (key)=>{
      if (key.userId == message.userId) message.isLive = true;
    });
  });
};

async function sqlGetAllNew () {
  let [forums] = await connection.query(`select forumURN from forums`).catch( err  => console.log(err) );
  let sqlPosts = `select forums.forumURN, ${forums[0].forumURN}_topics.topicId, ${forums[0].forumURN}_topics.theme, max(${forums[0].forumURN}_posts.postId) as postId, max(${forums[0].forumURN}_posts.postDate) as postDate, ${forums[0].forumURN}_posts.userId
    from ${forums[0].forumURN}_topics 
    join forums on forums.forumId = ${forums[0].forumURN}_topics.forumId 
    join ${forums[0].forumURN}_posts on ${forums[0].forumURN}_posts.topicId = ${forums[0].forumURN}_topics.topicId
    group by ${forums[0].forumURN}_topics.topicId`;
  let result = sqlPosts;
  if (forums.length == 1) return result;
  forums.forEach( (key) => {
    let sqlMore = `select forums.forumURN, ${key.forumURN}_topics.topicId, ${key.forumURN}_topics.theme, max(${key.forumURN}_posts.postId) as postId, max(${key.forumURN}_posts.postDate) as postDate, ${key.forumURN}_posts.userId
      from ${key.forumURN}_topics 
      join forums on forums.forumId = ${key.forumURN}_topics.forumId 
      join ${key.forumURN}_posts on ${key.forumURN}_posts.topicId = ${key.forumURN}_topics.topicId
      group by ${key.forumURN}_topics.topicId`;
    result = result + ' union (' + sqlMore + ') ';    
  })
  return result;
}