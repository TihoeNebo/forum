const express = require("express");
const pars = require("body-parser");
const mysql = require("mysql2");
const exphbs = require("express-handlebars");
const hbs= require("hbs");
const cookiePars = require("cookie-parser");
const crypto = require("crypto");
const mailer = require("nodemailer");
const Emitter = require("events");


const salt = 'ghio9jf23v959blljiucds7ettrd6srechg47oouiuk8';
const jpars = pars.json();
const app = express();

let emitter = new Emitter();

//==============CommonEmitters===================

emitter.on( "offlinePM", (data) => {
  connection.query(`select mail from users where userId = ${data.to}`)
  .then( ([user])=>{
    sendNotifyLetter(user[0].mail, data)
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

//===============================================

let trans = mailer.createTransport({
  service: 'gmail',
  auth: {user: 'tihoe.nebo@gmail.com', pass: 'Venivedivici12'}
});

let p = 0; //number for hash
let visiters = new Map();
let confirmList = new Map();
let forumArr = [];
let timerId = 0;
let isUser = false;
let bannedUsers = [];
const sqldroptable='DROP TABLE IF EXISTS forumlist';


class User extends Emitter {
  constructor (id, { userId = '',  mail = '', pass = '', access = 0}){
    super();
    let self = this;
    this.visiterId = id;
    this.userId = userId;
    this.pass = pass;
    this.access = access;
    this.mail = mail;
    this.profile = {};
    this.drop ={};
    this.inbox = [];
    this.isOnline = ( ) => {
     clearTimeout(this.timer);
      this.timer = setTimeout(  ( ) => {
        if (this.drop) {
          if (this.drop.posts) deletePosts(this.drop.forumURN, this.drop.posts, this.access, this.userId);
          if (this.drop.topics && this.access > 2) deleteTopics(this.drop.forumURN, this.drop.topics);
        }
        if (this.access > 0) {
          let subscribes = JSON.stringify( this.subscribes );
          let date = new Date();
          date = new Date(+date.getTime() - 360000)
          date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
          connection.query(`update userProfiles set lastComing = '${date}', subscribes = '${subscribes}' where userId = ${self.userId}`).catch( err => {console.log(err);});
          updateInbox (this.inbox, this.userId);
          emitter.emit("forAll", {
            event: "logout", 
            params:{ 
              userId: this.userId, 
              lastComing: date 
            }
          });
        }
        visiters.delete(this.visiterId);
      }, 360000);
    }
    if (access == 0) this.profile.userName = 'Гость';
    else {
      connection.query(`select inbox_${this.userId}.*, userProfiles.userName,  userProfiles.lastComing from inbox_${this.userId}
                                         join userProfiles on inbox_${this.userId}.userId = userProfiles.userId 
                                         order by newMessages desc`).then( ([inbox]) => {this.inbox = inbox;})
        .catch( err => {console.log(err);});
      connection.query(`select * from userProfiles where userId = ${userId}`)
        .then( ([prof]) => { 
          this.profile = prof[0];
          this.profile.isConfurmed = (this.access > 1);
          this.subscribes = JSON.parse(prof[0].subscribes);
          getNotifies(this);
          if (this.profile.banned) { 
            this.profile.banned = new Date( this.profile.banned );
            let now = new Date();
            if (this.profile.banned <= now) {
              connection.query(`update userProfiles set banned = null where userId = ${this.userId}`).catch( err => {console.log(err);});
              this.profile.banned = null;
            } else {
              this.access = 1;
              if (!bannedUsers.find( item => item.userId == this.userId) ) {
                bannedUsers.push({userId: this.userId, banned: this.profile.banned});
              }
            }
          }
          emitter.emit("forAll", { 
            event: "login", 
            params: {
              userId: this.userId,
              userName: this.profile.userName
            }  
          });
        })
        .catch( err => {console.log(err);});
    }  
  }
}

class EntriesData { 
  constructor (req) {
    this.notifies = visiters.get(req.cookies['tempId']).notifies;
    this.notifiesCount = (visiters.get(req.cookies['tempId']).notifies) ? visiters.get(req.cookies['tempId']).notifies.length : 0; 
    this.unopened =  0;
    this.isLogin = (visiters.get(req.cookies['tempId']).access > 0);
    this.isMaster = (visiters.get(req.cookies['tempId']).access > 2);
    this.isLord = (visiters.get(req.cookies['tempId']).access > 3);
    this.userProfile = visiters.get(req.cookies['tempId']).profile;
    this.online =  allWhoAlive();
    this.inbox = Array.from(visiters.get(req.cookies['tempId']).inbox);
    if (visiters.get(req.cookies['tempId']).inbox.length) {
      visiters.get(req.cookies['tempId']).inbox.forEach( (key) => {
        if (!key.ignored) this.unopened +=  + key.newMessages;
      });
    }
    isLiveChecking (this.inbox, this.online);
  }
}



app.engine("hbs", exphbs(
    {
         layoutsDir: "views/layouts",
   defaultLayout: "index",
             extname: "hbs",

               helpers: {
                 getPosts: function(n) {
                   return new hbs.SafeString(n);
                 },
                 getDate: function (date) {
                   
                   function addZero (n) {
                     if (n < 10) n = '0' + n;
                     return n;
                   }
                   if (date) {
                   date = date.getFullYear() + '-' + addZero( (date.getMonth() + 1) ) + '-' + addZero( date.getDate() ) + ' ' + addZero( date.getHours() ) +':' + addZero( date.getMinutes() ) + ':' + addZero( date.getSeconds() );}
                   return date;
                 },
                 dislocateParts: dislocateParts,
                 ceil: function(n) { return Math.ceil(n/11)|| 1;},
                 sayHello: function(sex) {
                   switch(sex){
                     case 2:
                       return 'госпожа';
                     case 1:
                       return 'господин';
                     case 0:
                       return 'некто';
                   }
                 },
                 getSex: function(sex) {
                   switch(sex){
                     case 2:
                       return 'женщина';
                     case 1:
                       return 'мужчина';
                     case 0:
                       return 'неизвестно';
                   }
                 }
               }
      }
));
app.set("view engine", "hbs");
hbs.registerPartials(__dirname + "/views/partials");
  
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "forum",
  password: "star12"
}).promise();

createRoot();
getForumNames();

console.log('Подключено');

//==============STATIC=====================

app.use(cookiePars());

app.use("/script.js", express.static(__dirname + "/script.js"));
app.use("/regList.js", express.static(__dirname + "/regList.js"));
app.use("/optionsList.js", express.static(__dirname + "/optionsList.js"));
app.use("/favicon.ico", () => {return;});


//...........................................SSE...............................................................................


app.get("/pulse", async function (req, res) {
  if (!visiters.has(req.cookies['tempId']) ) return;

  res.writeHead(200, {'Content-Type' : 'text/event-stream'});

  visiters.get(req.cookies['tempId']).removeAllListeners();
  visiters.get(req.cookies['tempId']).on('newPost', (data)=> {
    if (data.userId == visiters.get(req.cookies['tempId']).userId) return;
    if ( visiters.get(req.cookies['tempId']).subscribes.find( item => item.forumURN== data.forumURN && item.topicId == data.topicId ) ) {
      res.write(`event: newPost\ndata: ${JSON.stringify({
                                                                                                     forumURN: data.forumURN, 
                                                                                                     topicId: data.topicId, 
                                                                                                     theme: data.theme
                                                                                                  })
      } \n\n`);
    }
  });

  visiters.get(req.cookies['tempId']).on('newPM', (data)=> {
    res.write(`event: newPM\ndata: ${JSON.stringify({fromId: data.fromId, 
                                                                                                fromName: data.fromName})} \n\n`);
  });
  visiters.get(req.cookies['tempId']).on('readedPM', (data)=> {
    res.write(`event: readedPM\ndata: ${JSON.stringify({fromId: data.fromId, 
                                                                                                     pmId: data.pmId})} \n\n`);
  });
  visiters.get(req.cookies['tempId']).on('logout', (data)=> {
    res.write(`event: logout\ndata: ${JSON.stringify({ userId: data.userId, lastComing: data.lastComing })} \n\n`);
  });
  visiters.get(req.cookies['tempId']).on('login', (data)=> {
    res.write(`event: login\ndata: ${JSON.stringify({ userId: data.userId, userName: data.userName })} \n\n`);
  });
  visiters.get(req.cookies['tempId']).on('ban', (data)=> {
    res.write(`event: ban\ndata: ${JSON.stringify({ period: data.period })} \n\n`);
  });
  visiters.get(req.cookies['tempId']).on('disban', (data)=> {  
    res.write(`event: disban\ndata: \n\n`);
  }); 
});

app.get("/online", function(req, res) {
//console.log('online ' + req.cookies['tempId']);
  if ( visiters.has(req.cookies['tempId']))  visiters.get(req.cookies['tempId']).isOnline();
});

//==============USE=====================

app.use( async function(req, res, next) {

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
    visiters.get(tempId).isOnline();
    req.cookies['tempId'] = tempId;
   console.log(req.cookies['tempId']);   
    if (req.cookies['mail']) {
     await login(req.cookies['mail'], req.cookies['pass'], req.cookies['tempId']);
    } 
  }
 next();
});

app.use( async function(req, res, next) {
//  if (req.method != 'GET') return next();
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
});

//=================LOGIN===================

app.post("/register", jpars, async function(req, res) {
  let [isUserExist] = await connection.query(`select userId from users where mail = '${req.body.mail}' `)
    .catch( err => {console.log(err);});
  isUserExist = isUserExist.length;

  if (isUserExist) return res.sendStatus(504);
  let userId = 0;
  let hash = crypto.createHash('sha256');
  hash.update(req.body.pass + salt);
  hash = hash.digest('hex');
  await connection.query(`insert into users(pass, mail, access, registered) values('${hash}', '${req.body.mail}',1, now())`)
  .then( ([res])=> {userId = res.insertId;} )
  .catch( err => {console.log(err);});
  //let [userId] =  await connection.query(`select userId from users where mail = '${req.body.mail}'`).catch( err => {console.log(err);});
 // userId = userId[0].userId;
console.log(userId);
  await connection.query(`insert into userProfiles(userId, userName, sex, subscribes, birthday) values(${userId}, '${req.body.login}', ${req.body.sex}, '[]', ?)`, [req.body.birthday])
    .catch( err => {console.log(err);});

  connection.query(`create table inbox_${userId} (
    userId mediumint unsigned not null,
    newMessages mediumint unsigned default 1,
    ignored tinyint(1) default 0,
    primary key(userId)) default charset = utf8`).catch( (err) => {console.log(err);});

  sendRegLetter(req.body.mail, req.body.login);
  res.send('');
});

app.post('/login', jpars, async function(req, res) {
  let isUser = await login( req.body.mail, req.body.pass, req.cookies['tempId']);
  if (!isUser) return res.sendStatus(504);
  visiters.get(req.cookies['tempId']).isOnline();
  if (+req.body.rememberMe) {
    res.cookie('mail', req.body.mail);
    res.cookie('pass', req.body.pass); 
  }   
 console.log(visiters.get(req.cookies['tempId']).profile.userName);
  return res.sendStatus(200);
});

app.post('/sendRegLetter', jpars, function(req, res) {
  if (visiters.get(req.cookies['tempId']).access == 0 || visiters.get(req.cookies['tempId']).profile.isConfurmed) return;
  connection.query(`update users set mail = "${req.body.mail}" where userId = ${visiters.get(req.cookies['tempId']).userId}`)
    .catch( err => {console.log(err);});
  sendRegLetter(req.body.mail, visiters.get(req.cookies['tempId']).profile.userName);
  res.send('');
});

app.get('/confirm', async function(req, res) {
  let code = req.query.code;
  if ( confirmList.has(code) ) {
    await connection.query(`update users set access=2 where mail = "${confirmList.get(code)}"`);
    let [user] = await connection.query(`select * from users where mail = "${confirmList.get(code)}"`);
    visiters.set(req.cookies['tempId'], new User(user[0].userId, user[0]));
    res.redirect('/logout');
  } else res.send('Извините, похоже, ссылка просрочена.');
});

app.post( '/banUser', jpars, function (req, res) {
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
});

app.get( '/reabilitate', function (req, res) {
  if (!bannedUsers.length) return res.sendStatus(504);

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
});

app.get( '/moderate', function (req, res) {
  if (!req.query.userId || visiters.get(req.cookies['tempId']).access != 4) return res.sendStatus(504);
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
});
 
app.delete( '/deleteUser', async function (req, res) {
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
});  

app.get('/logout', function(req, res) {

  if (visiters.get(req.cookies['tempId']).access == 0) return;
console.log(visiters.get(req.cookies['tempId']).notifies);
  let subscribes = JSON.stringify( visiters.get(req.cookies['tempId']).subscribes );
  let date = new Date();
  date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  connection.query(`update userProfiles set lastComing = '${date}', subscribes = '${subscribes}' where userId = ${visiters.get(req.cookies['tempId']).userId}`)
    .catch( err => {console.log(err);});
  updateInbox (visiters.get(req.cookies['tempId']).inbox, visiters.get(req.cookies['tempId']).userId);
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
});

app.get("/me", function (req, res) {
  if (!visiters.get(req.cookies['tempId']).access) return res.redirect('/');
  res.render('me', {
                                  mail: visiters.get(req.cookies['tempId']).mail,
                                  referer: req.headers.referer,
                                  __proto__: new EntriesData(req)
  });
});

app.get("/me/getSubscribes", jpars, (req, res) => {
  if (!visiters.get(req.cookies['tempId']).access) return;
  res.json(visiters.get(req.cookies['tempId']).subscribes);
});

app.get("/me/getIgnored", jpars, (req, res) => {
  let ignoreList = [];
  visiters.get(req.cookies['tempId']).inbox.forEach( (user) => {
    if (user.ignored) ignoreList.push(user);
  });
  res.send(ignoreList);
});

app.delete("/me/delSubscribes", (req, res) => {

  let i = visiters.get(req.cookies['tempId']).subscribes.findIndex(item =>
    +item.topicId == +req.query.topicId && item.forumURN == req.query.forum);
 console.log(i);
  visiters.get(req.cookies['tempId']).subscribes.splice(i, 1);
 console.log(visiters.get(req.cookies['tempId']).subscribes.splice(i, 1));
  res.sendStatus(200);
  
});

app.put("/me/forgive", (req, res) => {
  let userId = +req.query.userId;
  let ignoredUser = visiters.get(req.cookies['tempId']).inbox.find( item => +item.userId == userId);
  ignoredUser.ignored = 0;
  return res.sendStatus(200);
});

app.put("/me/changePass", jpars, async function(req, res) {
  let userId = visiters.get(req.cookies['tempId']).userId;
  let oldPass = hashPass(req.body.oldPass);
  let myPass = visiters.get(req.cookies['tempId']).pass;
//  let [isMyPass] = await connection.query(`select mail from users where userId=${userId} and pass='${oldPass}'`)
  // .catch( (err) => {console.log(err);});
  if (oldPass != myPass) return res.sendStatus(504);
  let newPass = hashPass(req.body.newPass);
  connection.query(`update users set pass = '${newPass}' where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })
   .catch( (err) => {return res.sendStatus(504);});
});

app.put("/me/changeMail", jpars, function(req, res) {
  let userId =visiters.get(req.cookies['tempId']).userId;
  let newMail = req.body.newMail;
  connection.query(`update users set mail = '${newMail}' where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(504); });
});

