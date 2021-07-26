const visiters = require("./visiters.js");

exports.pulse = async function (req, res) {
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
  })

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
}