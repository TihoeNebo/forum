class Visiters extends Map {
	constructor () {
		super();
	}
	allWhoAlive (){ 
		let list = [];
		let i = 0;
		for (let value of this.values()){
 			if (value.access) list[i++] = value.profile;
		}
		return list;  
	}
}

const visiters = new Visiters();
console.log( "Подключен модуль visiters.js");
module.exports = visiters;

