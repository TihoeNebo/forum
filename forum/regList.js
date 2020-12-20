export const regList = `<form name='redactor'>
<a id='close'>[x]</a></br>
<fieldset name='anketa'>
  <legend>Регистрация.</legend>
  Придумайте ник:
  <input type='text' name='userName' /><br />
  Ваш e-mail:
  <input type='text' name='mail' /><br />
  Пароль:
  <input type='text' name='password' /><br />
  Повторите пароль:
  <input type='text' name='passRepeat' /><br />
  Пол:<br />
  <label><input type='radio' name='sex' value='1'/>М</label><br />
  <label><input type='radio' name='sex' value='2'/>Ж</label><br />
  <label><input type='radio' name='sex' value='0' checked />не указан</label><br />
  <fieldset> Дата рождения:
  <select name='Year'></select><select name='Month'></select><select name='Day'></select><br />
  <label><input type = 'checkbox' name='notSelected' value='true'>  не указывать дату.</label>
</fieldset></fieldset>
<input type='button' name='addUser' id = 'addUser' value='Зарегистрироваться' /><br />
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
export const loginList = `<form name='redactor'>
<a id='close'>[x]</a></br>
<fieldset>
  <legend>Вход</legend>
  E-mail:
  <input type='text' name='userName' /><br />
  Пароль:
  <input type='text' name='password' /><br />
</fieldset>
  <label><input type = 'checkbox' name='rememberMe' value='1'>  запомнить меня.</label>

<input type='button' name='checkUser' id = 'checkUser' value='Войти' /><br />
</form>`;