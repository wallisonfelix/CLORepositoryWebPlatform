var mongodb = require('mongodb');

//Estabelece a Conexão com o MongoDB
var mongoServer = new mongodb.Server('127.0.0.1', 27017, { poolSize: 5 });
var mongoConnection = new mongodb.Db("clo_repository", mongoServer, { w: 0 });

//Criar as collections e os índices, caso não existam
 

module.exports = mongoConnection;