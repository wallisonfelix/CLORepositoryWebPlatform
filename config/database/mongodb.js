var mongodb = require('mongodb');

var mongoServer = new mongodb.Server('127.0.0.1', 27017, { poolSize: 5 });
var mongoConnection = new mongodb.Db("clo_repository", mongoServer, { w: 0 });

module.exports.mongoConnection = mongoConnection