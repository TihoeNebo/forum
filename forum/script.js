
const path = [].splice.call( document.location.pathname.split('/'), 1);
const ajax = new XMLHttpRequest();
const menu = document.createElement('div');
menu.id = 'editMenu';
//alert(document.cookie);
let setBan = new SetBanned();
let banned;
let isOpened = false;
let openedPMs = [];
//localStorage.clear();
checkTopics();

if (document.forms.mail)  document.forms.mail.elements.newAdress.value = localStorage.getItem('mail');

if (document.getElementById('banTimer') ) {
  let period = new Date(document.getElementById('banTimer').dataset.banperiod);
  banned = new BanTimer(period.getTime());
  banned.start();
}

//====cookies===
let cookieArray= document.cookie.split('; ');
const cookies = {};
cookieArray.forEach( (elem) => {
                                                              elem = elem.split('='); 
                                                              cookies[elem[0]] = elem[1];
                                                            });

//==============================
//=======SSE====================
let source = new EventSource('/pulse');

source.addEventListener( 'newPost', (e) => {
  let data = JSON.parse(e.data);
  let notifies = document.getElementById('notifies');
  let notifiesList = document.getElementById('notifiesList'); 
  let notify = `<div class = 'notify' onclick='window.location.replace("/${data.forumURN}/${data.topicId}")'>В теме <a href='/${data.forumURN}/${data.topicId}'>${data.theme}</a> появилось новое сообщение!</div>`; 
  notifies.getElementsByTagName('span')[0].textContent = ++notifies.getElementsByTagName('span')[0].textContent;  
  notifiesList.insertAdjacentHTML('beforeEnd', notify);
});

source.addEventListener( 'newPM', (e) => {
  let data = JSON.parse(e.data);
  let inbox = document.getElementById('inbox');
  let inboxlist = Array.from(document.getElementById('inboxlist').children);
  let isExist = false;
  inboxlist.forEach( (key) => {
    if ( +key.dataset.userid == +data.fromId) { 
      key.getElementsByTagName('span')[0].textContent = ++key.getElementsByTagName('span')[0].textContent;
      isExist = true;
      if ( key.contains( document.getElementById('messager') ) ) reloadPMstream (key.dataset.userid);
    }
  })
  if (!isExist) document.getElementById('inboxlist').insertAdjacentHTML('afterBegin', `<div  class = 'session' data-userid='${data.fromId}' data-username='${data.fromName}'>${data.fromName}(<span>1</span>)<br>on-line</div>`)
  inbox.getElementsByTagName('span')[0].textContent = ++inbox.getElementsByTagName('span')[0].textContent;  
});

source.addEventListener( 'readedPM', (e) => {
  let messager = document.getElementById('messager');
  if (!messager ) return;
  let data = JSON.parse(e.data);
  if (+messager.parentElement.dataset.userid == +data.fromId) {
    let messages = Array.from(document.getElementById('PMstream').children);
    let readedPM = messages.find( item => item.dataset.pmid == data.pmId);
    readedPM.classList.remove('new');
  }
});

source.addEventListener( 'logout', (e) => {
  let data = JSON.parse(e.data);
  let users = Array.from( document.getElementsByTagName('footer')[0].children);
  document.getElementsByTagName('footer')[0].removeChild ( users.find( item => item.dataset.userid == data.userId) );

  let sessions = Array.from( document.getElementById('inboxlist').children);
  let session = sessions.find( item => item.dataset.userid == data.userId );
  if (session) session.getElementsByTagName('span')[1].textContent = data.lastComing;
});

source.addEventListener( 'login', (e) => {
  let data = JSON.parse(e.data);
  let users = Array.from( document.getElementsByTagName('footer')[0].children);
  if ( !users.find( item => item.dataset.userid == data.userId) ) {
    let userLink = document.createElement('a');
    userLink.href = `/profile/${data.userId}`;
    userLink.textContent = data.userName;
    userLink.dataset.userid = data.userId;
    document.getElementsByTagName('footer')[0].appendChild (  userLink );
  }
  
  let sessions = Array.from( document.getElementById('inboxlist').children);
  let session = sessions.find( item => item.dataset.userid == data.userId );
  if (session) session.getElementsByTagName('span')[1].textContent = 'on-line';  
});

