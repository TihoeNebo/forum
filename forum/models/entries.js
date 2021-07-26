const visiters = require("../controllers/visiters.js");
const userObserver = require("../controllers/userObserver.js");

class EntriesData { 
  constructor (req) {
    this.notifies = visiters.get(req.cookies['tempId']).notifies;
    this.notifiesCount = (visiters.get(req.cookies['tempId']).notifies) ? visiters.get(req.cookies['tempId']).notifies.length : 0; 
    this.unopened =  0;
    this.guests = 0;
    this.isLogin = (visiters.get(req.cookies['tempId']).access > 0);
    this.isMaster = (visiters.get(req.cookies['tempId']).access > 2);
    this.isLord = (visiters.get(req.cookies['tempId']).access > 3);
    this.userProfile = visiters.get(req.cookies['tempId']).profile;
    this.online = visiters.allWhoAlive();
    this.onlineCount = visiters.size;
    this.inbox = Array.from(visiters.get(req.cookies['tempId']).inbox);
    if (visiters.get(req.cookies['tempId']).inbox.length) {
      visiters.get(req.cookies['tempId']).inbox.forEach( (key) => {
        if (!key.ignored) this.unopened +=  + key.newMessages;
      });
    }
    userObserver.isLiveChecking (this.inbox, this.online);
    for (let visiter of visiters.values() ) {
      if (visiter.access == 0) this.guests++;
    }
  }
}

module.exports = EntriesData;