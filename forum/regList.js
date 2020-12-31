export const regList = `<form class='registration' name='redactor'>
<div id='close'>X</div>
  <h4>Регистрация</h4>
<fieldset name='anketa'>
  <span>Придумайте ник:</span>
  <input type='text' name='userName' /><br />
  <span>Ваш e-mail:</span>
  <input type='text' name='mail' /><br />
  <span>Пароль:</span>
  <input type='password' name='password' /><br />
  <span>Повторите пароль:</span>
  <input type='password' name='passRepeat' /><br />
  <span>Пол:</span><br/>
  <label><input type='radio' name='sex' value='1'/>М</label><br />
  <label><input type='radio' name='sex' value='2'/>Ж</label><br />
  <label><input type='radio' name='sex' value='0' checked />не указан</label><br />
  <fieldset> <span>Дата рождения:</span>
  <select name='Year'></select><select name='Month'></select><select name='Day'></select><br />
  <label><input type = 'checkbox' name='notSelected' value='true'>  не указывать дату.</label>
</fieldset></fieldset>
<button name='addUser' id = 'addUser' type='button'>Зарегистрироваться</button>
</form>`;

export function selectBirthDay() {
  const notSelected = document.forms.redactor.elements.notSelected;
  notSelected.onchange = () => { 
    selectYear.disabled = !selectYear.disabled; 
    selectMonth.disabled = !selectMonth.disabled; 
    selectDate.disabled = !selectDate.disabled; 
    
  };

  let today = new Date();
  let maxYear = today.getFullYear() - 12;
  let minYear = maxYear - 88;

  const selectYear = document.forms.redactor.elements.Year;
  selectYear.value  = maxYear;
  selectYear.disabled = 0;
  selectYear.onchange = changeDate;
  for(let i = maxYear; i >= minYear; i--) {
    let option = document.createElement('option');
    option.value = String(i);
    option.insertAdjacentText("beforeEnd", i);
    selectYear.appendChild(option);
  }
  const selectMonth = document.forms.redactor.elements.Month;
  const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];  
  selectMonth.value  = 0;
  selectMonth.disabled = 0;
  selectMonth.onchange = changeDate;
  for(let i = 0; i < 12; i++) {
    let option = document.createElement('option');
    option.value = String(i);
    option.insertAdjacentText("beforeEnd", months[i]);
    selectMonth.appendChild(option);
  }
  const selectDate = document.forms.redactor.elements.Day;
  selectDate.disabled = 0;
  let maxDate = 31;
  for(let i = 1; i <= maxDate; i++) {
    let option = document.createElement('option');
    option.value = String(i);
    option.insertAdjacentText("beforeEnd", i);
    selectDate.appendChild(option);
  }
}

function changeDate() {

  let year = Number(document.forms.redactor.elements.Year.value);
  let month = Number(document.forms.redactor.elements.Month.value);
  let selectDate = document.forms.redactor.elements.Day;
  if (month == 11) {
    year++;
    month = 0;
  } else month++;
  selectDate.innerHTML='';
  let selectedDate = new Date(year, month, 0);
  let maxDate = selectedDate.getDate();
  for(let i = 1; i <= maxDate; i++) {
    let option = document.createElement('option');
    option.value = String(i);
    option.insertAdjacentText("beforeEnd", i);
    selectDate.appendChild(option);
  }   
}
export const loginList = `<form  class='login' name='redactor'>
<div id='close'>X</div>

  <h4>Вход</h4>
 <span> E-mail: </span>
  <input class = 'textLine' type='text' name='userName' /><br />
 <span> Пароль: </span>
  <input class = 'textLine' type='password' name='password' /><br />

  <label><input type = 'checkbox' name='rememberMe' value='1'>  запомнить меня.</label><br/><br/>

<button name='checkUser' id = 'checkUser' type='button'>Войти</button>
</form>`;