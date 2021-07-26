const sql = require("mysql2");

console.log('Подключение к модулю запуска пула');

const pool = sql.createPool({
  host: "localhost",
  user: "root",
  database: "forum",
  password: "star12"
}).promise(); 


exports.query = async function(...params) { 

  const connection = await pool.getConnection().catch( (err) => {console.log(err);});
  const result = await connection.query(...params).catch( (err) => {console.log(err);});
  await connection.release();
  return result;
}

/*const connection = sql.createConnection({
  host: "localhost",
  user: "root",
  database: "forum",
  password: "star12"
}).promise();

 module.exports = connection;;*/
