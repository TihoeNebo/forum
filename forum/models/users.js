const Emitter = require("events");
const connection = require("../database/createConnection.js");
const visiters = require("../controllers/visiters.js");
const emitter = require("../controllers/commonEmitters.js");
const userObserver = require("../controllers/userObserver.js");
const moderation = require("../controllers/moderation.js");
const bannedUsers = moderation.bannedUsers;

console.log( "Подключен модуль users.js");

class User extends Emitter {
  constructor (id, { userId = '',  mail = '', pass = '', access = 0}){
    super();
    this.visiterId = id;
    this.userId = userId;
    this.pass = pass;
    this.access = access;
    this.mail = mail;
    this.profile = {};
    this.drop ={};
    this.inbox = [];
    this.confirmOnline = ( ) => {
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
          connection.query(`update userProfiles set lastComing = '${date}', subscribes = '${subscribes}' where userId = ${this.userId}`).catch( err => {console.log(err);});
          userObserver.updateInbox (this.inbox, this.userId);
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
          userObserver.getNotifies(this);
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
module.exports = User;


