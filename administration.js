var model = require('./model/models.js');
var mail = require('./config/mail/mail.js');
var console = require('console');
var bcrypt = require('bcrypt-nodejs');

//Inclui um novo Usuário no banco de dados, com base nos valores passados como parâmetro
var incluirUsuario = function(name, email, profile, login, password, callback) {
	
	var hashPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(8));
	var emailValidated = false;
	var userValidated = false;

	model.User.create( { userValidated: userValidated, name: name, email: email, emailValidated: emailValidated, profile: profile, degree_of_freedom: 0, login: login, password: hashPassword } ).then(function (user) {
		console.log(new Date() + " Novo Usuário inserido: " + user.login + ".");		
		callback(null, user);		
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Incluir Usuário: " + err);
		callback(err, null);
	});

}

//Envia um email confirmando a realização de um cadastro de Usuário com o email passado como parâmetro
var enviarEmailConfirmacaoCadastroUsuario = function(email, login, urlEmailValidation, callback) {

	var validationCode = bcrypt.hashSync(login, bcrypt.genSaltSync(8));
	var urlEmailValidation = urlEmailValidation + "?email=" + email + "&code=" + validationCode;

	var mailOptions = {
	    from: "CLO Web Platform <clowebplatform@gmail.com>",
	    to: email,
	    subject: "Confirmação de Cadastro - CLO Web Platform",
	    html: "<b>Bem-vindo à CLO Web Platform</b><br /><br />" +
	    		"<p>Foi realizado um cadastro de usuário na CLO Web Platform com este endereço de email.</p>" +
	    		"<p>Para confirmar o cadastro, clique no link a seguir: " + urlEmailValidation + "</p><br />" +
	    		"<p>Caso não tenha realizado o cadastro, desconsiderar este email.</p><br />" +
	    		"<p>Atenciosamente, <br />" +
	    		"Equipe da CLO Web Platform</p>"
	};

	mail.sendMail(mailOptions, function(err, info){
	   
	    if(err){
	        console.error(new Date() + " Erro ao Enviar Email de Confirmação de Cadastro de Usuário: " + err);
	        callback(err);
	    }	    
	    
	    console.log(new Date() + " Enviado Email de Confirmação de Cadastro de Usuário: " + login + ".");
	    callback(null);
	});
}

//Realiza a busca de um Usuário específico, com base no identificador passado como parâmetro
var buscarUsuarioPorId = function(idUser, callback) {

	model.User.findById( idUser , { attributes: ['id', 'name', 'email', 'emailValidated', 'profile', 'degree_of_freedom', 'login', 'userValidated' ], include: [ { model: model.Role, as: "Roles"} ] } ).then(function (user) {
		if (!user) {
			console.log(new Date() + " Pesquisa por Usuário com retorno vazio");
		}
		callback(null, user);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Usuário: " + err);
		callback(err, null);
	});

}

//Realiza a busca de um Usuário específico que não esteja com o seu email validado, com base no email passado como parâmetro
var buscarUsuarioPorEmailNaoValidado = function(email, callback) {

	model.User.findOne( { where: { email: email, emailValidated: false }, attributes: ['id', 'name', 'email', 'emailValidated', 'profile', 'degree_of_freedom', 'login', 'userValidated' ], include: [ { model: model.Role, as: "Roles"} ] } ).then(function (user) {
		if (!user) {
			console.log(new Date() + " Pesquisa por Usuário com retorno vazio");
		}
		callback(null, user);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Usuário: " + err);
		callback(err, null);
	});

}

