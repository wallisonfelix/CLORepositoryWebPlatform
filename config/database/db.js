var mongoConnection = require('./mongodb.js');
var sequelize = require('./postgres.js');

module.exports = {
	mongo: mongoConnection,
	sequelize: sequelize
}
