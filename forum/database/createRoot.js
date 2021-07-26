const connection = require("./createConnection.js");

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
    mail varchar(40),
    access tinyint unsigned default 1,
    registered datetime not null,
    primary key(userId)) default charset = utf8`).catch( (err) => {console.log(err);});

  connection.query(`create  table if not exists userProfiles (
    userId mediumint unsigned not null,
    userName varchar(40),
    sex tinyint(1) default 0,
    birthday date,
    lastComing datetime,
    banned datetime,
    subscribes mediumtext,
    subMode tinyint(1) default 3,
    primary key(userId)) default charset = utf8`).catch( (err) => {console.log(err);});

  console.log( "Mодуль createRoot.js исполнен");
}

createRoot();