//Realiza a busca de Usuários cujos atributos correspondam com os valores repassados como parâmetro
var buscarUsuarios = function(name, email, login, degreeOfFreedom, emailValidated, userValidated, callback) {

	var name = "%" + name + "%";
	var email = "%" + email + "%";
	var login = "%" + login + "%";
	var where = { name: { $iLike: name }, email: { $iLike: email }, login: { $iLike: login }, emailValidated: emailValidated, userValidated: userValidated };
	if ( degreeOfFreedom != '') {
		where.degree_of_freedom = degreeOfFreedom;	
	} 
	if ( !emailValidated ) {
		where.emailValidated = false;	
	}
	if ( !userValidated ) {
		where.userValidated = false;	
	}


	model.User.findAll( { where: where, attributes: ['id', 'name', 'email', 'emailValidated', 'degree_of_freedom', 'login', 'profile', 'userValidated'], order: 'login' } ).then(function (users) {				
		if (users.length == 0) {
			console.log(new Date() + " Pesquisa por Usuário com retorno vazio");
		}
		callback(null, users);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Usuários: " + err);
		callback(err, null);
	});

}

//Valida email de confirmação da realização de cadastro de Usuário, com base no email e no código passados como parâmetro
var validarEmailConfirmacaoCadastroUsuario = function(email, code, callback) {

	buscarUsuarioPorEmailNaoValidado(email, function(err, user) {

		if(err){
	        console.error(new Date() + " Erro ao Validar Email de Confirmação de Cadastro de Usuário: " + err);
	        callback(err);
	    }	    

		if (user) {
			var emailValidated = bcrypt.compareSync(user.login, code);
			
			if (emailValidated) {				
				model.User.update( { emailValidated: true }, { where: { id: user.id }, returning: true } ).then(function (updatedUsers) {										
			
					if(updatedUsers[0] == 1) {
						user = updatedUsers[1][0];
						console.log(new Date() + " Usuário atualizado: " + user.id + " - " + user.login + ".");											
						console.log(new Date() + " Email de Confirmação de Cadastro de Usuário Validado: " + user.login + ".");
	    				callback(null);
					} else {
						callback(new Error(" Erro ao Atualizar Campo de Validação de Email do Usuário."));
					}	

				}).catch(function (err) {		
					console.error(new Date() + " Erro ao Atualizar Campo de Validação de Email do Usuário: " + err);
					callback(err);
				});			
			} else {
				callback(new Error(" Código de validação não corresponde."));	
			}

		} else {
			callback(new Error(" Usuário com o email " + email + " não encontrado."));
		}	
	});
}

//Envia um email informando que o cadastro do Usuário passado como parâmetro foi validado
var enviarEmailValidacaoCadastroUsuario = function(email, user, callback) {

	user.getRoles().then(function (userRoles) {	

		var roles = '';
		for (var i = 0; i < userRoles.length; i++) {
			roles += userRoles[i].name + '; ';			
		}

		var mailOptions = {
	    from: "CLO Web Platform <clowebplatform@gmail.com>",
	    to: email,
	    subject: "Validação de Cadastro - CLO Web Platform",
	    html: "<b>Parabéns! Seu cadastro foi validado com sucesso</b><br /><br />" +
	    		"<p>A equipe da CLO Web Platform realizou a validação do seu cadastro, tornando-o apto a utilizar a plataforma.</p>" +
	    		"<p>O(s) Papel(is) de acesso ao ambiente e o Grau de Liberdade foram definidos de acordo com a análise do seu perfil. Seguem os dados após o processo de validação:</p><br />" +
	    		"<p><b>Nome:</b> " + user.name + "<br />" +
	    		"<b>Email:</b> " + user.email + "<br />" +
	    		"<b>Login:</b> " + user.login + "<br />" +
	    		"<b>Perfil:</b> " + user.profile + "<br />" +
	    		"<b>Grau de Liberdade:</b> " + user.degree_of_freedom + "<br />" +
	    		"<b>Papéis:</b> " + roles + "</p><br />" +
	    		"<p>Atenciosamente, <br />" +
	    		"Equipe da CLO Web Platform</p>"
		};

		mail.sendMail(mailOptions, function(err, info){
		   
		    if(err){
		        console.error(new Date() + " Erro ao Enviar Email de Validação de Cadastro de Usuário: " + err);
		        callback(err);
		    }	    
		    
		    console.log(new Date() + " Enviado Email de Validação de Cadastro de Usuário: " + user.id + ".");
		    callback(null);
		});					
	});
}

