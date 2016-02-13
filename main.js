var db = require('./config/database/db.js');
var model = require('./model/models.js');
var cloRepository = require('./cloRepository.js');
var cloUtils = require('./cloUtils.js');
var administration = require('./administration.js');
var path = require('path');
var fs = require('fs');
var zip = require('adm-zip');
var express = require('express');
var app = express();
var http = require('http');
var server = http.Server(app);
var multer = require('multer');

var serverAddress = 'http://localhost';

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
};

app.use(multer({dest:"./sent"}))

app.set('views', './views')
app.set('view engine', 'ejs');

app.get('/', function(req, res) {  
  res.render('pages/index', {'messages': null});
});

// ***** Gerenciamento dos Objetos de Aprendizagem Customizáveis *****

app.get('/incluir_oac', function (req, res) {
	res.render('pages/incluir_oac');
});

app.get('/pesquisar_oac', function (req, res) {
	res.render('pages/pesquisar_oac', {'result' : null, 'title' : ''});
});

app.get('/incluir_versao_customizada', function (req, res) {
	res.render('pages/incluir_versao_customizada');
});

app.get('/pesquisarOAC', function (req, res)
{
	var title = req.query.title;
	db.mongo.open(function(err, mongoConnection)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Pesquisar OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.buscarOAC(mongoConnection, title, function(err, result) {
			
			if(err) {
				console.error(new Date() + " Erro ao Pesquisar OAC: " + err);
				res.render('pages/index', {'messages': ["Erro ao Pesquisar OAC: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			mongoConnection.close();
			res.render('pages/pesquisar_oac', {'result' : result, 'title' : title});
		});
	});
});

app.get('/visualizarMetadadosOAC', function (req, res) {
	
	var idOAC = req.query.id;
	db.mongo.open(function(err, mongoConnection) {
		if(err) { 
			console.error(new Date() + " Erro ao Visualizar Metadados de OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Visualizar Metadados de OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.buscarMetadadosOAC(mongoConnection, idOAC, function(err, metadados) {
			
			if(err) {
				console.error(new Date() + " Erro ao Visualizar Metadados de OAC: " + err);
				res.render('pages/index', {'messages': ["Erro ao Visualizar Metadados de OAC: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			mongoConnection.close();
			res.render('pages/visualizar_metadados_oac', {'metadados' : metadados});
		});
	});
});

app.get("/baixarOAC", function(res, req)
{
	//Lê a identificação do DescritorDeArquivoExecutável e o diretório em que 
	//o arquivo executável está localizado no servidor
	var id = req.req.query.id
	var filePath = req.req.query.filePath

	db.mongo.open(function(err, mongoConnection)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Baixar OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Baixar OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}
		
		//Chama a função que gera e retorna o arquivo representando o OAC
		cloRepository.gerarPacoteOAC(mongoConnection, id, filePath, function(err, oac)
		{			
			if(err) {
				console.error(new Date() + " Erro ao Baixar OAC: " + err);
				res.render('pages/index', {'messages': ["Erro ao Baixar OAC: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			//Informa ao navegador o tipo de arquivo a ser enviado. Neste caso, zip.
			res.res.set('Content-Type', 'application/zip');
			//Informa o nome do arquivo ao navegador.
			res.res.set('Content-Disposition', 'attachment; filename=' + path.basename(filePath, path.extname(filePath)) + '.zip');
			//Informa o tamanho do arquivo ao navegador.
			res.res.set('Content-Length', oac.toBuffer().length);
			//Envia o arquivo em forma de bytes.
			res.res.send(oac.toBuffer());

			mongoConnection.close();
		});
	});
});

app.get('/listarVersoesCustomizadas', function (req, res) {
	
	var idSourceVersion = req.query.id;
	var filePath = req.query.filePath;

	db.mongo.open(function(err, mongoConnection) {
		if(err) { 
			console.error(new Date() + " Erro ao Listar Versões Customizadas: " + err);
			res.render('pages/index', {'messages': ["Erro ao Listar Versões Customizadas: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.buscarVersoesCustomizadas(mongoConnection, idSourceVersion, filePath, function(err, versoesCustomizadas) {
			
			if(err) {
				console.error(new Date() + " Erro ao Listar Versões Customizadas: " + err);
				res.render('pages/index', {'messages': ["Erro ao Listar Versões Customizadas: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			mongoConnection.close();
			res.render('pages/listar_versoes_customizadas', {'versoesCustomizadas' : versoesCustomizadas});
		});
	});
});

app.get('/listarVersoesCustomizadasDeVersao', function (req, res) {
	
	var idSourceVersion = req.query.id;
	var filePath = req.query.filePath;

	db.mongo.open(function(err, mongoConnection) {
		if(err) { 
			console.error(new Date() + " Erro ao Listar Versões Customizadas: " + err);
			res.render('pages/index', {'messages': ["Erro ao Listar Versões Customizadas: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.buscarVersoesCustomizadas(mongoConnection, idSourceVersion, filePath, function(err, versoesCustomizadas) {
			
			if(err) {
				console.error(new Date() + " Erro ao Listar Versões Customizadas: " + err);
				res.render('pages/index', {'messages': ["Erro ao Listar Versões Customizadas: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}
			
			res.setHeader('Content-Type', 'application/json');
    		res.send(JSON.stringify(versoesCustomizadas));

    		mongoConnection.close();
		});
	});
});

app.get("/baixarVersaoCustomizada", function(res, req) {
	//Lê a identificação do DescritorDeVersao, do DescritorDeArquivoExecutável e o diretório em que 
	//o arquivo executável está localizado no servidor
	var id = req.req.query.id;
	var idRootVersion = req.req.query.idRootVersion;
	var filePath = req.req.query.filePath;

	db.mongo.open(function(err, mongoConnection)
	{
		if(err)
		{
			console.error(new Date() + " Erro ao Baixar Versão Customizada: " + err);
			res.render('pages/index', {'messages': ["Erro ao Versão Customizada OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}
		
		//Chama a função que gera e retorna o arquivo representando a Versão Customizada
		cloRepository.gerarPacoteVersao(mongoConnection, id, idRootVersion, filePath, function(err, versaoCustomizada)
		{			
			if(err) {
				console.error(new Date() + " Erro ao Baixar Versão Customizada: " + err);
				res.render('pages/index', {'messages': ["Erro ao Baixar Versão Customizada: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			//Informa ao navegador o tipo de arquivo a ser enviado. Neste caso, zip.
			res.res.set('Content-Type', 'application/zip');
			//Informa o nome do arquivo ao navegador.
			res.res.set('Content-Disposition', 'attachment; filename=' + path.basename(filePath, path.extname(filePath)) + '.zip');
			//Informa o tamanho do arquivo ao navegador.
			res.res.set('Content-Length', versaoCustomizada.toBuffer().length);
			//Envia o arquivo em forma de bytes.
			res.res.send(versaoCustomizada.toBuffer());

			mongoConnection.close();
		});
	});
});

app.post("/incluirOAC", function(req, res)
{
	var oac = new zip(req.files.fileInput.path);
	var manifestData = cloUtils.lerManifest(oac);
	console.log(new Date() + " Versao do MANIFEST.MF: " + manifestData.version);

	db.mongo.open(function(err, mongoConnection) {
		
		if(err) {
			console.error(new Date() + " Erro ao Incluir OAC: " + err);
			res.render('pages/index', {'messages': ["Erro ao Incluir OAC: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.criarOAC(mongoConnection, oac, manifestData.fileNames, function(err) {

			if(err) {
				console.error(new Date() + " Erro ao Incluir OAC: " + err);
				res.render('pages/index', {'messages': ["Erro ao Incluir OAC: " + err], 'messagesTypes': ["danger"]});
				db.mongo.close();
			}

			fs.unlink(req.files.fileInput.path, function(err) {
				if(err) {
					console.error(new Date() + " Erro ao Incluir OAC: " + err);
					res.render('pages/index', {'messages': ["Erro ao Incluir OAC: " + err], 'messagesTypes': ["danger"]});
				}
				console.log(new Date() + " Arquivo temporário \"" + path.basename(req.files.fileInput.path) + "\" removido com sucesso.");
			});

			mongoConnection.close();
			res.render('pages/index', {'messages': ["OAC incluído com sucesso"], 'messagesTypes': ["success"]});
		});
	});
});

app.post("/incluirVersaoCustomizada", function(req, res)
{
	var title = req.body.title;
	var description = req.body.description;
	var languages = req.body.languages.split(";");
	var oac = new zip(req.files.fileInput.path);

	db.mongo.open(function(err, mongoConnection)
	{
		if(err) {
			console.error(new Date() + " Erro ao Incluir Versão Customizada: " + err);
			res.render('pages/index', {'messages': ["Erro ao Incluir Versão Customizada: " + err], 'messagesTypes': ["danger"]});
			db.mongo.close();
		}

		cloRepository.criarVersaoCustomizada(mongoConnection, oac, title, description, languages, function(err, result) {				
			
			if(err) {
				console.error(new Date() + " Erro ao Incluir Versão Customizada: " + err);
				res.render('pages/index', {'messages': ["Erro ao Incluir Versão Customizada: " + err], 'messagesTypes': ["danger"]});
			}

			fs.unlink(req.files.fileInput.path, function(err) {
				if(err) {
					console.error(new Date() + " Erro ao Incluir Versão Customizada: " + err);
					res.render('pages/index', {'messages': ["Erro ao Incluir Versão Customizada: " + err], 'messagesTypes': ["danger"]});
				}
				console.log(new Date() + " Arquivo temporário \"" + path.basename(req.files.fileInput.path) + "\" removido com sucesso.");
			});
			
			mongoConnection.close();
			res.render('pages/index', {'messages': ["Versão Customizada incluída com sucesso"], 'messagesTypes': ["success"]});
		});
	});
});

// ***** Auto-cadastro *****

app.get('/incluir_usuario', function (req, res) {
	administration.buscarTodosPapeis(function (err, roles) {
		
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Papéis: " + err], 'messagesTypes': ["danger"]});			
		}

		res.render('pages/incluir_usuario', {'roles': roles});
	});	
});

app.post('/incluirUsuario', function (req, res) {

	var name = req.body.name;
	var email = req.body.email;
	var profile = req.body.profile;
	var degreeOfFreedom = req.body.degreeOfFreedom;
	var login = req.body.login;
	var password = req.body.password;
	//Um array é retornado apenas quando mais de um Papel é selecionado
	var roleCodes;
	if ( Array.isArray(req.body.checkRole) ) {
		roleCodes = req.body.checkRole;
	} else {
		roleCodes = new Array(req.body.checkRole);
	}

	administration.buscarPapeisPorCodigos(roleCodes, function (err, roles) {		
		
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Papéis: " + err], 'messagesTypes': ["danger"]});			
		}

		administration.incluirUsuario(name, email, profile, degreeOfFreedom, login, password, roles, function (err, user) {
			
			if(err) {
				console.error(new Date() + " Erro ao Incluir Usuário: " + err);
				res.render('pages/index', {'messages': ["Erro ao Incluir Usuário: " + err], 'messagesTypes': ["danger"]});			
			}

			var urlEmailValidation = serverAddress + "/validarEmail";
			administration.enviarEmailConfirmacaoCadastroUsuario(user.email, user.login, urlEmailValidation).then(function (err) {

				if(err) {
					console.error(new Date() + " Erro ao Enviar Email de Confirmação de Cadastro de Usuário: " + err);
					res.render('pages/index', {'messages': ["Erro ao Enviar Email de Confirmação de Cadastro de Usuário: " + err], 'messagesTypes': ["danger"]});
				}

				user.getRoles().then(function (userRoles) {			
					res.render('pages/visualizar_usuario', {'user' : user, 'userRoles': userRoles, 'messages': ["Usuário " + user.login + " incluído com sucesso", "Você receberá um email para confirmação do cadastro"], 'messagesTypes': ["success", "warning"] } );
				});
			});
		});		
	});
});

// ***** Administração do Repositório *****

app.get('/pesquisar_usuario', function (req, res) {
	res.render('pages/pesquisar_usuario', {'result': null, name: '', email: '', login: '', degreeOfFreedom: '', 'messages': null });
});

app.get('/pesquisarUsuario', function (req, res) {

	var name = req.query.name;
	var email = req.query.email;
	var login = req.query.login;
	var degreeOfFreedom = req.query.degreeOfFreedom;

	administration.buscarUsuarios(name, email, login, degreeOfFreedom, function(err, users) {

		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Usuários: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Usuários: " + err], 'messagesTypes': ["danger"]});			
		}

		res.render('pages/pesquisar_usuario', {'result': users, name: name, login: login, degreeOfFreedom: degreeOfFreedom, 'messages': null });
	});
});

app.get('/editar_usuario', function (req, res) {

	var idUser = req.query.idUser;

	administration.buscarUserPorId(idUser, function (err, role) {
		
		if(!err && !user) {
			err = new Error(" Usuário " + idUser + " não encontrado.");
		}
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Usuário: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Usuário: " + err], 'messagesTypes': ["danger"]});
		} 

		administration.buscarTodosPapeis(function (err, roles) {
		
			if(err) {
				console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
				res.render('pages/index', {'messages': ["Erro ao Pesquisar Papéis: " + err], 'messagesTypes': ["danger"]});			
			}

			user.getRoles().then(function (userRoles) {			
				res.render('pages/editar_usuario', {'user' : user, 'userRoles': userRoles, 'roles': roles});
			});			
		});
	});
});

app.post('/editarUsuario', function (req, res) {

	var idUser = req.body.idUser;
	var name = req.body.name;
	var email = req.body.email;
	var profile = req.body.profile;
	var degreeOfFreedom = req.body.degreeOfFreedom;
	var login = req.body.login;
	//Um array é retornado apenas quando mais de um Papel é selecionado
	var roleCodes;
	if ( Array.isArray(req.body.checkRole) ) {
		roleCodes = req.body.checkRole;
	} else {
		roleCodes = new Array(req.body.checkRole);
	}

	administration.buscarPapeisPorCodigos(roleCodes, function (err, roles) {		
		
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Papéis: " + err], 'messagesTypes': ["danger"]});			
		}
	
		administration.editarUsuario(idUser, name, email, profile, degreeOfFreedom, login, roles, function (err, user) {
			
			if(err) {
				console.error(new Date() + " Erro ao Editar Usuário: " + err);
				res.render('pages/index', {'messages': ["Erro ao Editar Usuário: " + err], 'messagesTypes': ["danger"]});			
			}

			user.getRoles().then(function (userRoles) {
				res.render('pages/visualizar_usuario', {'user' : user, 'userRoles': userRoles, 'messages': ["Usuário " + idUser + " atualizado com sucesso"], 'messagesTypes': ["success"] } );
			});
		});		
	});
});

app.get('/excluirUsuario', function (req, res) {

	var idUser = req.query.idUser;
	var userLogin = req.query.userLogin;
	
	administration.excluirUsuario(idUser, userLogin, function(err) {

		if(err) {
			console.error(new Date() + " Erro ao Excluir Usuário: " + err);
			res.render('pages/index', {'messages': ["Erro ao Excluir Usuário: " + err], 'messagesTypes': ["danger"]});			
		}

		res.render('pages/pesquisar_usuario', {'result': null, name: '', email: '', login: '', degreeOfFreedom: '', 'messages': ["Usuário " + idUser + " - " + userLogin + " excluído com sucesso"], 'messagesTypes': ["success"] });
	});
});

app.get('/pesquisar_papel', function (req, res) {
	res.render('pages/pesquisar_papel', {'result': null, name: '', code: '', description: '', 'messages': null });
});

app.get('/pesquisarPapel', function (req, res) {

	var name = req.query.name;
	var code = req.query.code;
	var description = req.query.description;

	administration.buscarPapeis(name, code, description, function(err, roles) {

		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Papéis: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Papéis: " + err], 'messagesTypes': ["danger"]});			
		}

		res.render('pages/pesquisar_papel', {'result': roles, name: name, code: code, description: description, 'messages': null });
	});
});

app.get('/incluir_papel', function (req, res) {
	administration.buscarTodasOperacoes(function (err, operations) {
		
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Operações: " + err], 'messagesTypes': ["danger"]});			
		}

		var role = model.Role.build({});
		res.render('pages/manter_papel', {'role' : role, 'roleOperations': null, 'operations': operations});
	});
});

app.post('/incluirPapel', function (req, res) {

	var name = req.body.name;
	var code = req.body.code;
	var description = req.body.description;
	//Um array é retornado apenas quando mais de uma Operação é selecionada
	var operationCodes;
	if ( Array.isArray(req.body.checkOperation) ) {
		operationCodes = req.body.checkOperation;
	} else {
		operationCodes = new Array(req.body.checkOperation);
	}

	administration.buscarOperacoesPorCodigos(operationCodes, function (err, operations) {		
		
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Operações: " + err], 'messagesTypes': ["danger"]});			
		}

		administration.incluirPapel(name, code, description, operations, function (err, role) {
			
			if(err) {
				console.error(new Date() + " Erro ao Incluir Papel: " + err);
				res.render('pages/index', {'messages': ["Erro ao Incluir Papel: " + err], 'messagesTypes': ["danger"]});			
			}

			role.getOperations().then(function (roleOperations) {			
				res.render('pages/visualizar_papel', {'role' : role, 'roleOperations': roleOperations, 'messages': ["Papel " + role.id + " - " + role.code + " incluído com sucesso"], 'messagesTypes': ["success"] } );
			});
		});		
	});
});

app.get('/editar_papel', function (req, res) {

	var idRole = req.query.idRole;

	administration.buscarPapelPorId(idRole, function (err, role) {
		
		if(!err && !role) {
			err = new Error(" Papel " + idRole + " não encontrado.");
		}
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Papel: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Papel: " + err], 'messagesTypes': ["danger"]});
		} 

		administration.buscarTodasOperacoes(function (err, operations) {
		
			if(err) {
				console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
				res.render('pages/index', {'messages': ["Erro ao Pesquisar Operações: " + err], 'messagesTypes': ["danger"]});			
			}

			role.getOperations().then(function (roleOperations) {			
				res.render('pages/manter_papel', {'role' : role, 'roleOperations': roleOperations, 'operations': operations});
			});			
		});
	});
});

app.post('/editarPapel', function (req, res) {

	var idRole = req.body.idRole;
	var name = req.body.name;
	var code = req.body.code;
	var description = req.body.description;
	//Um array é retornado apenas quando mais de uma Operação é selecionada
	var operationCodes;
	if ( Array.isArray(req.body.checkOperation) ) {
		operationCodes = req.body.checkOperation;
	} else {
		operationCodes = new Array(req.body.checkOperation);
	}

	administration.buscarOperacoesPorCodigos(operationCodes, function (err, operations) {		
		
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Operações: " + err], 'messagesTypes': ["danger"]});			
		}
	
		administration.editarPapel(idRole, name, code, description, operations, function (err, role) {
			
			if(err) {
				console.error(new Date() + " Erro ao Editar Papel: " + err);
				res.render('pages/index', {'messages': ["Erro ao Editar Papel: " + err], 'messagesTypes': ["danger"]});			
			}

			role.getOperations().then(function (roleOperations) {			
				res.render('pages/visualizar_papel', {'role' : role, 'roleOperations': roleOperations, 'messages': ["Papel " + idRole + " atualizado com sucesso"], 'messagesTypes': ["success"] } );
			});
		});		
	});
});

app.get('/excluirPapel', function (req, res) {

	var idRole = req.query.idRole;
	var roleCode = req.query.roleCode;
	
	administration.excluirPapel(idRole, roleCode, function(err) {

		if(err) {
			console.error(new Date() + " Erro ao Excluir Papel: " + err);
			res.render('pages/index', {'messages': ["Erro ao Excluir Papel: " + err], 'messagesTypes': ["danger"]});			
		}

		res.render('pages/pesquisar_papel', {'result': null, name: '', code: '', description: '', 'messages': ["Papel " + idRole + " - " + roleCode + " excluído com sucesso"], 'messagesTypes': ["success"] });
	});
});

app.get('/pesquisar_operacao', function (req, res) {
	res.render('pages/pesquisar_operacao', {'result': null, name: '', code: '', description: '', 'messages': null });
});

app.get('/pesquisarOperacao', function (req, res) {

	var name = req.query.name;
	var code = req.query.code;
	var description = req.query.description;

	administration.buscarOperacoes(name, code, description, function(err, operations) {

		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Operações: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Operações: " + err], 'messagesTypes': ["danger"]});
		}

		res.render('pages/pesquisar_operacao', {'result': operations, name: name, code: code, description: description, 'messages': null });
	});
});

app.get('/incluir_operacao', function (req, res) {	
	var operation = model.Operation.build({});
	res.render('pages/manter_operacao', {'operation' : operation});	
});

app.post('/incluirOperacao', function (req, res) {

	var name = req.body.name;
	var code = req.body.code;
	var description = req.body.description;
	
	administration.incluirOperacao(name, code, description, function (err, operation) {
		
		if(err) {
			console.error(new Date() + " Erro ao Incluir Operação: " + err);
			res.render('pages/index', {'messages': ["Erro ao Incluir Operação: " + err], 'messagesTypes': ["danger"]});			
		}
		
		res.render('pages/visualizar_operacao', {'operation' : operation, 'messages': ["Operação " + operation.id + " - " + operation.code + " incluída com sucesso"], 'messagesTypes': ["success"] } );		
	});		
});

app.get('/editar_operacao', function (req, res) {

	var idOperation = req.query.idOperation;

	administration.buscarOperacaoPorId(idOperation, function (err, operation) {
		
		if(!err && !operation) {
			err = new Error(" Operação " + idOperation + " não encontrada.");
		}
		if(err) {
			console.error(new Date() + " Erro ao Pesquisar Operação: " + err);
			res.render('pages/index', {'messages': ["Erro ao Pesquisar Operação: " + err], 'messagesTypes': ["danger"]});
		} 
		
		res.render('pages/manter_operacao', {'operation' : operation});	
	});
});

app.post('/editarOperacao', function (req, res) {

	var idOperation = req.body.idOperation;
	var name = req.body.name;
	var code = req.body.code;
	var description = req.body.description;	

	administration.editarOperacao(idOperation, name, code, description, function (err, operation) {
		
		if(err) {
			console.error(new Date() + " Erro ao Editar Operação: " + err);
			res.render('pages/index', {'messages': ["Erro ao Editar Operação: " + err], 'messagesTypes': ["danger"]});			
		}

		res.render('pages/visualizar_operacao', {'operation' : operation, 'messages': ["Operação " + idOperation + " atualizada com sucesso"], 'messagesTypes': ["success"] } );
	});			
});

app.get('/excluirOperacao', function (req, res) {

	var idOperation = req.query.idOperation;
	var operationCode = req.query.operationCode;
	
	administration.excluirOperacao(idOperation, operationCode, function(err) {

		if(err) {
			console.error(new Date() + " Erro ao Excluir Operação: " + err);
			res.render('pages/index', {'messages': ["Erro ao Excluir Operação: " + err], 'messagesTypes': ["danger"]});			
		}

		res.render('pages/pesquisar_operacao', {'result': null, name: '', code: '', description: '', 'messages': ["Operação " + idOperation + " - " + operationCode + " excluída com sucesso"], 'messagesTypes': ["success"] });
	});
});

// ***** Inicialização do Servidor *****

app.use(express.static(__dirname + '/views/images'));
app.use(express.static(__dirname + '/views/styles'));
//Servidor fica ouvindo a porta 80.
server.listen(80);