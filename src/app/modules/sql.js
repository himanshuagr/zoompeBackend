const msql = require('mysql2/promise');
const dbcongif = require('../config/dbconfig');

var connection = msql.createPool({
  
    host:dbcongif.Host,
    user: dbcongif.User,
    password:dbcongif.Password,
    database : dbcongif.Database

});


module.exports = connection;