const hbs= require("hbs");

console.log( "Подключен модуль helpers.js");

module.exports = {
	layoutsDir: "views/layouts",
	defaultLayout: "index",
	extname: "hbs",

	helpers: {
		getPosts: function(n) {
			return new hbs.SafeString(n);
		},
		getDate: function (date) {
                   
			function addZero (n) {
				if (n < 10) n = '0' + n;
				return n;
			}
			if (date) {
			date = date.getFullYear() + '-' + addZero( (date.getMonth() + 1) ) + '-' + addZero( date.getDate() ) + ' ' + addZero( date.getHours() ) +':' + addZero( date.getMinutes() ) + ':' + addZero( date.getSeconds() );}
			return date;
		},
		dislocateParts: function (context, options) {
			let previousPart = 0;
			let matrix = "";
			let dataRedactable = (context[0].redactable) ? " data-redactable = 'true' ": "";
			for (let i = 0; i< context.length; i++) {
				if (context[i].partId != previousPart) {
					if (previousPart != 0) matrix += "</div>";
					matrix += "<div class='part' ><div class='partName' id = '" + context[i].partId + 
					"' " + dataRedactable + "> Раздел:<br/><h3 class='partTitle'>" + context[i].partName + 
					"</h3></div>" + options.fn(context[i]);
				} else {
					matrix += options.fn(context[i]);
				};
				previousPart = context[i].partId;
			};
			return matrix + "</div>";
		},
		ceil: (n) => { return Math.ceil(n/11)|| 1;},
		sayHello: function(sex) {
			switch(sex){
				case 2:
				return 'госпожа';
				case 1:
				return 'господин';
				case 0:
				return 'некто';
			}
		},
		getSex: function(sex) {
			switch(sex){
				case 2:
				return 'женщина';
				case 1:
				return 'мужчина';
				case 0:
				return 'неизвестно';
			}
		},
		getThisTime: function(time) {
			time = new Date(time);
			return `${time.getDate()}.${+time.getMonth() + 1}.${time.getFullYear()} в ${time.getHours()}:${time.getMinutes()}`;
		}
	}
}