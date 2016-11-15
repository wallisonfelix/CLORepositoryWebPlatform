var mongo = require('./mongodb.js');
var sequelize = require('./postgres.js');

//Centraliza as Conexões com os Bancos de Dados - MongoDB e Postgres
module.exports = {
	mongo: mongo,
	sequelize: sequelize
}
