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
    let profileOptions = document.forms.profileOptions.elements;
    let target = e.target;

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

/*export function getAvatarOptions(e) {

let template = `
      <form name='avatarOptions'> 
        <fieldset>Добавить аватар:<br>
          <input type='file' name='avatar'>
        </fieldset>
      </form>`;
  document.getElementById('optionBoard').innerHTML = template;
  let avatarOptions = document.forms.avatarOptions.elements;

  avatarOptions.avatar.onchange = function() {
    let avatarFrame = {};
    let file = this.files[0];
    let image = document.createElement('img');
    image.src = URL.createObjectURL(file);
    
    image.onload = ()=> {
      URL.revokeObjectURL(image.src);
      let avatarField = document.createElement('div');
      avatarField.id = 'avatarField';
      document.body.appendChild(avatarField);
      avatarField.appendChild(image);
      let computedImage = getComputedStyle(image);
      let height = +computedImage.height.replace(/px/, "");
      let width = +computedImage.width.replace(/px/, "");


      if (width >= height) {
        image.style.maxWidth = '360px';
        computedImage = getComputedStyle(image);
        let height = +computedImage.height.replace(/px/, "");
        avatarFrame.height = height;
        avatarFrame.width = height/4*3;
      } else {
        image.style.maxHeight = '360px'; 
        computedImage = getComputedStyle(image);
        let width = +computedImage.width.replace(/px/, "");
        avatarFrame.height = width;
        avatarFrame.width = width/4*3;
      }

      let imageCoords = image.getBoundingClientRect();
      let resolutionSquare = document.createElement('div');
      resolutionSquare.id = 'resolution';
      resolutionSquare.style.top = imageCoords.top +'px';
      resolutionSquare.style.left = imageCoords.left +'px';
      resolutionSquare.style.width = (avatarFrame.width - 2) + 'px';
      resolutionSquare.style.height = (avatarFrame.height - 2) + 'px';
      avatarField.appendChild(resolutionSquare);      

      let topLeftPoint = document.createElement('div');
      topLeftPoint.id = 'topLeftPoint';
      topLeftPoint.classList.add('point');
      topLeftPoint.style.top = '-3px';
      topLeftPoint.style.left = '-2px';
      resolutionSquare.appendChild(topLeftPoint);
  
      let topRightPoint = document.createElement('div');
      topRightPoint.id = 'topRightPoint';
      topRightPoint.classList.add('point');
      topRightPoint.style.top = '-3px';
      topRightPoint.style.left = (avatarFrame.width - 31) +'px';
      resolutionSquare.appendChild(topRightPoint);

      let bottomLeftPoint = document.createElement('div');
      bottomLeftPoint.id = 'bottomLeftPoint';
      bottomLeftPoint.classList.add('point');
      bottomLeftPoint.style.top = (avatarFrame.height - 15) +'px';
      bottomLeftPoint.style.left = '-35px';
      resolutionSquare.appendChild(bottomLeftPoint);

      let bottomRightPoint = document.createElement('div');
      bottomRightPoint.id = 'bottomRightPoint';
      bottomRightPoint.classList.add('point');
      bottomRightPoint.style.top = ( avatarFrame.height - 15) +'px';
      bottomRightPoint.style.left = (avatarFrame.width - 63) +'px';
      resolutionSquare.appendChild(bottomRightPoint);

      let recentCoords = {};

      bottomRightPoint.onmousedown = (e) => {
        recentCoords.clientX = e.clientX;
        recentCoords.clientY = e.clientY;

        bottomRightPoint.onmousemove = (e) => {
          let squareParams = getComputedStyle(resolutionSquare);
          let newCoords = {};
          newCoords.clientX = e.clientX - recentCoords.clientX;
          newCoords.clientY = e.clientY - recentCoords.clientY;
          recentCoords.clientX = e.clientX;
          recentCoords.clientY = e.clientY;  
          let newWidth = 0;
          let newHeight = 0;
          if ( Math.abs(newCoords.clientX) >= Math.abs(newCoords.clientY) ) {
            newWidth = +squareParams.width.replace(/px/, "") + newCoords.clientX;
            newHeight = newWidth*4/3;
          } else {
            newHeight = +squareParams.height.replace(/px/, "") + newCoords.clientY;
            newWidth = newHeight*3/4;
          }
          resolutionSquare.style.width = newWidth + 'px';
          resolutionSquare.style.height = newHeight + 'px';

          bottomRightPoint.onmouseup = (e) => {
            bottomRightPoint.onmousemove = null;
          };
        };
      };
      resolutionSquare.onmousedown = (e) => {
        recentCoords.clientX = e.clientX;
        recentCoords.clientY = e.clientY;

        resolutionSquare.onmousemove = (e) => {
          let squareParams = getComputedStyle(resolutionSquare);
          let squareCoords = resolutionSquare.getBoundingClientRect();
          let newCoords = {};
          newCoords.clientX = e.clientX - recentCoords.clientX;
          newCoords.clientY = e.clientY - recentCoords.clientY;
          recentCoords.clientX = e.clientX;
          recentCoords.clientY = e.clientY;   

          if (imageCoords.top > (squareCoords.top + newCoords.clientY) ) {
            resolutionSquare.style.top = imageCoords.top +'px';
          }  else if (imageCoords.bottom < (squareCoords.bottom + newCoords.clientY) ) {
            resolutionSquare.style.top = ( imageCoords.bottom - +squareParams.height.replace(/px/, "") - 2 ) +'px';
          } else {
            resolutionSquare.style.top = (squareCoords.top + newCoords.clientY) +'px';
          }

          if (imageCoords.left > (squareCoords.left + newCoords.clientX) ) {
            resolutionSquare.style.left = imageCoords.left +'px';
          }  else if (imageCoords.right < (squareCoords.right + newCoords.clientX) ) {
            resolutionSquare.style.left = ( imageCoords.right - +squareParams.width.replace(/px/, "") - 2 ) +'px';
          } else {
            resolutionSquare.style.left = (squareCoords.left + newCoords.clientX) +'px';
          }

          resolutionSquare.onmouseup = (e) => {
            resolutionSquare.onmousemove = null;
          };
        };
      };


    }


  }
}

*/
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
    if (!subsList.length) return  document.forms.subscribeOptions.insertAdjacentHTML('afterEnd',`<div id = 'subscribeList'>пусто</div>`);
    let subsTemplate = `<div id = 'subscribeList'>`;
    subsList.forEach( (item) => {
    
      subsTemplate += `<div class='me'><button class='deleteSub' data-forum='${item.forumURN}' data-topic='${item.topicId}'>Отписаться</button>
          <a href='/${item['forumURN']}/${item.topicId}'>${item.theme}</a><br>${item.comment}
        </div>`;
    });
    subsTemplate +=`</div>`;
    document.forms.subscribeOptions.insertAdjacentHTML('afterEnd', subsTemplate)
  };

  document.getElementById('optionBoard').onclick = (e)=> {
    let target = e.target;

    if ( target.classList.contains('deleteSub') ) {

      let forum = target.dataset.forum;
      let topic = target.dataset.topic;

      let ajax = new XMLHttpRequest();
      ajax.open('DELETE', `/me/delSubscribes?forum=${forum}&topicId=${topic}`);
      ajax.setRequestHeader('Content-type', 'application/json'); 
      ajax.send("1");
      ajax.onload = ()=> {

       // window.location.reload();
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