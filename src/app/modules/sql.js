const msql = require('mysql2/promise');
const dbcongif = require('../config/dbconfig');

var connection = msql.createPool({
  
    host:dbcongif.Host,
    user: dbcongif.User,
    password:dbcongif.Password,
    database : dbcongif.Database

});

connection.getConnection().then((conn)=>{
   
    console.log("sql Db Connected");

}).catch((err)=>{
    console.log(err);
})

module.exports = connection;