var mongodb = require('mongodb');

//Estabelece a Conexão com o MongoDB
var mongoServer = new mongodb.Server('127.0.0.1', 27017, { poolSize: 5 });
module.exports = new mongodb.Db("clo_repository", mongoServer, { w: 0 });