source.addEventListener( 'ban', (e) => {
  let data = JSON.parse(e.data);
  document.getElementsByTagName('header')[0].insertAdjacentHTML('beforeEnd', `<div id = 'banTimer'></div>`);
  banned = new BanTimer(data.period);
  banned.start();

});

source.addEventListener( 'disban', (e) => {
  banned.stop();
  document.getElementsByTagName('header')[0].removeChild(document.getElementById('banTimer') );
});

//=============================================
async function authentificate(target) {
  if (!isOpened && target.id == 'register'){
    let {regList} = await import( '/regList.js');
    let {selectBirthDay} = await import( '/regList.js'); 

    target.insertAdjacentHTML('beforeEnd', regList);
    selectBirthDay();
    isOpened = true;
  }
  if (!isOpened && target.id == 'login'){
    let {loginList} = await import( '/regList.js');
      
    target.insertAdjacentHTML('beforeEnd', loginList);
    document.forms.redactor.elements.userName.value = localStorage.getItem('mail') || 'электронная почта';
    document.forms.redactor.elements.password.value = localStorage.getItem('pass') || 'пароль';
    isOpened = true;
  }
}

function hideElems (parent) {
  isOpened = !isOpened;
  for(let elem of parent.children) {
    elem.hidden = !elem.hidden;
  };
}

function setMenu(code, isDelitable = 0, isClosed = 0) {
  let del = (isDelitable) ? "<div id = 'delete'>Удалить</div>": "";
  let close = (isClosed) ? "<div id = 'openTopic'>Открыть тему</div>" : "<div id = 'closeTopic'>Закрыть тему</div>";
  let move = (isDelitable) ? "<div id='moveTopic'>Переместить</div>": "";  
  const buttons = { 
    edit: "<div id = 'edit'>Редактировать</div>",
    del: del,
    close: close,
    move: move,
    title: "Название: <input type = 'text' name = 'title'><br />",
    comment: "Описание: <input type = 'text' name = 'comment'><br />",
    URN: "URN форума: <input type = 'text' name = 'forumURN'>",
    content: "<textarea name = 'content'></textarea>",
    cancel: "<div id = 'cancel'>Отмена</div>",
    save: "<div id = 'save'>Сохранить</div>" 
  };
  let deleted = (code == 256) ? true : false;
  let menuElems = '';
  let inForm = false;
  let arr = Object.values(buttons);
  code = code.toString(2).split('').reverse();

  for(let i = 0; i < code.length; i++) {
    if(code[i] == 0) continue;
    if (i > 3 && !inForm) {
      menuElems += "<form name = 'redactor'>";
      inForm = true;
    };
    menuElems += arr[i];   
  };
  if (inForm) {
   menuElems += "</form>";
   isOpened = true;
  };
      
  menu.hidden = false;
  menu.innerHTML = menuElems;
  if (deleted) {
    isOpened = false;
    document.getElementById('cancel').textContent = 'Восстановить';
  };
  return menu;                  
}

function sortParentTree(target) {
  re: while (target != document.body) {
  if (target == null) return;
  if ( target.hasAttribute('class') ) {
      let className = target.className.split(' ');
      let lastName = className[className.length - 1];
      switch ( lastName ) {
        case 'topicTitle':
        case 'topic':
        case 'post':
        case 'deleted':
        case 'forumName':
        case 'partName':
          break re;
      }
    };
    target = target.parentElement;
  }; 
  return target;
}   

//========MOUSEOVER============

document.onmouseover = (e) => {
  if (isOpened) return;

  let index = 0;
  let target = sortParentTree(e.target);
  if (!target) return;
  target.onmouseout = (e) => {
    
    if (!isOpened)  menu.hidden = true;
  };
  if (!target.dataset.redactable) return;

  let className = target.className.split(' ');
  let lastName = className[className.length - 1];

  switch ( lastName ) {
    case 'topicTitle':
      index = 1;
      break; 
    case 'topic':
      index = 15;
      break; 
    case 'post':
    case 'forumName':
      index = 3;
      break; 
    case 'partName':
      index = 1;
      break;
    case 'deleted':
      index = 256;
  }
  target.appendChild(setMenu(index, target.dataset.deletable, target.dataset.closed));
};

//=============CLICK===============