app.put("/me/changeName", function(req, res) {
  let userId =visiters.get(req.cookies['tempId']).userId;
  let newName = req.query.newName;
  visiters.get(req.cookies['tempId']).profile.userName = newName;
  connection.query(`update userProfiles set userName = '${newName}' where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(504); });
});

app.put("/me/changeSex", function(req, res) {
  let userId =visiters.get(req.cookies['tempId']).userId;
  let newSex = +req.query.newSex;
  visiters.get(req.cookies['tempId']).profile.sex = newSex;
  connection.query(`update userProfiles set sex = ${newSex} where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(504); });
});

app.put("/me/changeBirth", function(req, res) {
  let userId =visiters.get(req.cookies['tempId']).userId;
  let newBirth = req.query.newBirth;
  console.log(newBirth);
  visiters.get(req.cookies['tempId']).profile.birthday = new Date(newBirth);
  connection.query(`update userProfiles set birthday = ${newBirth} where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(504); });
});

app.put("/me/changeSubMode", function(req, res) {
  let mode = +req.query.mode;
  let userId = visiters.get(req.cookies['tempId']).userId;
  visiters.get(req.cookies['tempId']).profile.subMode = mode;
  connection.query(`update userProfiles set subMode = ${mode} where userId = ${userId}`)
   .then( () =>{  return res.sendStatus(200); })  
   .catch( (err) => { return res.sendStatus(504); });    
});
//=================GET==================

app.get("/registration", function (req, res) {
  res.render('reg');});

app.get("/createForum", async function (req, res) {

  let [parts]= await connection.query('SELECT * FROM parts')
   .catch( (err) => {console.log(err);});

  if (visiters.get(req.cookies['tempId']).access != 4) res.send('У вас нет доступа.');
  res.render("createForum", {
                                                    __proto__: new EntriesData(req),
                                                    parts: parts
                                                   });

});

app.get("/:forumURN/createTopic", jpars, function(req, res) {
 if (visiters.get(req.cookies['tempId']).access > 1) res.render("createTopic", {
                                                                                              __proto__: new EntriesData(req)
                                                                                             });
   else res.send('У вас нет доступа.')
});

app.get("/profile/:userId", async function (req, res) {

  let [profile] = await connection.query(`select * from userProfiles where userId = ${req.params.userId}`)
    .catch( (err) => {return res.send('empty');});
  let [user] = await connection.query(`select access from users where userId = ${req.params.userId}`)
    .catch( (err) => {return res.send('empty');});
  let users = allWhoAlive();
  let isLive = false;
  users.forEach( (key) => {
    if (key.userId == profile[0].userId) isLive = true;
  });

  res.render("profile", {
                                           user: profile[0],
                                           isDeleted: (!user.length),
                                           isUnder: (user.length && visiters.get(req.cookies['tempId']).access > user[0].access ),
                                           isModerator: (user.length && user[0].access == 3),
                                           online:  allWhoAlive(),
                                           isLive: isLive,
                                           lastComing:  profile[0].lastComing,
                                           referer: req.headers.referer,
                                            __proto__: new EntriesData(req)
                                         });
});

app.get("/:forumURN/:topicId", async function (req, res) {

  let page = req.query.p - 1 || 0;
  let [postSum] = await connection.query(`SELECT postId from ${req.params.forumURN}_posts where topicId = ?`, [req.params.topicId])
    .catch( (err) => {return res.send('empty');});

  if (Math.ceil(postSum.length/11) - 1 < page) page =  Math.ceil(postSum.length/11) - 1;

  let [pageMessages] = await connection.query(`SELECT ${req.params.forumURN}_posts.*, userProfiles.userName FROM ${req.params.forumURN}_posts left JOIN userProfiles on userProfiles.userId = ${req.params.forumURN}_posts.userId WHERE topicId =  ${req.params.topicId}  limit ${page *11}, 11`)
   .catch( (err) => {console.log(err);});

  let names = await getNames(req.params.forumURN, req.params.topicId);

  connection.query(`UPDATE ${req.params.forumURN}_topics SET views = views + 1 WHERE topicId = ${req.params.topicId}`).catch( err => {console.log(err);});

  let users = allWhoAlive();
  isLiveChecking (pageMessages, users);

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
                                       messages: pageMessages,
                                       pages: getPages(+postSum.length, +req.query.p, req.params.forumURN, req.params.topicId),
                                       params: req.params,
                                       names: names[0],
                                       isSubscribed: subTopic,
                                       __proto__: new EntriesData(req)
                                    });
});

app.get("/:forumURN", async function (req, res) {

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
                                     topics: pageTopics,
                                     exist: exist,
                                     pages: getPages(+topicSum.length, +req.query.p, req.params.forumURN),
                                     names: names[0],
                                     forumId: pageTopics[0].forumId,
                                     forumURN: pageTopics[0].forumURN,
                                     __proto__: new EntriesData(req)
  });
});


app.get("/", async function (req, res) {


  let createForumButton = false;
  const joinTable = `select forums.forumName, forums.forumURN, parts.partName, parts.partId, 
    forumlist.forumId, forumlist.topicId, forumlist.sumPosts as lastPage, sum(forumlist.sumTopics) as sumTopics, 
    sum(forumlist.sumPosts) as sumPosts, forumlist.lastPostId, forumlist.lastPostDate, forumlist.userName, forumlist.userId
    from forumlist 
    right join forums on forums.forumId = forumlist.forumId 
    left join parts on parts.partId = forums.partId
    group by forums.forumId 
    order by parts.partId`; 
 
  let tempTable = 'create temporary table if not exists forumlist ';

  let [forums] = await connection.query('select forumURN from forums')
    .catch( (err) =>{console.log(err);});
  console.log(forums);
  if (!forums.length) { 
    if (visiters.get(req.cookies['tempId']).access == 4) createForumButton = true;
    return res.render("emptylist", { 
                                                            createForumButton: createForumButton,
                                                             __proto__: new EntriesData(req)
                                                          });
  }

  function select(name) {
    return ` select topic.*, user.userName, user.userId from (select ${name}_topics.forumId,  
      ${name}_topics.topicId, count(distinct ${name}_topics.topicId) as sumTopics,
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

                                                            forums: pageForums,
                                                            createForumButton: createForumButton,
                                                             __proto__: new EntriesData(req)
                                                          });
});


