var model = require('./model/models.js');
var console = require('console');

//Realiza a busca de todas as Operações contidas no banco de dados
var buscarOperacoes = function(callback) {

	model.Operation.findAll( { attributes: ['id', 'name', 'code', 'description'] } ).then(function (operations) {				
		callback(null, operations);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
		callback(err, null);
	});

}

module.exports.buscarOperacoes = buscarOperacoes;