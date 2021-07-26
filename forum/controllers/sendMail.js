const trans = require("./connectMailServer.js");
const crypto = require("crypto");
const salt = 'ghio9jf23v959blljiucds7ettrd6srechg47oouiuk8';
const confirmList = new Map();


console.log("Модуль sendMail.js подключен");

exports.confirmList = confirmList;

exports.sendNotifyLetter = function (mail, {toName, fromId, fromName, fromSex}) {
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

exports.sendRegLetter = function (mail, name) {
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