//Edita um Usuário no banco de dados, com base nos valores passados como parâmetro
var editarUsuario = function(idUser, name, email, profile, degreeOfFreedom, login, roles, callback) {

	model.User.update( { name: name, email: email, profile: profile, degree_of_freedom: degreeOfFreedom, login: login, userValidated: true }, { where: { id: idUser }, returning: true } ).then(function (updatedUsers) {
		
		if(updatedUsers[0] == 1) {
			user = updatedUsers[1][0];
			console.log(new Date() + " Usuário atualizado: " + user.id + " - " + user.login + ".");
			
			user.setRoles(roles).then(function (roles) {
				console.log(new Date() + " Atualizados os Papéis do Usuário: " + user.id + " - " + user.login + ".");			
				callback(null, user);
			}).catch(function (err) {		
				console.error(new Date() + " Erro ao Atualizar os Papéis do Usuário: " + err);
				callback(err, null);
			});	
		} else {
			callback(new Error(" Usuário " + idUser + " não encontrado."), null);
		}	
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Editar Usuário: " + err);
		callback(err, null);
	});

}

//Exclui um Usuário no banco de dados, com base nos valores passados como parâmetro
var excluirUsuario = function(idUser, userLogin, callback) {

	model.User.destroy( { where: { id: idUser, login: userLogin } } ).then(function (qtyDeletedUser) {
		
		if(qtyDeletedUser == 1) {			
			console.log(new Date() + " Usuário excluído: " + idUser + " - " + userLogin + ".");
			callback(null);				
		} else {
			callback(new Error(" Usuário " + idUser + " - " + userLogin + " não encontrado."));
		}	
	}).catch(function (err) {
		console.error(new Date() + " Erro ao Excluir Usuário: " + err);
		callback(err);
	});

}

