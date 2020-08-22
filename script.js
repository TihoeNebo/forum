const path = [].splice.call( document.location.pathname.split('/'), 1);
const ajax = new XMLHttpRequest();
const menu = document.createElement('div');
menu.id = 'editMenu';
//alert(document.cookie);
let isOpened = false;
let deletedPosts = [];
let deletedTopics = [];

function hideElems (parent) {
  isOpened = !isOpened;
  for(let elem of parent.children) {
    elem.hidden = !elem.hidden;
  };
}

function setMenu(code) {
  const buttons = { 
    edit: "<div id = 'edit'>Редактировать</div>",
    del: "<div id = 'delete'>Удалить</div>",
    title: "Название: <input type = 'text' name = 'title'><br />",
    comment: "Описание: <input type = 'text' name = 'comment'><br />",
    URN: "URN форума: <input type = 'text' name = 'forumURN'>",
    content: "<textarea name = 'content'></textarea>",
    cancel: "<div id = 'cancel'>Отмена</div>",
    save: "<div id = 'save'>Сохранить</div>"
  };
  let deleted = (code == 64) ? true : false;
  let menuElems = '';
  let inForm = false;
  let arr = Object.values(buttons);
  code = code.toString(2).split('').reverse();

  for(let i = 0; i < code.length; i++) {
    if(code[i] == 0) continue;
    if (i > 1 && !inForm) {
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


  let className = target.className.split(' ');
  let lastName = className[className.length - 1];

  switch ( lastName ) {
    case 'topicTitle':
      index = 1;
      break; 
    case 'topic':
    case 'post':
    case 'forumName':
      index = 3;
      break; 
    case 'partName':
      index = 1;
      break;
    case 'deleted':
      index = 64;
  }

  target.appendChild(setMenu(index));

  target.onmouseout = (e) => {
    if (!isOpened)  menu.hidden = true;
  };
  
};

//=============CLICK===============

document.onclick = (e) => {
  let self = this;
  let target = e.target;
  let settedButton = '';

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
                                                             userId: 0
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
  if (e.target.id == 'save') {
    let target = sortParentTree(e.target);
    if ( target == document.body ) return;

    if (target.classList.contains('topicTitle')) {
      let theme = document.forms.redactor.elements.title.value;
      let comment = document.forms.redactor.elements.comment.value;
      let message = JSON.stringify({
                                                           topicId: target.id,
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
      let message = JSON.stringify({
                                                           postId: target.id,
                                                         content: trans(content)
                                                        });

      ajax.open('PUT', '/' + path[0] + '/updatePost')
      ajax.setRequestHeader('Content-Type', 'application/json');
      ajax.send(message);

      ajax.onload = () => {
        target.getElementsByClassName('content')[0].innerHTML = trans(content);
        hideElems(target);
        menu.innerHTML = '';
        return;
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
      if ( target.id == 'editMenu' ) break;
      target = target.parentElement;
    }; 
    if (target == document.body) return;
    hideElems(target.parentElement);

    if ( target.parentElement.classList.contains('deleted') ) {
      target.parentElement.classList.remove('deleted');
      target.parentElement.removeChild( target.parentElement.getElementsByClassName('excluded')[0] );

      for( let i = 0; i < deletedPosts.length; i++) {
        if ( deletedPosts[i] == target.parentElement.id) {
          deletedPosts.splice(i, 1);
          break;
        };
      };
      
      for(let i =0; i < deletedTopics.length; i++) {
        if(deletedTopics[i] == target.parentElement.id){
          deletedTopics.splice(i, 1);
          break;
         };
       };
    };
    
    target.innerHTML = '';
    return;
    
  };

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
      post.appendChild(setMenu(224));
      document.forms.redactor.elements.content.value = st;
    };
    if( target.classList.contains('topicTitle') ) {
      hideElems(target);
      let theme = target.getElementsByClassName('theme')[0].textContent;
      let comment = target.getElementsByClassName('comment')[0].textContent;
      target.appendChild(setMenu(204));
      document.forms.redactor.elements.title.value = theme; 
      document.forms.redactor.elements.comment.value = comment;
    };
    if( target.classList.contains('partName') ) {
      let title = target.getElementsByClassName('partTitle')[0].textContent;
      hideElems(target);
      target.appendChild(setMenu(196));
      document.forms.redactor.elements.title.value = title;       
    }; 
    if( target.classList.contains('forumName') ) {
      hideElems(target);
      let title = target.getElementsByClassName('forumTitle')[0].textContent;
      target.appendChild(setMenu(212));
      document.forms.redactor.elements.title.value = title; 
      document.forms.redactor.elements.forumURN.value = target.dataset.urn;  
    };
  };

  if (e.target.id == 'sendPost'){
    const poster = document.forms.poster;
    const messages = document.getElementById('contents');
    let post = poster.elements.post.value;
    let arr = trans(post);
    let message = JSON.stringify( {
                                                            mess: arr,
                                                          userId: 0,
                                                         topicId: path[1]
                                                        } );

    ajax.open('POST', '/'+path[0]+'/createPost');
    ajax.setRequestHeader("Content-Type", "application/json");
    ajax.responseType = 'json';
    ajax.send(message);

    ajax.onload = () => {

      let div = document.createElement('div');
      //let addPost = JSON.parse(ajax.response);
      messages.insertAdjacentHTML("beforeEnd",  "<div id = " + ajax.response.postId + " class = 'post'><div class ='content'>" + arr + "</div></div>");
      messages.appendChild(div);
    }; 
  };

//========DELETE-BUTTON===================

  if (e.target.id == 'delete') {
    let target = sortParentTree(e.target);
    if ( target == document.body ) return;
    if ( target.classList.contains('post') ) {
      deletedPosts.push(target.id);
      hideElems(target);
      target.classList.add('deleted');
      target.insertAdjacentHTML('beforeEnd', "<p class = 'excluded'>Сообщение удалится после перезагрузки страницы.</p>");
      alert(deletedPosts);
      isOpened = false;
    };
    if (target.classList.contains('topic') ) {
      
      deletedTopics.push(target.parentElement.id);
      hideElems(target.parentElement);
      target.parentElement.classList.add('deleted');
      target.parentElement.insertAdjacentHTML('beforeEnd', "<p class = 'excluded'> Тема удалится после перезагрузки страницы.</p>");
      alert(deletedTopics);
      isOpened = false;
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

//=========BEFOREUNLOAD==================

window.addEventListener('unload', async function () {

  if (deletedPosts.length > 0) {

    let response = await fetch('/' +path[0] + '/' + path[1] + '/deletePosts', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify(deletedPosts)
    });

    deletedPosts.clear(); 

  } else if (deletedTopics.length > 0) {
    console.log('fdfd');
    let response = await fetch('/' + path[0] + '/deleteTopics', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify(deletedTopics)
    });

    deletedTopics.clear();
    
  };
});
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

/*function sayH() {

        ajax.open('get',  '/online');
        ajax.send();
      }

setInterval(sayH, 7000);*/