//==================POST=====================

app.post("/createForum", jpars, async function (req, res) {
  
  if (visiters.get(req.cookies['tempId']).access < 4) return res.sendStatus(504);

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

app.post("/sendPM", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 1) return res.sendStatus(504); 

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
  if (to.length && +to[0].ignored) return  res.sendStatus(504); 
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

app.post("/getSession", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 1) return res.sendStatus(504);

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

  let [message] = await connection.query(`select session_${user1}_${user2}_.*, userProfiles.userName from session_${user1}_${user2}_ join userProfiles on session_${user1}_${user2}_.userId = userProfiles.userId`)
    .catch( (err) => {console.log(err);
                                    return res.sendStatus(504); });
  return res.json(message);
});

app.post("/subscribe", jpars, async function(req, res) {
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

app.post("/:forumURN/createTopic", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(504);

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


app.post("/:forumId/createPost", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(504);

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

//====================PUT===========================

app.put("/:forumURN/updatePost", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(504);

  let sqlUpdatePost = 'update ' + req.params.forumURN + '_posts set content = "' +
    req.body.content + '" where postId = ' + req.body.postId;

  if (visiters.get(req.cookies['tempId']).access == 2) sqlUpdatePost = sqlUpdatePost + ' and userId = ' + visiters.get(req.cookies['tempId']).userId;

  await connection.query(sqlUpdatePost)
    .catch( (err) => {
                                   console.log(err);
                                   return res.sendStatus(504);
                                  });
  if (req.body.topicId) {
    res.redirect('/' + req.params.forumURN + '/updateTopic');
  }
  return res.json(req.body.content);
});

app.put("/:forumURN/updateTopic", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(504);

  let sqlUpdateTopic = "update " + req.params.forumURN + "_topics set theme = '" +
    req.body.theme + "', comment = '" + req.body.comment + "' where topicId = " + req.body.topicId;

  if (visiters.get(req.cookies['tempId']).access == 2) sqlUpdateTopic = sqlUpdateTopic + ' and userId = ' + visiters.get(req.cookies['tempId']).userId;

  await connection.query(sqlUpdateTopic)
    .catch( (err) => {
                                   console.log(err);
                                   return res.sendStatus(504);
                                  });
  return res.json(req.body);
});

app.put("/:forumURN/changeForum", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 3) return res.sendStatus(504);

  if (req.query.topicId && req.query.chosenURN) {
    let [topicNewId] =  await connection.query(`insert into ${req.query.chosenURN}_topics (theme, comment, userId, views, closed) 
      select ${req.params.forumURN}_topics.theme, ${req.params.forumURN}_topics.comment, ${req.params.forumURN}_topics.userId, ${req.params.forumURN}_topics.views, ${req.params.forumURN}_topics.closed from ${req.params.forumURN}_topics 
      where ${req.params.forumURN}_topics.topicId = ${+req.query.topicId} and ${req.params.forumURN}_topics.essential = 0`)
      .catch( (err) => {
                                   console.log(err);
                                   return res.sendStatus(504);
                                  });
    topicNewId = topicNewId.insertId;

    console.log(topicNewId);
    await connection.query(`insert into ${req.query.chosenURN}_posts (topicId, userId, content, postDate, essential) 
     select  abs(${topicNewId}) as topicId, ${req.params.forumURN}_posts.userId, ${req.params.forumURN}_posts.content, ${req.params.forumURN}_posts.postDate, ${req.params.forumURN}_posts.essential from ${req.params.forumURN}_posts 
     where ${req.params.forumURN}_posts.topicId = ${+req.query.topicId}`)
      .catch( (err) => {
                                   console.log(err);
                                   return res.sendStatus(504);
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

app.put("/:forumURN/:topicId", async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 3) return res.sendStatus(504);

  await connection.query(`update ${req.params.forumURN}_topics set closed = ${+req.query.close} where topicId = ${req.params.topicId}`)
    .catch( (err) => {console.log(err);});
  return res.sendStatus(200);
});

app.put("/updatePart", jpars, function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 4) return res.sendStatus(504);

  let sqlUpdatePart = "update parts set partName = '" + req.body.partName + "' where partId = " + req.body.partId;

  return connection.query(sqlUpdatePart, (err, result) => {
    console.log(err);
    return res.json(req.body);
  });
});

app.put("/updateForum", jpars, async function(req, res) {

  if (visiters.get(req.cookies['tempId']).access < 4) return res.sendStatus(504);

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

//=============DELETE==============

app.delete("/deleteForum/:forumURN", jpars, async function (req, res) {

  if (visiters.get(req.cookies['tempId']).access < 4) return res.sendStatus(504);

  console.log(req.params.forumURN);
  let isDeletable = false;

  let sqlDropPosts = `drop table ${req.params.forumURN}_posts`;
  let sqlDropTopics = `drop table ${req.params.forumURN}_topics`;
  let sqlDeleteForum = `delete from forums where forumURN = '${req.params.forumURN}'`;
  let sqlForumsPart = `select forumId from forums where partId = (select partId from forums where forumURN = '${req.params.forumURN}')`;
  let sqlDeletePart = `delete from parts where partId = (select partId from forums where forumURN = '${req.params.forumURN}')`;

  await connection.query(sqlForumsPart)
    .then( ([ids]) => { if (ids.length == 1) return isDeletable = true;})
    .catch((err)=>{console.log(err);});
  if (isDeletable) {
    await connection.query(sqlDeletePart).catch((err)=>{console.log(err);});
  };

  await connection.query(sqlDropPosts).catch((err)=>{console.log(err);});
  await connection.query(sqlDropTopics).catch((err)=>{console.log(err);});
  await connection.query(sqlDeleteForum).catch((err)=>{console.log(err);});
  return res.json(true);
});  

app.delete("/:forumURN/deletePosts", jpars, async function (req, res) {
  console.log(req.body.id);
  if (visiters.get(req.cookies['tempId']).access < 2) return res.sendStatus(504);
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

app.delete("/:forumURN/deleteTopics", jpars, async function (req, res) {

  if (visiters.get(req.cookies['tempId']).access < 3) return res.sendStatus(504);
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

app.listen(3000);

function dislocateParts (context, options) {
  let previousPart = 0;
  let matrix = "";
  let dataRedactable = (context[0].redactable) ? " data-redactable = 'true' ": "";
  for (let i = 0; i< context.length; i++) {
    if (context[i].partId != previousPart) {
      if (previousPart != 0) matrix += "</table></div>";
      matrix += "<div class='part' > Раздел: <div class='partName' id = '" + context[i].partId + 
        "' " + dataRedactable + "><h3 class='partTitle'>" + context[i].partName + 
        "</h3></div><table border='1'><tr><td>Форум:</td><td>кол-во тем:</td><td>кол-во сообщений:</td><td>Последнее сообщение:</td></tr>" + options.fn(context[i]);
    } else {
      matrix += options.fn(context[i]);
    };
    previousPart = context[i].partId;
  };
  return matrix + "</table></div>";
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

function createRoot() {

  connection.query(`create table if not exists parts (
    partId tinyint(3) unsigned not null auto_increment,
    partName varchar(40) not null,
    primary key(partId)) default charset = utf8`).catch( (err) => {console.log(err);});

  connection.query(`create table if not exists forums (
    forumId tinyint(3) unsigned not null auto_increment,
    partId tinyint(3) unsigned not null,
    forumURN varchar(40) not null,
    forumName varchar(40) not null, 
    primary key(forumId)) default charset = utf8`).catch( (err) => {console.log(err);});

  connection.query(`create  table if not exists users (
    userId mediumint unsigned not null auto_increment,
    pass varchar(100),
    mail varchar(22),
    access tinyint unsigned default 1,
    registered datetime not null,
    primary key(userId)) default charset = utf8`).catch( (err) => {console.log(err);});

  connection.query(`create  table if not exists userProfiles (
    userId mediumint unsigned not null,
    userName varchar(22),
    sex tinyint(1) default 0,
    birthday date,
    lastComing datetime,
    banned datetime,
    subscribes mediumtext,
    subMode tinyint(1) default 3,
    primary key(userId)) default charset = utf8`).catch( (err) => {console.log(err);});

}  

function sendRegLetter(mail, name) {
  let authorHash = crypto.createHash('sha256');
  let date = new Date();
  authorHash = authorHash.update(mail + date + salt).digest('hex');

  confirmList.set(authorHash, mail);

  trans.sendMail({
    from: 'Тихое Небо <tihoe.nebo@gmail.com>',
    to: mail,
    subject: "Подтверждение адреса электронной почты.",
    html: `<h3>Здравствуйте, ${name}!</h3> 
      <p>Для окончательной авторизации на нашем портале, пройдите, пожалуйста, по ссылке:</p> 

      <a>http://localhost:3000/confirm/?code=${authorHash} </a>

      <p>С уважением, Тихое Небо.</p>`
  });
}

function sendNotifyLetter(mail, {toName, fromId, fromName, fromSex}) {
  let content = '';
  switch(fromSex) {
    case 2:
      content = `<a href="http://localhost:3000/profile/${fromId}">${fromName}</a> написала Вам личное сообщение.`;
      break;
    case 1:
      content = `<a href="http://localhost:3000/profile/${fromId}">${fromName}</a> написал Вам личное сообщение.`;
      break;
    case 0:
      content = `Некто <a href="http://localhost:3000/profile/${fromId}">${fromName}</a> оставил личное сообщение для Вас.`;
      break;
  }
  trans.sendMail({
    from: 'Тихое Небо <tihoe.nebo@gmail.com>',
    to: mail,
    subject: "У вас новое сообщение.",
    html: `<h3>Здравствуйте, ${toName}!</h3> 
      <p>${content}</p> 

      <a>http://localhost:3000/</a>

      <p>С уважением, Тихое Небо.</p>`
  });
}

function hashPass(pass) {
  let hash = crypto.createHash('sha256');
  hash.update(pass + salt);
  return hash.digest('hex');
}

async function login(mail, pass, visiter) {

  let hash = hashPass(pass);
  let [user] = await connection.query(`select * from users where mail = '${mail}' and pass ='${hash}'`)
    .catch( err => {console.log(err);});
    
  if (!user.length) return false;
  clearTimeout(visiters.get(visiter).timer);
  await visiters.set(visiter, await new User(visiter, user[0]));
  return true;
}

async function getForumNames () {
  [forumArr] = await connection.query(`select forumName, forumURN from forums`) 
    .catch( err => {console.log(err);});
}

async function deletePosts(forumURN, posts, access, userId) {
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

async function deleteTopics (forumURN, topics) {

  let sqlDeleteTopics =`delete from ${forumURN}_topics where topicId=${topics[0]}`;
  if (topics.length > 1) {
    for(let i = 1; i < topics.length; i++) {
      sqlDeleteTopics += ` or topicId=${topics[i]}`;
    };
  };
  await connection.query(sqlDeleteTopics).catch( (err) =>{console.log(err)});
}

function allWhoAlive  (){
 let list = [];
 let i = 0;
 for (let value of visiters.values()){
   list[i++] = value.profile;
 }
 return list;  
}

async function updateInbox (inbox, userId) {
console.log(inbox);
  let arr = [];
  let sql = 'insert into inbox_' + userId + '(userId, newMessages, ignored) values ?';
  inbox.forEach( (key) => {arr.push([key.userId, key.newMessages, key.ignored]);});
console.log(arr);
  await connection.query(`truncate table inbox_${userId}`).catch( (err) =>{console.log(err)});
  if (arr.length) connection.query(sql, [arr]).catch( (err) =>{console.log(err)});
}

function isLiveChecking (control, online) {
  control.forEach( (message) => {
    message.isLive = false;
    online.forEach( (key)=>{
      if (key.userId == message.userId) message.isLive = true;
    });
  });
}

function notify(req, sub) {  
  if ( !visiters.get(req.cookies['tempId']).subscribes.find( item => item.forumURN== sub.forumURN && item.topicId == sub.topicId ) ) {
    visiters.get(req.cookies['tempId']).subscribes.push(sub);
  }
}

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

async function getNotifies(self) {
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