//Realiza a busca de todos os Papéis contidos no banco de dados
var buscarTodosPapeis = function(callback) {

	model.Role.findAll( { attributes: ['id', 'name', 'code', 'description'], include: [ { model: model.Operation, as: "Operations"} ], order: 'code' } ).then(function (roles) {				
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

//Realiza a busca de Papéis cujo código está entre os informados como parâmetros
var buscarPapeisPorCodigos = function(codes, callback) {

	model.Role.findAll( { where: { code: { $in: codes} }, attributes: ['id', 'name', 'code', 'description'], order: 'code' } ).then(function (roles) {
		if (roles.length == 0) {
			console.log(new Date() + " Pesquisa por Papéis com retorno vazio");
		}
		callback(null, roles);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
		callback(err, null);
	});

}

//Realiza a busca de Papéis cujos atributos correspondam com os valores repassados como parâmetro
var buscarPapeis = function(name, code, description, callback) {

	var name = "%" + name + "%";
	var code = "%" + code + "%";
	var description = "%" + description + "%";

	model.Role.findAll( { where: { name: { $iLike: name }, code: { $iLike: code }, description: { $iLike: description } }, attributes: ['id', 'name', 'code', 'description'], order: 'code' } ).then(function (roles) {				
		if (roles.length == 0) {
			console.log(new Date() + " Pesquisa por Papel com retorno vazio");
		}
		callback(null, roles);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
		callback(err, null);
	});

}

//Inclui um novo Papel no banco de dados, com base nos valores passados como parâmetro
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

//Edita um Papel no banco de dados, com base nos valores passados como parâmetro
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

	model.Operation.findAll( { attributes: ['id', 'name', 'code', 'description'], order: 'code' } ).then(function (operations) {				
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

	model.Operation.findAll( { where: { code: { $in: codes} }, attributes: ['id', 'name', 'code', 'description'], order: 'code' } ).then(function (operations) {
		if (operations.length == 0) {
			console.log(new Date() + " Pesquisa por Operações com retorno vazio");
		}
		callback(null, operations);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
		callback(err, null);
	});

}

//Realiza a busca de Operações cujos atributos correspondam com os valores repassados como parâmetro
var buscarOperacoes = function(name, code, description, callback) {

	var name = "%" + name + "%";
	var code = "%" + code + "%";
	var description = "%" + description + "%";

	model.Operation.findAll( { where: { name: { $iLike: name }, code: { $iLike: code }, description: { $iLike: description } }, attributes: ['id', 'name', 'code', 'description'], order: 'code' } ).then(function (operations) {				
		if (operations.length == 0) {
			console.log(new Date() + " Pesquisa por Operação com retorno vazio");
		}
		callback(null, operations);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
		callback(err, null);
	});

}

//Inclui uma nova Operação no banco de dados, com base nos valores passados como parâmetro
var incluirOperacao = function(name, code, description, callback) {

	model.Operation.create( { name: name, code: code, description: description } ).then(function (operation) {
		console.log(new Date() + " Nova Operação inserida: " + operation.id + " - " + operation.code + ".");
		callback(null, operation);
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Incluir Operação: " + err);
		callback(err, null);
	});

}

//Edita uma Operação no banco de dados, com base nos valores passados como parâmetro
var editarOperacao = function(idOperation, name, code, description, callback) {

	model.Operation.update( { name: name, code: code, description: description }, { where: { id: idOperation }, returning: true } ).then(function (updatedOperations) {
		
		if(updatedOperations[0] == 1) {
			operation = updatedOperations[1][0];
			console.log(new Date() + " Operação atualizada: " + operation.id + " - " + operation.code + ".");
			callback(null, operation);			
		} else {
			callback(new Error(" Operação " + idOperation + " não encontrada."), null);
		}	
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Editar Operação: " + err);
		callback(err, null);
	});

}

//Exclui uma Operação no banco de dados, com base nos valores passados como parâmetro
var excluirOperacao = function(idOperation, operationCode, callback) {

	model.Operation.destroy( { where: { id: idOperation, code: operationCode } } ).then(function (qtyDeletedOperation) {
		
		if(qtyDeletedOperation == 1) {			
			console.log(new Date() + " Operação excluída: " + idOperation + " - " + operationCode + ".");
			callback(null);				
		} else {
			callback(new Error(" Operação " + idOperation + " - " + operationCode + " não encontrada."));
		}	
	}).catch(function (err) {		
		console.error(new Date() + " Erro ao Excluir Operação: " + err);
		callback(err);
	});

}

module.exports.incluirUsuario = incluirUsuario;
module.exports.enviarEmailConfirmacaoCadastroUsuario = enviarEmailConfirmacaoCadastroUsuario;
module.exports.validarEmailConfirmacaoCadastroUsuario = validarEmailConfirmacaoCadastroUsuario;
module.exports.buscarUsuarioPorId = buscarUsuarioPorId;
module.exports.buscarUsuarioPorEmailNaoValidado = buscarUsuarioPorEmailNaoValidado;
module.exports.buscarUsuarios = buscarUsuarios;
module.exports.enviarEmailValidacaoCadastroUsuario = enviarEmailValidacaoCadastroUsuario;
module.exports.editarUsuario = editarUsuario;
module.exports.excluirUsuario = excluirUsuario;

module.exports.buscarTodosPapeis = buscarTodosPapeis;
module.exports.buscarPapelPorId = buscarPapelPorId;
module.exports.buscarPapeisPorCodigos = buscarPapeisPorCodigos;
module.exports.buscarPapeis = buscarPapeis;
module.exports.incluirPapel = incluirPapel;
module.exports.editarPapel = editarPapel;
module.exports.excluirPapel = excluirPapel;

module.exports.buscarTodasOperacoes = buscarTodasOperacoes;
module.exports.buscarOperacaoPorId = buscarOperacaoPorId;
module.exports.buscarOperacoesPorCodigos = buscarOperacoesPorCodigos;
module.exports.buscarOperacoes = buscarOperacoes;	
module.exports.incluirOperacao = incluirOperacao;
module.exports.editarOperacao = editarOperacao;
module.exports.excluirOperacao = excluirOperacao;