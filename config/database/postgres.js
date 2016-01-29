var Sequelize = require('sequelize');

//Estabelece a Conexão com o Postgres
module.exports = new Sequelize('clo_repository', 'postgres', 'postgres', {
  host: '127.0.0.1',
  port: '5432',
  dialect: 'postgres',

  pool: {
    maxConnections: 5,
    minConnections: 0,
    idle: 10000
  },

  timezone: '+00:00'
});
