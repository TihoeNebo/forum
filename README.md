# forum
Здравствуйте. Данный проект представляет собой форумы, где пользователи могут создавать разные темы и обмениваться сообщениями.
Каждый вошедший может свободно перемещаться по темам и читать их содержимое, однако чтобы отвечать в них, создавать новые темы или 
общаться с другими пользователями посредством личных сообщений, необходимо пройти регистрацию. 
Регистрация представляет собой заполнение анкеты, где обязательно указывается электронный адрес и пароль.
После заполнения анкеты, на указанный адрес отправляется письмо с ссылкой для подтверждения почты. 
Только после этого вошедший становится полноправным пользователем с возможностью создавать темы, 
создавать, редактировать и удалять свои сообщения, обмениваться личными сообщениями с другими пользователями, подписываться на темы.
Всего есть 5 уровней доступа:
 - 0 - гостевой доступ с минимальными полномочиями.
 - 1 - доступ для тех, кто заполнил регистрационную анкету, но не прошел по ссылке в письме. То же, что и 0, но с возможностью изменить адрес почты и отправить повторное письмо. 
 - 2 - Полноценный пользователь со стандартными полномочиями, описанными выше.
 - 3 - Доступ для модераторов. Помимо стандартных полномочий могут удалять и редактировать любое сообщение и тему, закрывать и открывать темы,
 перемещать темы между форумами, банить пользователей.
 - 4 - доступ для администратора. Помимо вышеперечисленного может создавать разделы и форумы, назначать модераторов и удалять пользователей.
 У каждого пользователя есть профиль, лс, оповещения, подписки, в также настройки, где он может изменить анкетные данные, отказаться от подписок или удалить свой аккаунт.
 
 В качестве сервера используется Node js (файл app.js, предварительно нужно установить все модули).
 В Качестве базы данных - MySQL. 
 Чтобы начать, нужно создать базу данных, в файле арр указать нужные параметры(название базы, логин, пароль). Также указать почтовый сервер или пользоваться тем, который
 уже указан. Запустить сервер, зайти на сайт, зарегистрироваться, подтвердить e-mail, 
 после чего зайти в базу данных MySQL и выполнить "UPDATE users SET access = 4 WHERE userId = 1;", чтобы получить права администратора. 
 Далее вернуться на сайт, войти в свой аккаунт и нажать кнопку "создать форум". ПРОЕКТ НА СТАДИИ РАЗРАБОТКИ, поэтому следует заполнить все поля, обязательно указать "Новый раздел",
 в графе "URN форума" писать латынью и слитно :).
 