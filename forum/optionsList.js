export function getAccountOptions(target) {
  const mail = target.dataset.mail;
  const userId = target.dataset.userid;
  let template = `<form name='accountOptions'>
    <ul>
    <li > 
      <fieldset>Изменить адрес электронной почты:<br>
       <span> Новый адрес:</span> <input type='text' name = 'mail' value='${mail}' /><br/>
       <span></span>   <input type='button' id = 'changeMail' value='Изменить' />
      </fieldset>
    </li>
    <li >
        <fieldset>Изменить пароль: <br>
          <span>Старый пароль:</span> <input type='password' name = 'oldPass' /><br>
          <span>Новый пароль:</span> <input type='password' name = 'newPass' /><br>
          <span>Повторить пароль:</span> <input type='password' name = 'repeatPass' /><br>
          <span></span>   <input type='button' id = 'changePass' value='Изменить' />
        </fieldset>
    </li>
    <button type='button' id = 'deleteMyAcc' data-userid='${userId}'>Удалить аккаунт</button>
    </ul>
    </form>`;
  document.getElementById('optionBoard').innerHTML = template;
  document.getElementById('optionBoard').onclick = (e)=> {
    let target = e.target;
    
    if (target.id == 'changeMail') {
      let newMail = document.forms.accountOptions.elements.mail.value;
      let mess = JSON.stringify({newMail: newMail});
      let ajax = new XMLHttpRequest();
      ajax.open('PUT', `/me/changeMail`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send(mess);
    }

    if (target.id == 'changePass') {
      let oldPass = document.forms.accountOptions.elements.oldPass.value;
      let newPass = document.forms.accountOptions.elements.newPass.value;
      let repeatPass = document.forms.accountOptions.elements.repeatPass.value;
      if (newPass != repeatPass) return alert('Пароли не совпадают.');
      let mess = JSON.stringify({oldPass: oldPass, newPass: newPass});
      let ajax = new XMLHttpRequest();
      ajax.open('PUT', `/me/changePass`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send(mess);
      ajax.onload = ()=> {
        if (ajax.status != 200) return alert('Пароль неверен.');
      };
    }

    if (target.id == 'deleteMyAcc') {
      let userId = target.dataset.userid;
      if(!confirm('Вы уверены, что хотите удалить аккаунт?') ) return;
      let ajax = new XMLHttpRequest();
      ajax.open('DELETE', `/deleteUser?userId=${userId}`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send();
      ajax.onload = ()=> { window.location.replace('/') };
    }
  };
}

export async function getProfileOptions(e) {
  const sex = e.target.dataset.sex;
  let userName = e.target.dataset.username;
  let birthday = (e.target.dataset.birthday) ? new Date(e.target.dataset.birthday) : null;
  let {selectBirthDay} = await import( '/regList.js'); 
  let template = `
    <ul>
      <form name='profileOptions'>
      <li > 
        <fieldset>Изменить имя пользователя:<br>
          <span>Новое имя: </span><input type='text' name = 'userName' value='${userName}' /><br/>
          <span></span><input type='button' id = 'changeName' value='Изменить' />
        </fieldset>
      </li>
      <li>     
        <fieldset name = 'changeSex'>Изменить пол:<br>
          <label><input type='radio' name='sex' value='1' />М</label><br />
          <label><input type='radio' name='sex' value='2' />Ж</label><br />
          <label><input type='radio' name='sex' value='0' />не указан</label><br />
          <span></span><input type='button' id = 'changeSex' value='Изменить' />
        </fieldset>
      </li>
      </form>
      <li>
        <form name = 'redactor'>
          <fieldset> Сменить дату рождения:<br><br>
            <select name='Year'></select><select name='Month'></select><select name='Day'></select><br />
            <label><input type = 'checkbox' name='notSelected' value='true'>  не указывать дату.</label><br/>
            <span></span><input type='button' id = 'changeBirthday' value='Изменить' />
          </fieldset>
        </form>
      </li>
    </ul>`;
  document.getElementById('optionBoard').innerHTML = template;
  selectBirthDay();
  if (birthday) {
    let years = Array.from(document.forms.redactor.elements.Year.children);
    let months = Array.from(document.forms.redactor.elements.Month.children);
    let days = Array.from(document.forms.redactor.elements.Day.children);
    let year = years.find( item => +item.value == +birthday.getFullYear() );
    year.selected = true;
    let month = months.find( item => +item.value == +birthday.getMonth() );
    month.selected = true;
    let day = days.find( item => +item.value == +birthday.getDate() );
    day.selected = true;
  } else document.forms.redactor.elements.notSelected.checked = true;

  let sexArr = Array.from(document.forms.profileOptions.elements.sex);

  let sexVal = sexArr.find(item => +item.value == +sex);
  sexVal.checked = true;

  document.getElementById('optionBoard').onclick = (e)=> {
    let target = e.target;
    let profileOptions = document.forms.profileOptions.elements;

    if (target.id == 'changeName') {
      let userName = profileOptions.userName.value;
      let ajax = new XMLHttpRequest();
      ajax.open('PUT', `/me/changeName?newName=${userName}`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send();
      ajax.onload = ()=> {
        window.location.reload();
      };
    } 
    
    if (target.id == 'changeSex') {
      let sex = profileOptions.sex.value;
      let ajax = new XMLHttpRequest();
      ajax.open('PUT', `/me/changeSex?newSex=${sex}`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send();
      ajax.onload = ()=> {
        window.location.reload();
      };
    }

    if (target.id == 'changeBirthday') {
      alert('fghgvfhv');
      let form = document.forms.redactor.elements;
      let year = form.Year.value;
      let month = form.Month.value;
      let day = form.Day.value;
      let notSelected = form.notSelected.checked;

      let birthday = (notSelected) ? null : `'${year}-${+month + 1}-${day}'`;
      let ajax = new XMLHttpRequest();
      ajax.open('PUT', `/me/changeBirth?newBirth=${birthday}`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send();
      ajax.onload = ()=> {
        window.location.reload();
      };
    }
  };
}

export function getSubscribeOptions(e) {
  let mode = +e.target.dataset.mode;
  let subOnTopics = (mode & 2) ? `checked`: ``;
  let subOnPosts = (mode & 1) ? `checked`: ``;
  let template = `<form name='subscribeOptions'>
      Подписываться автоматически:<br>
      <label><input type = 'checkbox' name='subOnTopic' value='true' ${subOnTopics}>  на созданные Вами темы</label><br>
      <label><input type = 'checkbox' name='subOnPost' value='true' ${subOnPosts}>  на темы, в которых Вы ответили</label>
  </form>`;
  document.getElementById('optionBoard').innerHTML = template;

  let ajax = new XMLHttpRequest();
  ajax.open('GET', `/me/getSubscribes`);
  ajax.setRequestHeader('Content-type', 'application/json'); 
  ajax.send();
  ajax.onload = ()=> {
    let subsList = JSON.parse(ajax.response) ;
    if (!subsList.length) return  document.forms.subscribeOptions.insertAdjacentHTML('beforeEnd',`<div id = 'subscribeList'>пусто</div>`);
    let subsTemplate = `<div id = 'subscribeList'>`;
    subsList.forEach( (item) => {
    
      subsTemplate += `<div class='me'><button class='deleteSub' data-forum='${item.forumURN}' data-topic='${item.topicId}'>Отписаться</button>
          <a href='/${item['forumURN']}/${item.topicId}'>${item.theme}</a><br>${item.comment}
        </div>`;
    });
    subsTemplate +=`</div>`;
    document.forms.subscribeOptions.insertAdjacentHTML('beforeEnd', subsTemplate)
  };
  document.getElementById('optionBoard').onclick = (e)=> {
    let target = e.target;
    if ( target.classList.contains('deleteSub') ) {
      let forum = target.dataset.forum;
      let topic = target.dataset.topic;
      ajax.open('DELETE', `/me/delSubscribes?forum=${forum}&topicId=${topic}`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send();
      ajax.onload = ()=> {
        window.location.reload();
      };
    }
  };
  let autosubTopics =document.forms.subscribeOptions.elements.subOnTopic;
  let autosubPosts =document.forms.subscribeOptions.elements.subOnPost;
  autosubTopics.onchange = () => {
    mode += (autosubTopics.checked) ?  2 :  - 2;
    ajax.open('PUT', `/me/changeSubMode?mode=${mode}`);
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send();
    e.target.dataset.mode = mode;
  };
  autosubPosts.onchange = () => {
    mode += (autosubPosts.checked) ?  1 :  - 1;
    ajax.open('PUT', `/me/changeSubMode?mode=${mode}`);
    ajax.setRequestHeader('Content-type', 'application/json'); 
    ajax.send();
    e.target.dataset.mode = mode;
  };
}

export function getBlackListOptions() {
  document.getElementById('optionBoard').innerHTML = `<form name = 'blackListOptions'></form>`;
  let ajax = new XMLHttpRequest();
  ajax.open('GET', `/me/getIgnored`);
  ajax.setRequestHeader('Content-type', 'application/json'); 
  ajax.send();
  ajax.onload = ()=> {  
    let ignorList = JSON.parse(ajax.response);
    if (!ignorList.length) return  document.forms.blackListOptions.insertAdjacentHTML('beforeEnd',`<div id = 'ignorList'>пусто</div>`);
    let template = `<div id = 'ignorList'>`;
    ignorList.forEach( (item) => {
      template += `<div class='from'><button class='forgive' data-userid='${item.userId}'>Понять, простить..</button>
          <a href='/profile/${item.userId}'>${item.userName}</a>
        </div>`;
    });
    template +=`</div>`;
    document.forms.blackListOptions.insertAdjacentHTML('beforeEnd', template);
  };
  document.getElementById('optionBoard').onclick = (e)=> {
    let target = e.target;
    if ( target.classList.contains('forgive') ) {
      let userId = target.dataset.userid;
      ajax.open('PUT', `/me/forgive?userId=${userId}`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send();
      ajax.onload = ()=> {
        window.location.reload();
      };
    }
  };
}
