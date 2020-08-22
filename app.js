const express = require("express");
const pars = require("body-parser");
const mysql = require("mysql2");
const exphbs = require("express-handlebars");
const hbs= require("hbs");
const cookiePars = require("cookie-parser");

const jpars = pars.json();
const app = express();

let arr = [];
let timerId = 0;
let isUser = false;
const sqldroptable='DROP TABLE IF EXISTS forumlist';

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
                 ceil: function(n) { return Math.ceil(n/11)|| 1;}
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

connection.query(`create  table if not exists preority 
  (forumURN varchar(40) not null, 
  topicId smallint(5) unsigned not null,
  postId mediumint(8) unsigned default 0)`)
  .catch( (err) => {console.log(err);});

createRoot();

console.log('Подключено');

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
    login varchar(22) not null,
    pass varchar(33),
    mail varchar(22),
    access tinyint unsigned default 0,
    ref tinyint unsigned default 0,
    sex tinyint(1) default 0,
    registered datetime not null,
    lastComing datetime,
    primary key(userId)) default charset = utf8`).catch( (err) => {console.log(err);});

  connection.query(`create  table if not exists online (
    userId mediumint unsigned,
    url varchar(150), 
    title varchar(70))`).catch( (err) => {console.log(err);});

}

function Partlist() {
  return 'SELECT * FROM parts';
}

async function getNames(forumURN, topicId) {

  const self = this;

  let sqlForumName = `select forumName from forums where forumURN = "${forumURN}"`;
  let sqlTopicName = (topicId) ? `select forums.forumName, ${forumURN}_topics.theme, ${forumURN}_topics.comment
    from ${forumURN}_topics
    left join forums on ${forumURN}_topics.forumId = forums.forumId
    where ${forumURN}_topics.topicId = ${topicId} ` : false;
  let sqlReq = sqlTopicName || sqlForumName;

  await connection.query(sqlReq)
    .then( ([result, field]) => {return self.arr = result;})
    .catch( (err) => {console.log(err);});
  this.arr[0].topicId = topicId;
  console.log(this.arr);
  return this.arr;
}
let p = 0;
let n = 0;
let visiters = new Object();
//==============USE=====================
app.use(cookiePars());

app.use("/", function(req, res, next) {
  console.log(req.cookies['v']);
  let isVisiter = false;
  for (let key in visiters) {
    if (visiters[key] == req.cookies['v']) {
      isVisiter = true;
    };
    if (visiters[key] === undefined) { visiters[key].delete};
  };
  if (!isVisiter) {
    n = n +1;
    visiters['visitor' + n] = req.cookies['v'];
  };
  console.log(visiters.length);
  if ( !req.cookies['v'] && req.cookies ['isUser'] != 'true' ) {
    p = p +1;
    res.cookie('v', p, {path: '/'});
    next();
  } else next();
});

app.use("/script.js", express.static(__dirname + "/script.js"));

/*app.use("/online", function(req, res) {

  function isHere() {
    console.log("User is out");
    isUser = false;}

  if (!isUser) {
    isUser = true;
    return timerId = setTimeout( isHere, 30000);
  } else { clearTimeout(timerId);
    return timerId = setTimeout( isHere, 30000); };
});*/

//=================GET==================

app.get("/createForum", function (req, res) {
  return connection.query(Partlist(), function (err, result) {
    arr = result;
    return res.render("createForum", {parts: arr});
  });
});

app.get("/:forumURN/createTopic", jpars, function(req, res) {
    return res.render("createTopic");
});

app.get("/:forumURN/:topicId", async function (req, res) {
  const self = this;
  let page = req.query.p - 1 || 0;

  connection.query(`UPDATE ${req.params.forumURN}_topics SET views = views + 1 WHERE topicId = ${req.params.topicId}`).catch( err => {console.log(err);});
  await connection.query(`SELECT postId from ${req.params.forumURN}_posts where topicId = ?`, [req.params.topicId])
    .then( ([postSum, fields]) => {     
      if (Math.ceil(postSum.length/11) - 1 < page) page =  Math.ceil(postSum.length/11) - 1;
      return self.postSum = postSum;})
    .catch( (err) => {return res.send('empty');});

  await connection.query(`SELECT * FROM ${req.params.forumURN}_posts WHERE topicId =  ${req.params.topicId} limit ${page *11}, 11`)
   .then( ([result, fi]) => {
        if( self.postSum[0].postId == result[0].postId ) result[0].firstPost = true;
        return self.result = result;})
   .catch( (err) => {console.log(err);});

  let names = await getNames(req.params.forumURN, req.params.topicId);

  res.render("poster", { 
                                       messages: self.result,
                                       pages: getPages(+self.postSum.length, +req.query.p, req.params.forumURN, req.params.topicId),
                                       params: req.params,
                                       names: names[0]
                                    });
});

app.get("/:forumURN", async function (req, res) {

  const self = this;
  let page = req.query.p - 1 || 0;
  let sqlreq = 'SELECT '+req.params.forumURN+'_topics.*, COUNT(ALL '+req.params.forumURN+
    '_posts.topicId) AS sumPosts, MAX('+req.params.forumURN+
    '_posts.postId) AS lastPostId, forums.forumURN, MAX('+req.params.forumURN+
    '_posts.postDate) AS postDate FROM '+req.params.forumURN+
    '_topics left JOIN '+req.params.forumURN+'_posts ON '+req.params.forumURN+
    '_posts.topicId = '+req.params.forumURN+'_topics.topicId JOIN forums ON '+req.params.forumURN+
    '_topics.forumId = forums.forumId GROUP BY '+req.params.forumURN+
    '_topics.topicId ORDER BY lastPostId DESC ' +
    'limit ' + (page *11) + ', 11';
  
  await connection.query(`SELECT topicId FROM ${req.params.forumURN}_topics`)
    .then( ([topicSum]) => {
      if (Math.ceil(topicSum.length/11) - 1 < page) page =  Math.ceil(topicSum.length/11) - 1;
      return self.topicSum = topicSum; })
    .catch((err) =>{return res.send('empty')});

  await connection.query(sqlreq)
    .then( ([result]) => { return self.result = result;})
    .catch((err) => {console.log(err);});

  let names = await getNames(req.params.forumURN);
  let exist = (!!self.result.length);
  console.log(exist);
  return res.render("topiclist", { 
                                     topics: self.result,
                                     exist: exist,
                                     pages: getPages(+self.topicSum.length, +req.query.p, req.params.forumURN),
                                     names: names[0],
                                     forumId: self.result[0].forumId,
                                     forumURN: self.result[0].forumURN
                                    });
});

app.get("/", async function (req, res) {

  const joinTable = `select forums.forumName, forums.forumURN, parts.partName, parts.partId, 
    forumlist.forumId, forumlist.topicId, forumlist.sumPosts as lastPage, sum(forumlist.sumTopics) as sumTopics, 
    sum(forumlist.sumPosts) as sumPosts, forumlist.lastPostId, forumlist.lastPostDate 
    from forumlist 
    right join forums on forums.forumId = forumlist.forumId 
    left join parts on parts.partId = forums.partId
    group by forums.forumId 
    order by parts.partId`; 
 
  let tempTable = 'create temporary table if not exists forumlist ';
  let arr = [];

  await connection.query('select forumURN from forums')
    .then( ([forums]) => {return arr = forums;} )
    .catch( (err) =>{console.log(err);});
  console.log(arr);
  function select(name) {
    return `select ${name}_topics.forumId,  
      ${name}_topics.topicId, count(distinct ${name}_topics.topicId) as sumTopics,
      count( ${name}_posts.postId) as sumPosts, 
      max( ${name}_posts.postId) as lastPostId, max( ${name}_posts.postDate) as lastPostDate 
      from ${name}_topics
      left join ${name}_posts on ${name}_posts.topicId = ${name}_topics.topicId 
      group by ${name}_topics.topicId `; 
  }
  if (arr.length == 1) {
  tempTable += select(arr[0].forumURN);
  tempTable += 'order by lastPostId desc';};

  if (arr.length > 1) {
    for ( let i = 1; i < arr.length; i++) {
      tempTable += 'union (' + select(arr[i].forumURN) + ') ';
    }; 
    tempTable += 'order by lastPostId desc';
  };


  await connection.query( tempTable).catch( (err) => {console.log(err);});
  await connection.query( joinTable)
    .then( ([result]) => {return this.result = result})
    .catch( (err) => {console.log(err);});
  return res.render("forumlist", { 
                                         forums: result
                                     });
});

//==================POST=====================

app.post("/createForum", jpars, async function (req, res) {
  let forumData = req.body.forumData;
console.log(forumData);
  let topicName = req.body.topicName;
  let topicComment = req.body.topicComment;
  let firstPost = req.body.firstPost;
  
  console.log(topicName, topicComment, firstPost);

  let sqlNewTopic = `insert into ${forumData.forumURN}_topics(theme, comment, userId, essential) values( '${topicName}', '${topicComment}', 0, 1)`;
  let sqlNewPost = `insert into ${forumData.forumURN}_posts(topicId, content, userId, postDate, essential) values( 1, '${firstPost}', 0, NOW(), 1)`; 
 
   if (req.body.isNewPart) {
      
    
    for(let i = 0; i < arr.length; i++) {
      if (arr[i].partName == forumData.partName) {
        return res.json('такой раздел уже есть');
      };
    }; 
    
    await connection.query('insert into parts(partName) values(?)', forumData.partName).catch( (err) => {console.log(err);});
  }; 

  await addForum();
  connection.query(sqldroptable).catch( (err) => {console.log(err);});
  return res.json(req.body);

  async function addForum () {
    const self = this;

    await connection.query('select partId from parts where partName = ? ', forumData.partName)
      .then( ([part, fi]) =>{
        return self.part = part;})
      .catch( (err) => {console.log(err);});

    let data = [ self.part[0].partId, forumData.forumURN, forumData.forumName];

    await connection.query('insert into forums(partId, forumURN, forumName) values( ?, ?, ?)', data).catch( (err) => {console.log(err);});
    await connection.query('select forumId from forums where forumURN = ?', forumData.forumURN)
      .then( ([forum, fi]) => {
        return self.forum = forum;})
      .catch( (err) => {console.log(err);});

    await createTables(forumData.forumURN, self.forum[0].forumId);
  }
  
  async function createTables(name, id) {
    let sqlcreatetopics = 'create table if not exists ' + name + '_topics (' +
      'topicId smallint unsigned auto_increment primary key, ' +
      'forumId tinyint unsigned not null default '  + id +
      ', theme varchar(70) not null, ' +
      'comment varchar(70), ' +
      'userId mediumint unsigned not null, ' +
      'views int unsigned default 0, ' +
      'essential tinyint(1) default 0, ' +
      'foreign key (forumId) references forums (forumId) on delete cascade) default charset = utf8';

    let sqlcreateposts = 'create table if not exists ' + name +'_posts (' +
      'postId mediumint unsigned auto_increment primary key, ' +
      'topicId smallint unsigned not null, ' +
      'userId mediumint unsigned not null, ' +
      'content mediumtext not null, ' +
      'postDate datetime not null, ' +
      'essential tinyint(1) default 0, ' +
      'foreign key (topicId) references ' + name + '_topics (topicId) on delete cascade) default charset = utf8';
    
    await connection.query(sqlcreatetopics).catch( (err) => {console.log(err);});
    await connection.query(sqlcreateposts).catch( (err) => {console.log(err);});
    await connection.query(sqlNewTopic).catch( (err) => {console.log(err);});
    await connection.query(sqlNewPost).catch( (err) => {console.log(err);});
  }
});

app.post("/:forumURN/createTopic", jpars, async function(req, res) {
    connection.query(sqldroptable).catch( (err) => {console.log(err);});
    let inp = Object.values(req.body.topic);
    await connection.query(`INSERT INTO ${req.params.forumURN}_topics(theme, comment, userId) VALUES(?, ?, ?)`, inp)
      .catch( (err) => {console.log(err);});
    await connection.query(`INSERT INTO ${req.params.forumURN}_posts(content, userId, topicId, postDate, essential) VALUES(?, ?, last_insert_id(), NOW(), 1)`, [req.body.firstPost, req.body.topic.userId])
      .catch( (err) => {console.log(err);});
    return res.json(req.body);
});


app.post("/:forumId/createPost", jpars, async function(req, res) {
  let inp = Object.values(req.body);
  let postId = 0;
  let sqlPostId = `select postId from ${req.params.forumId}_posts where content = '${inp[0]}'`;

  connection.query(sqldroptable).catch( (err) => {console.log(err);});

  await connection.query(`INSERT INTO ${req.params.forumId}_posts(content, userId, topicId, postDate) VALUES(?, ?, ?, NOW())`, inp)
    .catch( (err) => {console.log(err);});
  await connection.query(sqlPostId)
    .then( ([newId]) => {return postId = newId[0].postId})
    .catch( (err) => {console.log(err);});
  return res.json({postId: postId}); 
});

//====================PUT===========================

app.put("/:forumURN/updatePost", jpars, function(req, res) {

  let sqlUpdatePost = 'update ' + req.params.forumURN + '_posts set content = "' +
    req.body.content + '" where postId = ' + req.body.postId;
  return connection.query(sqlUpdatePost, (err, result) => {
    console.log(err);
    return res.json(req.body.content);
  });
});

app.put("/:forumURN/updateTopic", jpars, function(req, res) {
  console.log(req.params.forumURN);
  let sqlUpdateTopic = "update " + req.params.forumURN + "_topics set theme = '" +
    req.body.theme + "', comment = '" + req.body.comment + "' where topicId = " + req.body.topicId;
  return connection.query(sqlUpdateTopic, (err, result) => {
    console.log(err);
    return res.json(req.body);
  });
});

app.put("/updatePart", jpars, function(req, res) {
  let sqlUpdatePart = "update parts set partName = '" + req.body.partName + "' where partId = " + req.body.partId;

  return connection.query(sqlUpdatePart, (err, result) => {
    console.log(err);
    return res.json(req.body);
  });
});

app.put("/updateForum", jpars, async function(req, res) {
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

app.delete("/:forumURN/:topicId/deletePosts", jpars, async function (req, res) {
  let sqlDeletePosts = `delete from ${req.params.forumURN}_posts where postId = ${req.body[0]}`;
  console.log(req.body.length);
  if (req.body.length > 1) {
    for(let i = 1; i < req.body.length; i++) {
      sqlDeletePosts += ` or postId = ${req.body[i]}`;
    };
  };
  await connection.query(sqlDeletePosts).catch( (err) =>{console.log(err)});
});

app.delete("/:forumURN/deleteTopics", jpars, async function (req, res) {
  console.log(req.body.length);
  let sqlDeleteTopics =`delete from ${req.params.forumURN}_topics where topicId=${req.body[0]}`;
  if (req.body.length > 1) {
    for(let i = 1; i < req.body.length; i++) {
      sqlDeleteTopics += ` or topicId=${req.body[i]}`;
    };
  };
  await connection.query(sqlDeleteTopics).catch( (err) =>{console.log(err)});
  await connection.query(sqldroptable).catch( (err) =>{console.log(err)});
});

app.listen(3000);

function dislocateParts (context, options) {
  let previousPart = 0;
  let matrix = "";
  for (let i = 0; i< context.length; i++) {
    if (context[i].partId != previousPart) {
      if (previousPart != 0) matrix += "</table></div>";
      matrix += "<div class='part' > Раздел: <div class='partName' id = '" + context[i].partId + 
        "'><h3 class='partTitle'>" + context[i].partName + 
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