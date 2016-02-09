var model = require('./model/models.js');
var console = require('console');

//Realiza a busca de todos os Papéis contidos no banco de dados
var buscarTodosPapeis = function(callback) {

	model.Role.findAll( { attributes: ['id', 'name', 'code', 'description'], include: [ { model: model.Operation, as: "Operations"} ] } ).then(function (roles) {				
		if (roles.length == 0) {
			console.log(new Date() + " Pesquisa por Papel com retorno vazio");
		}
		callback(null, roles);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
		callback(err, null);
	});

}

//Realiza a busca de um Papel específico, com base no identificador passado como parâmetro
var buscarPapelPorId = function(idRole, callback) {

	model.Role.findById( idRole , { attributes: ['id', 'name', 'code', 'description'], include: [ { model: model.Operation, as: "Operations"} ] } ).then(function (role) {
		if (!role) {
			console.log(new Date() + " Pesquisa por Papel com retorno vazio");
		}
		callback(null, role);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Papel: " + err);
		callback(err, null);
	});

}

//Realiza a busca de Papéis cujo atributos correspondam com os valores repassados como parâmetro
var buscarPapeis = function(name, code, description, callback) {

	var name = "%" + name + "%";
	var code = "%" + code + "%";
	var description = "%" + description + "%";

	model.Role.findAll( { where: { name: { $iLike: name }, code: { $iLike: code }, description: { $iLike: description } }, attributes: ['id', 'name', 'code', 'description'] } ).then(function (roles) {				
		if (roles.length == 0) {
			console.log(new Date() + " Pesquisa por Papel com retorno vazio");
		}
		callback(null, roles);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
		callback(err, null);
	});

}

//Inclui um novo Papel no banco de dados, com base nos valores passados como parametro
var incluirPapel = function(name, code, description, operations, callback) {

	model.Role.create( { name: name, code: code, description: description } ).then(function (role) {
		console.log(new Date() + " Novo Papel inserido: " + role.id + " - " + role.code + ".");
		
		role.setOperations(operations).then(function (operations) {
			console.log(new Date() + " Atualizadas as Operações do Papel: " + role.id + " - " + role.code + ".");			
			callback(null, role);
		}).catch(function (err) {		
			console.error(new Date() + " Erro ao Atualizar as Operações do Papel: " + err);
			callback(err, null);
		});	
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Incluir Papel: " + err);
		callback(err, null);
	});

}

//Edita um Papel no banco de dados, com base nos valores passados como parametro
var editarPapel = function(idRole, name, code, description, operations, callback) {

	model.Role.update( { name: name, code: code, description: description }, { where: { id: idRole }, returning: true } ).then(function (updatedRoles) {
		
		if(updatedRoles[0] == 1) {
			role = updatedRoles[1][0];
			console.log(new Date() + " Papel atualizado: " + role.id + " - " + role.code + ".");
			
			role.setOperations(operations).then(function (operations) {
				console.log(new Date() + " Atualizadas as Operações do Papel: " + role.id + " - " + role.code + ".");			
				callback(null, role);
			}).catch(function (err) {		
				console.error(new Date() + " Erro ao Atualizar as Operações do Papel: " + err);
				callback(err, null);
			});	
		} else {
			callback(new Error(" Papel " + idRole + " não encontrado."), null);
		}	
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Editar Papel: " + err);
		callback(err, null);
	});

}

//Exclui um Papel no banco de dados, com base nos valores passados como parâmetro
var excluirPapel = function(idRole, roleCode, callback) {

	model.Role.destroy( { where: { id: idRole, code: roleCode } } ).then(function (qtyDeletedRole) {
		
		if(qtyDeletedRole == 1) {			
			console.log(new Date() + " Papel excluído: " + idRole + " - " + roleCode + ".");
			callback(null);				
		} else {
			callback(new Error(" Papel " + idRole + " - " + roleCode + " não encontrado."));
		}	
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Excluir Papel: " + err);
		callback(err);
	});

}

//Realiza a busca de todas as Operações contidas no banco de dados
var buscarTodasOperacoes = function(callback) {

	model.Operation.findAll( { attributes: ['id', 'name', 'code', 'description'] } ).then(function (operations) {				
		if (operations.length == 0) {
			console.log(new Date() + " Pesquisa por Operações com retorno vazio");
		}
		callback(null, operations);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
		callback(err, null);
	});

}

//Realiza a busca de uma Operação específica, com base no identificador passado como parâmetro
var buscarOperacaoPorId = function(idOperation, callback) {

	model.Operation.findById( idOperation, { attributes: ['id', 'name', 'code', 'description'] } ).then(function (operation) {
		if (!operation) {
			console.log(new Date() + " Pesquisa por Operação com retorno vazio");
		}
		callback(null, operation);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Operação: " + err);
		callback(err, null);
	});

}

//Realiza a busca de Operações cujo código está entre os informados como parâmetros
var buscarOperacoesPorCodigos = function(codes, callback) {

	model.Operation.findAll( { where: { code: { $in: codes} }, attributes: ['id', 'name', 'code', 'description'] } ).then(function (operations) {
		if (operations.length == 0) {
			console.log(new Date() + " Pesquisa por Operações com retorno vazio");
		}
		callback(null, operations);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
		callback(err, null);
	});

}

//Realiza a busca de Operações cujo atributos correspondam com os valores repassados como parâmetro
var buscarOperacoes = function(name, code, description, callback) {

	var name = "%" + name + "%";
	var code = "%" + code + "%";
	var description = "%" + description + "%";

	model.Operation.findAll( { where: { name: { $iLike: name }, code: { $iLike: code }, description: { $iLike: description } }, attributes: ['id', 'name', 'code', 'description'] } ).then(function (operations) {				
		if (operations.length == 0) {
			console.log(new Date() + " Pesquisa por Operação com retorno vazio");
		}
		callback(null, operations);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Õperações: " + err);
		callback(err, null);
	});

}

module.exports.buscarTodosPapeis = buscarTodosPapeis;
module.exports.buscarPapelPorId = buscarPapelPorId;
module.exports.buscarPapeis = buscarPapeis;
module.exports.incluirPapel = incluirPapel;
module.exports.editarPapel = editarPapel;
module.exports.excluirPapel = excluirPapel;

module.exports.buscarTodasOperacoes = buscarTodasOperacoes;
module.exports.buscarOperacaoPorId = buscarOperacaoPorId;
module.exports.buscarOperacoesPorCodigos = buscarOperacoesPorCodigos;
module.exports.buscarOperacoes = buscarOperacoes;	