document.onclick = async (e) => {

  let target = e.target;
  let settedButton = '';

  if (target.id == 'register') authentificate(target);
  if (target.id == 'login') authentificate(target);
  if (target.id == 'logout') {
    source.close(); 
    window.location.replace('/logout');
  }

  if (target.classList.contains('options') ){
    switch(target.id){
     case 'account':
       let {getAccountOptions} = await import('/optionsList.js');
       getAccountOptions(e);
       break;
     case 'profile':
       let {getProfileOptions} = await import('/optionsList.js');
       getProfileOptions(e);
       break;
     case 'subscribes':
       let {getSubscribeOptions} = await import('/optionsList.js');
       await getSubscribeOptions(e);
       break;
     case 'blackList':
       let {getBlackListOptions} = await import('/optionsList.js');
       await getBlackListOptions();
       break;
    }
  }

  if (target.classList.contains('changePeriod') ){
    switch(target.dataset.time) {
      case 'mins':
        setBan.Mins();
        break;
      case 'hour':
        setBan.Hour();
        break;
      case 'day':
        setBan.Day();
        break;
      case 'month':
        setBan.Month();
        break;
    }
  }

  if (target.id == 'moderating') {
    ajax.open('GET', `/moderate?userId=${target.dataset.userid}&rights=${target.dataset.moderights}`);
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send();
    ajax.onload = ()=>{window.location.reload()};  
  }

  if (target.id == 'deleteUser') {
    ajax.open('DELETE', `/deleteUser?userId=${target.dataset.userid}`);
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send();
    ajax.onload = ()=>{window.location.reload()};  
  }

  if (target.id == 'sendBan') {
    setBan.sendBan(target); 
    this.parentElement.parentElement.parentElement.removeChild(document.forms.banForm);
  }

  if ( target.classList.contains('disban') ) {

    ajax.open('GET', `/reabilitate?userId=${target.parentElement.dataset.userid}`);
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send();
    ajax.onload = ()=>{window.location.reload()};

  }

  if (target.classList.contains('session') && !isOpened) {
    isOpened = true;
    let userId = target.dataset.userid;
    let userName = target.dataset.username;
    let userStatus = target.dataset.userstatus;
    let form = `<div id = 'messager'>
                          <a id='close'>[x]</a></br>
                          <form name='redactor'>
                            <div class='userBoard' data-userid='${userId}' data-username='${userName}'> 
                              <a href='/profile/${userId}'><input type='button' value = 'профиль'/></a> 
                              <input type='button' id = 'ignore' value = 'игнорировать'/>
                            </div>
                            <div id='PMstream'>
                            </div>Сообщение для ${userName}:<br>
                            <textarea name = 'PMessage'>Привет!</textarea>
                            <input type ='button' id='sendPM' value = 'Отправить' data-userId = '${userId}'  data-username = '${userName}' data-userstatus = '${userStatus}' data-ismessager = '1' >
                          </form>
                        </div>`;
    target.insertAdjacentHTML('beforeEnd', form);
    reloadPMstream (userId);

    document.getElementById('messager').onmouseover = (e) => {

      let target = e.target.closest('.new');
      if (target == null || !target.classList.contains('from')) return;
      ajax.open('POST', `/getSession?id=${userId}&readed=${target.dataset.pmid}`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send(); 
      target.classList.remove('new');
      let newPMs = document.getElementById('messager').parentElement.getElementsByTagName('span')[0];
      newPMs.textContent = +newPMs.textContent - 1;
      let newAllPMs = document.getElementById('inbox').getElementsByTagName('span')[0];
      newAllPMs.textContent = +newAllPMs.textContent - 1;        
    }
  };

  if (target.classList.contains('pm') && !isOpened) {
    let userId = target.parentElement.dataset.userid;
    let userName = target.parentElement.dataset.username;
    let userStatus = target.parentElement.dataset.userstatus;
    let form = `<form name='redactor'><a id='close'>[x]</a></br>Сообщение для ${userName}:<br>
                          <textarea name = 'PMessage'>Привет!</textarea>
                          <input type ='button' id='sendPM' value = 'Отправить' data-userId = '${userId}' data-username = '${userName}' data-userstatus = '${userStatus}'>
                        </form>`;
    target.parentElement.insertAdjacentHTML('beforeEnd', form);
    isOpened = !isOpened;
  };

  if (target.id == 'sendPM') {
    let userId = target.dataset.userid;
    let userName = target.dataset.username;
    let userStatus = target.dataset.userstatus;
    let pm = document.forms.redactor.elements.PMessage.value;
    let message = JSON.stringify({to: userId, toName: userName, toStatus: userStatus, pm: pm});
    ajax.open('POST', '/sendPM');
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send(message);

    ajax.onload = ()=> {

      if (target.dataset.ismessager) {
       reloadPMstream (userId);
      } else {
        target.parentElement.parentElement.removeChild(document.forms.redactor);
        isOpened = !isOpened;
        let inboxlist = Array.from(document.getElementById('inboxlist').children);  
        let session = inboxlist.find( item => item.dataset.userid == userId);
        if (!session ) document.getElementById('inboxlist').insertAdjacentHTML('afterBegin', `<div  class = 'session' data-userid='${userId}' data-username='${userName}'>${userName}(<span>0</span>)<br>${userStatus}</div>`)      
      }
    }
  };

  if (target.id == 'inbox') {
    document.getElementById('inboxlist').hidden = !document.getElementById('inboxlist').hidden;
  };

  if (target.id == 'ignore') {
    let userId = target.parentElement.dataset.userid;
    ajax.open('POST', `/sendPM?ignore=${userId}`);
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send();
    ajax.onload = () => {
      let unreaded = +document.getElementById('messager').parentElement.getElementsByTagName('span')[0].textContent;
      document.getElementById('inboxlist').removeChild(document.getElementById('messager').parentElement);
      let allUnreaded = document.getElementById('inbox').getElementsByTagName('span')[0]; 
      allUnreaded.textContent = +allUnreaded.textContent - unreaded;
    };
  };

  if (target.id == 'subscribe' || target.id == 'discribe') {
    let theme = document.getElementsByClassName('theme')[0].textContent;
    let comment = document.getElementsByClassName('comment')[0].textContent;
    let message = JSON.stringify( {
                                                             forumURN: path[0],
                                                             topicId: path[1],
                                                             theme: theme,
                                                             comment: comment
                                                        } );
    ajax.open('POST', `/subscribe`);
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send(message);
    ajax.onload = () => {
      target.id = ( target.id == 'subscribe') ? 'discribe' : 'subscribe';
      target.value = (target.value == 'Подписаться') ? 'Отписаться' : 'Подписаться';
    };
  };

  if (target.id == 'addForum') {
    const createForum = document.forms.createForum;
    let isNewPart = false;
    let partName = '';
    let parts = createForum.elements.parts.value;
    let addPart = createForum.elements.addPart.value;
    let forumURN = createForum.elements.forumURN.value;
    let forumName = createForum.elements.forumName.value;
    let partMethod = createForum.elements.partMethod;

    let topicName = createForum.elements.theme.value;
    let topicComment = createForum.elements.comment.value;
    let firstPost = createForum.elements.firstPost.value;
    

    switch(partMethod.value) {
      case 'selectPart':
        partName = parts;
        break;
      case 'addPart':
        partName = addPart;
        isNewPart = true;
    };

    if (!partName || !forumURN || !forumName || !topicName || !firstPost) {
      return alert('Не заполнено поле');
    };
  
    let newForum = JSON.stringify({
                                           isNewPart: isNewPart,
                                           topicName: topicName,
                                           topicComment: topicComment,
                                           firstPost: firstPost,
                                           forumData: {
                                             partName: partName,
                                             forumURN: forumURN,
                                             forumName: forumName
                                           }
                               });

    ajax.open('POST', '/createForum');
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send(newForum);

    ajax.onload = ()=> {
      window.location.replace('/' + forumURN);
    };
  };

  if (target.id == "createTopic"){
    const topicer = document.forms.topicForm;
    let firstPost = topicer.elements.firstPost.value;
    let theme = topicer.elements.theme.value;
    let comment = topicer.elements.comment.value;
    let arr = trans(firstPost);
    let topic = JSON.stringify({  
                                                       topic: {
                                                                 theme: theme,
                                                           comment: comment,
                                                              },
                                                   firstPost:  arr
                                                  });
    ajax.open('POST', '/'+ path[0]+'/createTopic');
    ajax.setRequestHeader("Content-type", "application/json");
    ajax.send(topic);
  
    ajax.onload = () => {
      window.location.replace('/' + path[0]);
    };
  };

  if (target.id == 'getTopicForm'){
    window.location.replace('/' + path[0] + '/createTopic');
  };

  if (e.target.id == 'openTopic' || e.target.id == 'closeTopic') {    
    let close = +(e.target.id == 'closeTopic');
    let target = sortParentTree(e.target);
    let topicId = target.parentElement.id;

    ajax.open('PUT', '/' + path[0] + '/' + topicId + '?close=' + close);
    ajax.send();
    ajax.onload = ()=> {window.location.reload();};
    }
//........................................SAVE.................................................

  if (e.target.id == 'save') {
    let target = sortParentTree(e.target);
    if ( target == document.body ) return;

    if (target.classList.contains('topic')) {
      let theme = document.forms.redactor.elements.title.value;
      let comment = document.forms.redactor.elements.comment.value;
      let message = JSON.stringify({
                                                           topicId: target.parentElement.id,
                                                             theme: trans(theme),
                                                       comment: trans(comment)
                                                        });
      ajax.open('PUT', '/' + path[0] + '/updateTopic')
      ajax.setRequestHeader('Content-Type', 'application/json');
      ajax.send(message);
      
      ajax.onload = () => {
        target.getElementsByClassName('theme')[0].textContent = theme;
        target.getElementsByClassName('comment')[0].textContent = comment;     
        hideElems(target);
        menu.innerHTML = '';
        return;
      };
    };
  
    if (target.classList.contains('post')) {

      let content = document.forms.redactor.elements.content.value;
      let message = '';
      if (target.classList.contains('essential')) {
        let theme = document.forms.redactor.elements.title.value;
        let comment = document.forms.redactor.elements.comment.value;
        message = JSON.stringify({
                                                         topicId: document.getElementsByClassName('topicTitle')[0].id,
                                                           theme: theme,
                                                     comment: comment,
                                                           postId: target.id,
                                                         content: trans(content)
                                                        });
      } else {
        message = JSON.stringify({
                                                           postId: target.id,
                                                         content: trans(content)
                                                        });
      }

      ajax.open('PUT', '/' + path[0] + '/updatePost')
      ajax.setRequestHeader('Content-Type', 'application/json');
      ajax.send(message);

      ajax.onload = () => {
        target.getElementsByClassName('content')[0].innerHTML = trans(content);
        hideElems(target);
        menu.innerHTML = '';
        window.location.reload();
      };
    };
    if (target.classList.contains('partName')) {
      let title = document.forms.redactor.elements.title.value;
      let message = JSON.stringify({
                                                           partId: target.id,
                                                         partName: trans(title)
                                                        });

      ajax.open('PUT', '/updatePart')
      ajax.setRequestHeader('Content-Type', 'application/json');
      ajax.send(message);

      ajax.onload = () => {
        target.getElementsByClassName('partTitle')[0].innerHTML = trans(title);
        hideElems(target);
        menu.innerHTML = '';
        return;
      };
    };
    if (target.classList.contains('forumName')) {
      let title = document.forms.redactor.elements.title.value;
      let newURN = document.forms.redactor.elements.forumURN.value;
      if (newURN == target.dataset.urn || newURN == '') newURN = false;
      let message = JSON.stringify({
                                                           forumId: target.id,
                                                    forumName: trans(title),
                                                          newURN: newURN,
                                                            oldURN: target.dataset.urn
                                                        });

      ajax.open('PUT', '/updateForum')
      ajax.setRequestHeader('Content-Type', 'application/json');
      ajax.send(message);

      ajax.onload = () => {
        
        if (newURN != false) {
          if (path[0] != '') window.location.replace('/' + newURN);
          else window.location.reload(true);
        };
        target.getElementsByClassName('forumTitle')[0].innerHTML = trans(title);
        hideElems(target);
        menu.innerHTML = '';
        return;
      };
    };
  };
  if ( e.target.id == 'cancel' ) {
    isOpened = true;
    let target = e.target;
    while (target != document.body) {
      if ( target.id == 'editMenu' || target.id == 'regList') break;
      target = target.parentElement;
    }; 
    if (target == document.body) return;
    hideElems(target.parentElement);

    if ( target.parentElement.classList.contains('post') ) {

      let message = JSON.stringify({id: target.parentElement.id} );
      ajax.open('DELETE', '/' +path[0] + '/deletePosts');
      ajax.setRequestHeader("Content-Type", "application/json");
      ajax.send(message);
      ajax.onload = ()=> {
        target.parentElement.classList.remove('deleted');
        target.parentElement.removeChild( target.parentElement.getElementsByClassName('excluded')[0] );
        target.innerHTML = '';
      }
    }
      
    if ( target.parentElement.classList.contains('topic') ) {

      let message = JSON.stringify({id: target.parentElement.id} );
      ajax.open('DELETE', '/' +path[0] + '/deleteTopics');
      ajax.setRequestHeader("Content-Type", "application/json");
      ajax.send(message);
      ajax.onload = ()=> {
        target.parentElement.classList.remove('deleted');
        target.parentElement.removeChild( target.parentElement.getElementsByClassName('excluded')[0] );
        target.innerHTML = '';
      }
    }
    return;
    
  };

  if (e.target.id == 'moveTopic') {
    isOpened = !isOpened;
    target = e.target.parentElement;
    target.innerHTML = "<form name='redactor'><select name='forums'></select><input type='button' id = 'changeForum' value='Переместить' /></form>";

    ajax.open('PUT', '/'+ path[0]+'/changeForum')
    ajax.setRequestHeader('Content-Type', 'application/json');
    ajax.send();
    ajax.onload = ()=> {
      let list = ajax.response;
      document.forms.redactor.elements.forums.innerHTML = list;
    }     
  }

  if (e.target.id == 'changeForum') {
    let chosenURN = document.forms.redactor.elements.forums.value;
    let target = sortParentTree(e.target);
    let topicId = target.parentElement.id; 
    if (chosenURN == path[0]) return isOpened = !isOpened;
    ajax.open('PUT', '/'+ path[0]+'/changeForum?topicId=' + topicId +'&chosenURN=' + chosenURN)
    ajax.setRequestHeader('Content-Type', 'application/json');
    ajax.send();
    ajax.onload = ()=> {
      let message = JSON.stringify({id: topicId});
      ajax.open('DELETE', '/' +path[0] + '/deleteTopics');
      ajax.setRequestHeader("Content-Type", "application/json");
      ajax.send(message);
      ajax.onload = ()=> {
        window.location.reload();
      }
    }
  }

  if (e.target.id == 'addUser') {
    let elems = document.forms.redactor.elements;
    let user = elems.userName.value;
    let password = elems.password.value;
    let mail = elems.mail.value;
    let sex = elems.sex.value;
    let year = +elems.Year.value;
    let month = +elems.Month.value;
    let day = +elems.Day.value;
    let notSelected = elems.notSelected.checked;

    let birthday = (notSelected) ? null : `${year}-${month + 1}-${day}`;
    
    let message = JSON.stringify({login: user,
                                                            mail: mail,
                                                            pass: password,
                                                              sex: sex,
                                                     birthday: birthday});


      ajax.open('POST', '/register')
      ajax.setRequestHeader('Content-Type', 'application/json');
      ajax.send(message);
      ajax.onload = ()=> {
        if (ajax.status != 200) return alert('Извините, такой адрес уже занят.');
        alert('Вам было отправлено письмо.');
        window.location.reload();
      };

  }
  if (e.target.id == 'checkUser') {
    let user = document.forms.redactor.elements.userName.value;
    let password = document.forms.redactor.elements.password.value;
    let rememberMe = (document.forms.redactor.elements.rememberMe.checked) ? 1: 0;
    let message = JSON.stringify({mail: user,
                                                            pass: password,
                                                            rememberMe: rememberMe});

    ajax.open('POST', '/login')
    ajax.setRequestHeader('Content-Type', 'application/json');
    ajax.send(message);
    ajax.onload = ()=> {
      if (ajax.status != 200) return alert('Неверный адрес или пароль.');
      localStorage.setItem('mail', user);
      localStorage.setItem('pass', password);
      window.location.reload();
    };
  }

  if (e.target.id == 'sendRegLetter') {
    let message = JSON.stringify({mail: document.forms.mail.elements.newAdress.value});
      ajax.open('POST', '/sendRegLetter')
      ajax.setRequestHeader('Content-Type', 'application/json');
      ajax.send(message);
      ajax.onload = ()=> { alert('Вам выслано письмо.');}
  }

  if (target.id == 'close') {
    if (target.parentElement.id == 'messager') target.parentElement.parentElement.removeChild(document.getElementById('messager'));
    else target.parentElement.parentElement.removeChild(document.forms.redactor);
    isOpened = false;
  }

  if (isOpened) return;

//=========================================

  if (e.target.id == 'edit') {
    let target = sortParentTree(e.target);
    if ( target == document.body ) return;
    if( target.classList.contains('post') ) {
      let st = '';
      let post = target;
      let con = post.getElementsByClassName('content')[0].childNodes;
      for (let i = 0; i < con.length; i++) {
        if (con[i].nodeName == 'BR') {
          st += '\n';
          continue;
        };
        st += con[i].data;
      };
      hideElems(post);
      if( target.classList.contains('essential') ) {
        post.appendChild(setMenu(944));
        document.forms.redactor.elements.title.value = document.getElementsByClassName('theme')[0].textContent;
        document.forms.redactor.elements.comment.value = document.getElementsByClassName('comment')[0].textContent;
      } else post.appendChild(setMenu(896));
      document.forms.redactor.elements.content.value = st;
    };
    if( target.classList.contains('topic') ) {
      hideElems(target);
      let theme = target.getElementsByClassName('theme')[0].textContent;
      let comment = target.getElementsByClassName('comment')[0].textContent;
      target.appendChild(setMenu(816));
      document.forms.redactor.elements.title.value = theme; 
      document.forms.redactor.elements.comment.value = comment;
    };
    if( target.classList.contains('partName') ) {
      let title = target.getElementsByClassName('partTitle')[0].textContent;
      hideElems(target);
      target.appendChild(setMenu(786));
      document.forms.redactor.elements.title.value = title;       
    }; 
    if( target.classList.contains('forumName') ) {
      hideElems(target);
      let title = target.getElementsByClassName('forumTitle')[0].textContent;
      target.appendChild(setMenu(720));
      document.forms.redactor.elements.title.value = title; 
      document.forms.redactor.elements.forumURN.value = target.dataset.urn;  
    };
  };

  if (e.target.id == 'sendPost'){
    const poster = document.forms.poster;
    const messages = document.getElementById('contents');
    let post = poster.elements.post.value;
    let arr = trans(post);
    let theme = document.getElementsByClassName('theme')[0].textContent;
    let comment = document.getElementsByClassName('comment')[0].textContent;
    let message = JSON.stringify( {
                                                             mess: arr,
                                                             topicId: path[1],
                                                             theme: theme,
                                                             comment: comment
                                                        } );

    ajax.open('POST', '/'+path[0]+'/createPost');
    ajax.setRequestHeader("Content-Type", "application/json");
    ajax.responseType = 'json';
    ajax.send(message);

    ajax.onload = () => {

      window.location.reload();
    }; 
  };



//========DELETE-BUTTON===================

  if (e.target.id == 'delete') {
    let target = sortParentTree(e.target);
    if ( target == document.body ) return;

    if ( target.classList.contains('post') ) {

      let message = JSON.stringify({id: target.id} );

      ajax.open('DELETE', '/' +path[0] + '/deletePosts');
      ajax.setRequestHeader("Content-Type", "application/json");
      ajax.send(message);
      ajax.onload = () => {
        hideElems(target);
        target.classList.add('deleted');
        target.insertAdjacentHTML('beforeEnd', "<p class = 'excluded'>Сообщение удалится после перезагрузки страницы.</p>");     
        isOpened = false;
       };
    };
    if (target.classList.contains('topic') ) {
      
      let message = JSON.stringify({id: target.parentElement.id});
      ajax.open('DELETE', '/' +path[0] + '/deleteTopics');
      ajax.setRequestHeader("Content-Type", "application/json");
      ajax.send(message);
      ajax.onload = () => {
        hideElems(target);
        target.classList.add('deleted');
        target.insertAdjacentHTML('beforeEnd', "<p class = 'excluded'> Тема удалится после перезагрузки страницы.</p>");
        isOpened = false;
      };
    };
    if (target.classList.contains('forumName') ){

      let isAgree = confirm("Удалить этот форум со всеми темами и сообщениями?");
      if (isAgree) {

        ajax.open('DELETE',  '/deleteForum/' + target.dataset.urn);
        ajax.send();
        ajax.onload = () => {
          hideElems(target.parentElement);
          isOpened = false;
        };
      };
    };
  };
}

//============OTHER_FUNCTIONS==========
function trans(post) {
  let arr = post.split('');

  for(let i=0; i< arr.length; i++) {
    switch (arr[i]) {
      case '"':
      case "'":
      case '`':
      case '[':
      case ']':
      case '}':
      case '{':
        arr[i] = `\"`;
        break;
      case "<":
        arr[i] += "\b";
        break;
      case "\n":
        arr[i] = "<br />";
        break;
    };
  };    
  arr = arr.join(''); 
  return arr;
}

function sayH() {

        ajax.open('get',  '/online');
        ajax.send();
        ajax.onerror = () => {clearInterval(pulse); alert('stop');}
      }

let pulse = setInterval(sayH, 300000);

function reloadPMstream (userId) {
  ajax.open('POST', `/getSession?id=${userId}`);
  ajax.setRequestHeader('Content-type', 'application/json'); 
  ajax.send();

  ajax.onload = (data)=> {
    let sessionList = JSON.parse(ajax.response); 
    let session = '';
    sessionList.forEach( (key) => {
      let isNew = (key.isNew) ? 'new' : '';
      if (+key.userId == +userId) session += `<div class='from ${isNew}' `;
      else session += `<div class='me ${isNew}' `;
      session += `data-pmid='${key.pmId}'><p>${key.userName}${new Date(key.postDate)}</p><p>${key.content}</p></div>`
    });
    document.getElementById('PMstream').innerHTML = session;
  };
}

function checkTopics () {
  let posts = Array.from(document.getElementsByClassName('post') );

  if (posts.length) {
    localStorage.setItem(`${path[0]}_${path[1]}`, posts[posts.length - 1].dataset.postid);  
  }

  let topics = Array.from(document.getElementsByClassName('topic field') );
  if (topics.length) {

    topics.forEach( (item) => {  
      if (  +localStorage.getItem(`${path[0]}_${item.dataset.topicid}`) >= +item.dataset.lastpost) {
        item.getElementsByTagName('td')[0].textContent = 'прочитано ' + item.getElementsByTagName('td')[0].textContent;
      } else {
        item.getElementsByTagName('td')[0].textContent = 'непрочитано ' + item.getElementsByTagName('td')[0].textContent;    
      } 
    });
  }
}

 
function SetBanned ()  {
  this.timeframe = new Date(0);
  this.Mins = () => {
    this.timeframe.setUTCMinutes(this.timeframe.getUTCMinutes() + 15); 
    this.showTime();
  };
  this.Hour = () => { 
    this.timeframe.setUTCHours(this.timeframe.getUTCHours() + 1); 
    this.showTime();
  };
  this.Day = () => {
    this.timeframe.setUTCDate(this.timeframe.getUTCDate() + 1); 
    this.showTime();
  };
  this.Month = () => { 
    this.timeframe.setUTCMonth(this.timeframe.getUTCMonth() + 1); 
    this.showTime();
  };
  this.showTime = () => {
    document.getElementById('banPeriod').textContent= `${this.timeframe.getUTCMonth() } месяцев ${this.timeframe.getUTCDate() - 1} дней ${this.timeframe.getUTCHours()} часов ${this.timeframe.getUTCMinutes()} минут`;
  };
  this.sendBan = (target) => {
    
    let now = new Date();
    let message = now.getTime() + this.timeframe.getTime();
    message = JSON.stringify({period: message, userId: target.dataset.userid});
    ajax.open('POST', `/banUser`);
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send(message);
    ajax.onload = () => {document.location.reload()};
  };
}

function BanTimer (period) {
  let now = new Date();
  this.period = +period - now.getTime();
  this.start =()=> { 
    if (this.period <= 0) return;
    this.timerId = setInterval( ()=> {
      this.period -= 1000;
      if (this.period <= 0) {
        clearInterval(this.timerId);
        ajax.open('GET', `/reabilitate`);
        ajax.setRequestHeader('Content-type', 'application/json'); 
        ajax.send();

        ajax.onload = () => {document.getElementById('banTimer').parentElement.removeChild(document.getElementById('banTimer'));};
      } else { 
        let timeLeft = new Date(this.period);
        document.getElementById('banTimer').textContent = `За нарушение правил общения Вы были временно отстранены. 
          Ваше отстранение закончится через ${timeLeft.getUTCMonth()} месяцев ${timeLeft.getUTCDate() - 1} дней ${timeLeft.getUTCHours()} часов ${timeLeft.getUTCMinutes()} минут ${timeLeft.getUTCSeconds()} секунд.`;
      }
    }, 1000);
  };
  this.stop = ()=> {
    clearInterval(this.timerId);
  };
}