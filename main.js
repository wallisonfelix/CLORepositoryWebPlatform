var db = require('./config/database/db.js');
var passport = require('./config/auth/passport.js');
var jwt = require('./config/auth/jwt.js');
var model = require('./model/models.js');
var clover = require('./clover.js');
var cloUtils = require('./cloUtils.js');
var administration = require('./administration.js');
var path = require('path');
var fs = require('fs');
var zip = require('adm-zip');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var express = require('express');
var app = express();
var http = require('http');
var server = http.Server(app);
var multer = require('multer');
var bodyParser = require('body-parser');

var serverAddress = 'http://localhost';

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(multer({dest:"./sent"}));

// Configurações para Autenticação e Autorização
app.use(cookieParser());
app.use(session({ secret: '12345', cookie: { maxAge: 600000 }}));
app.use(passport.initialize());
app.use(passport.session());

app.set('views', './views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {  
	if (req.user) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': null});
		});
	} else {
		res.render('pages/index', { authenticatedUser: null, 'messages': null});
	}
});

// ***** Autenticação *****

//Verifica se o Usuário que acessa está logado
function isLoggedIn(req, res, next) {

   	if (req.isAuthenticated()) {
       	return next();
   	}
    redirectNotLoggedIn(req, res);
}

//Verifica se o Usuário que acessa não está logado
function isLoggedOut(req, res, next) {

    if (!req.isAuthenticated()) {
        return next();
    }
    redirectNotLoggedOut(req, res);
}

//Verifica se o Usuário que acessa possui a permissão para a Operação passada como parâmetro
function hasPermission(operationCode, req, res, next) {
	req.user.operationCodes(function(operationCodes) {
       	if (operationCodes.indexOf(operationCode) != -1) {
       		return next();		
       	} else {
			redirectNotHasOperation(req, res);				
		}
	});
}

//Redireciona para tela inicial com mensagem padrão de que deve estar autenticado
function redirectNotLoggedIn(req, res) { 
    res.render('pages/index', { authenticatedUser: null, 'messages': ["Acesso negado! Esta funcionalidade demanda autenticação no sistema"], 'messagesTypes': ["danger"] });
}

//Redireciona para tela inicial com mensagem padrão de que deve não estar autenticado
function redirectNotLoggedOut(req, res) { 
	req.user.operationCodes(function(operationCodes) {
    	res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': ["Acesso negado! Esta funcionalidade está disponível apenas para não autenticados no sistema"], 'messagesTypes': ["danger"] });
    });
}

//Redireciona para tela inicial com mensagem padrão de que não possui permissão
function redirectNotHasOperation(req, res) { 
	if (req.user) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': ["Acesso negado! Você não possui autorização para esta funcionalidade"], 'messagesTypes': ["danger"] });
		});
	} else {
		res.render('pages/index', { authenticatedUser: null, 'messages': ["Acesso negado! Você não possui autorização para esta funcionalidade"], 'messagesTypes': ["danger"] });
	}
}

//Loga o erro e redireciona para tela inicial com a mensagem de erro passada como parâmetro
function redirectError(errorMessage, error, req, res) { 
	console.error(new Date() + " " + errorMessage + ": " + error);
	if (req.user) {
		req.user.operationCodes(function(operationCodes) {			
			res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': [errorMessage + ": " + error.message], 'messagesTypes': ["danger"]});
		});
	} else {
		res.render('pages/index', { authenticatedUser: null, 'messages': [errorMessage + ": " + error.message], 'messagesTypes': ["danger"]});
	}
}

app.get('/login', isLoggedOut, function (req, res) {
	res.render('pages/login', { authenticatedUser: req.user, 'messages': null});	
});

app.post('/realizarLogin', isLoggedOut, function (req, res) {
	
	if (req.body.login && req.body.password) {
		passport.authenticate('local-login', function (err, user) {

			if(err) {			
				console.error(new Date() + " Erro ao Realizar Login: " + err);
				res.render('pages/login', { authenticatedUser: null, 'messages': [err], 'messagesTypes': ["danger"]});
			} else {
				req.logIn(user, function(err) {
			      
			      	if(err) {
						console.error(new Date() + " Erro ao Realizar Login: " + err);
						res.render('pages/login', { authenticatedUser: null, 'messages': [err], 'messagesTypes': ["danger"]});
						return;
					} 

					req.user.operationCodes(function(operationCodes) {
						res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': ["Login realizado com sucesso"], 'messagesTypes': ["success"] });	
					});				
			    });		
			}
		})(req, res);
	} else {
		console.error(new Date() + " Erro ao Realizar Login: Campos obrigatórios não informados");
		res.render('pages/login', { authenticatedUser: null, 'messages': ["Campos obrigatórios não informados"], 'messagesTypes': ["danger"]});
	}
});

app.get('/realizarLogout', isLoggedIn, function (req, res) {
	 req.logout();

	 res.render('pages/index', { authenticatedUser: null, 'messages': ["Logout realizado com sucesso"], 'messagesTypes': ["warning"] });
});

app.get('/recuperar_senha', isLoggedOut, function (req, res) {
	res.render('pages/recuperar_senha', { authenticatedUser: null }); 	
});

app.post('/recuperarSenha', isLoggedOut, function (req, res) {
	
	var email = req.body.email;
	
	administration.buscarUsuarioPorEmail(email, true, function (err, user) {
		
		if (!err && !user) {		
			err = new Error("Usuário com email validado " + email + " não encontrado.");			
		}

		if(err) {
			redirectError("Erro ao Pesquisar Usuário", err, req, res);	
			return;		
		} 

		var urlPasswordRedefine = serverAddress + "/redefinir_senha";
		administration.enviarEmailRedefinicaoSenha(user.email, user.login, urlPasswordRedefine, function (err) {

			if(err) {
				redirectError("Erro ao Enviar Email para Redefinição de Senha", err, req, res);	
				return;			
			}
	
			res.render('pages/index', { authenticatedUser: null, 'messages': ["Você receberá um email para a redefinição de senha"], 'messagesTypes': ["warning"] } );
		});
	});	
});

app.get('/redefinir_senha', isLoggedOut, function (req, res) {

	var email = req.query.email;
	var code = req.query.code;

	res.render('pages/redefinir_senha', { authenticatedUser: null,  email: email, code: code });	
});

app.post('/redefinirSenha', isLoggedOut, function (req, res) {
	
	var email = req.body.email;
	var code = req.body.code;
	var newPassword = req.body.newPassword;

	administration.redefinirSenha(newPassword, email, code, function (err) {

		if(err) {
			redirectError("Erro ao Redefinir Senha de Usuário", err, req, res);			
			return;	
		}
			
		res.render('pages/login', { authenticatedUser: null,  'messages': ["Senha redefinda com sucesso"], 'messagesTypes': ["success", "success"] } );
	});
});

// ***** Auto-cadastro *****
app.get('/incluir_usuario', isLoggedOut, function (req, res) {

	administration.buscarTodasAtividades(function (err, activities) {

		if(err) {
			redirectError("Erro ao Pesquisar Atividades", err, req, res);
			return;
		}
		
		res.render('pages/incluir_usuario', { authenticatedUser: null, activities: activities }); 	
	});	
});

app.post('/incluirUsuario', isLoggedOut, function (req, res) {

	var name = req.body.name;
	var email = req.body.email;	
	var profile = req.body.profile;	
	var login = req.body.login;
	var password = req.body.password;
	//Um array é retornado apenas quando mais de uma Atividade é selecionada
	var activityCodes;
	if ( Array.isArray(req.body.activities) ) {
		activityCodes = req.body.activities;
	} else {
		activityCodes = new Array(req.body.activities);
	}

	administration.buscarAtividadesPorCodigos(activityCodes, function (err, activities) {		
				
		if(err) {
			redirectError("Erro ao Pesquisar Atividades", err, req, res);
			return;
		}

		administration.incluirUsuario(name, email, activities, profile, login, password, function (err, user) {
			
			if(err) {
				redirectError("Erro ao Incluir Usuário", err, req, res);			
				return;
			}

			var urlEmailValidation = serverAddress + "/validarEmail";
			administration.enviarEmailConfirmacaoCadastroUsuario(user.email, user.login, urlEmailValidation, function (err) {

				if(err) {
					redirectError("Erro ao Enviar Email de Confirmação de Cadastro de Usuário", err, req, res);	
					return;			
				}
				
				user.getActivities().then(function (userActivities) {
					res.render('pages/visualizar_usuario', { authenticatedUser: null, 'user' : user, 'userRoles': null, 'userActivities': userActivities, 'messages': ["Usuário " + user.login + " incluído com sucesso", "Você receberá um email para confirmação do cadastro"], 'messagesTypes': ["success", "warning"] } );
				});
			});
		});		
	});		
});

app.get('/validarEmail', isLoggedOut, function (req, res) {

	var email = req.query.email;
	var code = req.query.code;

	administration.validarEmailConfirmacaoCadastroUsuario(email, code, function (err) {

		if(err) {
			redirectError("Erro ao Validar Email de Confirmação de Cadastro de Usuário", err, req, res);
			return;	
		}
			
		res.render('pages/index', { authenticatedUser: null, 'messages': ["Email validado com sucesso", "Em breve você receberá um email com o resultado da análise do seu cadastro"], 'messagesTypes': ["success", "warning"] } );
	});
});

// ***** Administração do Repositório *****

app.get('/pesquisar_usuario', isLoggedIn, function(req, res, next) {
		return hasPermission('pesquisar_usuario', req, res, next);
	}, function (req, res) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/pesquisar_usuario', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': null, name: '', email: '', login: '', degreeOfFreedom: '', emailValidated: null, userValidated: null, 'messages': null });
		});
	}
);

app.get('/pesquisarUsuario', isLoggedIn, function(req, res, next) {
		return hasPermission('pesquisar_usuario', req, res, next);
	}, function (req, res) {

		var name = req.query.name;
		var email = req.query.email;
		var login = req.query.login;
		var degreeOfFreedom = req.query.degreeOfFreedom;
		var emailValidated = req.query.checkEmailValidated;
		var userValidated = req.query.checkUserValidated;

		administration.buscarUsuarios(name, email, login, degreeOfFreedom, emailValidated, userValidated, function(err, users) {

			if(err) {
				redirectError("Erro ao Pesquisar Usuários", err, req, res);		
				return;		
			}

			req.user.operationCodes(function(operationCodes) {
				res.render('pages/pesquisar_usuario', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': users, name: name, email: email, login: login, degreeOfFreedom: degreeOfFreedom, emailValidated: emailValidated, userValidated: userValidated, 'messages': null });
			});
		});
	}
);

app.get('/editar_usuario', isLoggedIn, function(req, res, next) {
		return hasPermission('editar_usuario', req, res, next);
	}, function (req, res) {

		var idUser = req.query.idUser;

		administration.buscarUsuarioPorId(idUser, function (err, user) {		

			if (!err && !user) {		
				err = new Error("Usuário " + idUser + " não encontrado.");			
			} else if (!err && !user.emailValidated) {		
				err = new Error("Usuário " + idUser + " com email validado não encontrado.");			
			}

			if(err) {
				redirectError("Erro ao Pesquisar Usuários", err, req, res);	
				return;			
			} 

			administration.buscarTodosPapeis(function (err, roles) {

				if(err) {
					redirectError("Erro ao Pesquisar Papéis", err, req, res);
					return;
				}

				administration.buscarTodasAtividades(function (err, activities) {

					if(err) {
						redirectError("Erro ao Pesquisar Atividades", err, req, res);
						return;
					}
					

					user.getRoles().then(function (userRoles) {		
						req.user.operationCodes(function(operationCodes) {
							user.getActivities().then(function (userActivities) {		
								res.render('pages/editar_usuario', { authenticatedUser: req.user, operationCodes: operationCodes, 'user' : user, 'userRoles': userRoles, 'userActivities': userActivities, 'roles': roles, 'activities': activities});
							});
						});
					});			
				});
			});
		});
	}
);

app.post('/validarUsuario', isLoggedIn, function(req, res, next) {
		return hasPermission('validar_usuario', req, res, next);
	}, function (req, res) {

		var idUser = req.body.idUser;
		var userValidated = req.body.checkUserValidated;

		if (userValidated) {		
			var name = req.body.name;
			var email = req.body.email;
			var profile = req.body.profile;
			var degreeOfFreedom = req.body.degreeOfFreedom;
			var login = req.body.login;
			//Um array é retornado apenas quando mais de uma Atividade é selecionada
			var activityCodes;
			if ( Array.isArray(req.body.activities) ) {
				activityCodes = req.body.activities;
			} else {
				activityCodes = new Array(req.body.activities);
			}
			//Um array é retornado apenas quando mais de um Papel é selecionado
			var roleCodes;
			if ( Array.isArray(req.body.checkRole) ) {
				roleCodes = req.body.checkRole;
			} else {
				roleCodes = new Array(req.body.checkRole);
			}

			administration.buscarAtividadesPorCodigos(activityCodes, function (err, activities) {		
				
				if(err) {
					redirectError("Erro ao Pesquisar Atividades", err, req, res);
					return;
				}

				administration.buscarPapeisPorCodigos(roleCodes, function (err, roles) {		
					
					if(err) {
						redirectError("Erro ao Pesquisar Papéis", err, req, res);
						return;
					}
				
					administration.editarUsuario(idUser, name, email, activities, profile, degreeOfFreedom, login, roles, function (err, user) {
						
						if(err) {
							redirectError("Erro ao Editar Usuário", err, req, res);
							return;
						}

						administration.enviarEmailValidacaoCadastroUsuario(user.email, user, function (err) {

							if(err) {
								redirectError("Erro ao Enviar Email de Validação de Cadastro de Usuário", err, req, res);
								return;
							}

							user.getRoles().then(function (userRoles) {
								req.user.operationCodes(function(operationCodes) {
									user.getActivities().then(function (userActivities) {					
										res.render('pages/visualizar_usuario', { authenticatedUser: req.user, operationCodes: operationCodes, 'user' : user, 'userRoles': userRoles, 'userActivities': userActivities, 'messages': ["Usuário " + idUser + " validado com sucesso", "Um email com o resultado da análise do cadastro foi enviado ao Usuário"], 'messagesTypes': ["success", "warning"] } );
									});		
								});
							});
						});
					});		
				});
			});
		} else {
			req.user.operationCodes(function(operationCodes) {			
				res.render('pages/pesquisar_usuario', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': null, name: '', email: '', login: '', degreeOfFreedom: '', emailValidated: null, userValidated: null, 'messages': ["Validação do Usuário " + idUser + " não confirmada.", "Atualização do Usuário " + idUser + " não realizada."], 'messagesTypes': ["danger", "warning"] } );
			});
		}
	}
);

app.post('/editarUsuario', isLoggedIn, function(req, res, next) {
		return hasPermission('editar_usuario', req, res, next);
	}, function (req, res) {

		var idUser = req.body.idUser;
		var name = req.body.name;
		var email = req.body.email;		
		var profile = req.body.profile;
		var degreeOfFreedom = req.body.degreeOfFreedom;
		var login = req.body.login;
		//Um array é retornado apenas quando mais de uma Atividade é selecionada
		var activityCodes;
		if ( Array.isArray(req.body.activities) ) {
			activityCodes = req.body.activities;
		} else {
			activityCodes = new Array(req.body.activities);
		}
		//Um array é retornado apenas quando mais de um Papel é selecionado
		var roleCodes;
		if ( Array.isArray(req.body.checkRole) ) {
			roleCodes = req.body.checkRole;
		} else {
			roleCodes = new Array(req.body.checkRole);
		}

		administration.buscarAtividadesPorCodigos(activityCodes, function (err, activities) {		
				
			if(err) {
				redirectError("Erro ao Pesquisar Atividades", err, req, res);
				return;
			}

			administration.buscarPapeisPorCodigos(roleCodes, function (err, roles) {		
				
				if(err) {
					redirectError("Erro ao Pesquisar Papéis", err, req, res);	
					return;			
				}
			
				administration.editarUsuario(idUser, name, email, activities, profile, degreeOfFreedom, login, roles, function (err, user) {
					
					if(err) {
						redirectError("Erro ao Editar Usuário", err, req, res);	
						return;				
					}

					user.getRoles().then(function (userRoles) {
						req.user.operationCodes(function(operationCodes) {
							user.getActivities().then(function (userActivities) {
								res.render('pages/visualizar_usuario', { authenticatedUser: req.user, operationCodes: operationCodes, 'user' : user, 'userRoles': userRoles, 'userActivities': userActivities, 'messages': ["Usuário " + idUser + " atualizado com sucesso"], 'messagesTypes': ["success"] } );
							});		
						});		
					});
				});		
			});
		});
	}
);

app.get('/excluirUsuario', isLoggedIn, function(req, res, next) {
		return hasPermission('excluir_usuario', req, res, next);
	}, function (req, res) {

		var idUser = req.query.idUser;
		var userLogin = req.query.userLogin;
		
		administration.excluirUsuario(idUser, userLogin, function(err) {

			if(err) {
				redirectError("Erro ao Excluir Usuário", err, req, res);
				return;					
			}

			req.user.operationCodes(function(operationCodes) {	
				res.render('pages/pesquisar_usuario', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': null, name: '', email: '', login: '', degreeOfFreedom: '', emailValidated: null, userValidated: null, 'messages': ["Usuário " + idUser + " - " + userLogin + " excluído com sucesso"], 'messagesTypes': ["success"] });
			});		
		});
	}
);

app.get('/pesquisar_papel', isLoggedIn, function(req, res, next) {
		return hasPermission('pesquisar_papel', req, res, next);
	}, function (req, res) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/pesquisar_papel', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': null, name: '', code: '', description: '', 'messages': null });
		});	
	}
);

app.get('/pesquisarPapel', isLoggedIn, function(req, res, next) {
		return hasPermission('pesquisar_papel', req, res, next);
	}, function (req, res) {

		var name = req.query.name;
		var code = req.query.code;
		var description = req.query.description;

		administration.buscarPapeis(name, code, description, function(err, roles) {

			if(err) {
				redirectError("Erro ao Pesquisar Papéis", err, req, res);	
				return;			
			}

			req.user.operationCodes(function(operationCodes) {
				res.render('pages/pesquisar_papel', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': roles, name: name, code: code, description: description, 'messages': null });
			});		
		});
	}
);

app.get('/incluir_papel', isLoggedIn, function(req, res, next) {
		return hasPermission('incluir_papel', req, res, next);
	}, function (req, res) {
		administration.buscarTodasOperacoes(function (err, operations) {
			
			if(err) {
				redirectError("Erro ao Pesquisar Operações", err, req, res);	
				return;			
			}

			var role = model.Role.build({});
			req.user.operationCodes(function(operationCodes) {
				res.render('pages/manter_papel', { authenticatedUser: req.user, operationCodes: operationCodes, 'role' : role, 'roleOperations': null, 'operations': operations});
			});		
		});
	}
);

app.post('/incluirPapel', isLoggedIn, function(req, res, next) {
		return hasPermission('incluir_papel', req, res, next);
	}, function (req, res) {

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
				redirectError("Erro ao Pesquisar Operações", err, req, res);	
				return;				
			}

			administration.incluirPapel(name, code, description, operations, function (err, role) {
				
				if(err) {
					redirectError("Erro ao Incluir Papel", err, req, res);
					return;
				}

				role.getOperations().then(function (roleOperations) {			
					req.user.operationCodes(function(operationCodes) {
						res.render('pages/visualizar_papel', { authenticatedUser: req.user, operationCodes: operationCodes, 'role' : role, 'roleOperations': roleOperations, 'messages': ["Papel " + role.id + " - " + role.code + " incluído com sucesso"], 'messagesTypes': ["success"] } );
					});		
				});
			});		
		});
	}
);

app.get('/editar_papel', isLoggedIn, function(req, res, next) {
		return hasPermission('editar_papel', req, res, next);
	}, function (req, res) {

		var idRole = req.query.idRole;

		administration.buscarPapelPorId(idRole, function (err, role) {
			
			if(!err && !role) {
				err = new Error("Papel " + idRole + " não encontrado.");
			}
			if(err) {
				redirectError("Erro ao Pesquisar Papel", err, req, res);				
			} 

			administration.buscarTodasOperacoes(function (err, operations) {
			
				if(err) {
					redirectError("Erro ao Pesquisar Operações", err, req, res);
					return;
				}

				role.getOperations().then(function (roleOperations) {
					req.user.operationCodes(function(operationCodes) {
						res.render('pages/manter_papel', { authenticatedUser: req.user, operationCodes: operationCodes, 'role' : role, 'roleOperations': roleOperations, 'operations': operations});
					});			
				});
			});
		});
	}
);

app.post('/editarPapel', isLoggedIn, function(req, res, next) {
		return hasPermission('editar_papel', req, res, next);
	}, function (req, res) {

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
				redirectError("Erro ao Pesquisar Operações", err, req, res);	
				return;			
			}
		
			administration.editarPapel(idRole, name, code, description, operations, function (err, role) {
				
				if(err) {
					redirectError("Erro ao Editar Papel", err, req, res);	
					return;				
				}

				role.getOperations().then(function (roleOperations) {	
					req.user.operationCodes(function(operationCodes) {		
						res.render('pages/visualizar_papel', { authenticatedUser: req.user, operationCodes: operationCodes, 'role' : role, 'roleOperations': roleOperations, 'messages': ["Papel " + idRole + " atualizado com sucesso"], 'messagesTypes': ["success"] } );
					});
				});
			});		
		});
	}
);

app.get('/excluirPapel', isLoggedIn, function(req, res, next) {
		return hasPermission('excluir_papel', req, res, next);
	}, function (req, res) {

		var idRole = req.query.idRole;
		var roleCode = req.query.roleCode;
		
		administration.excluirPapel(idRole, roleCode, function(err) {

			if(err) {
				redirectError("Erro ao Excluir Papel", err, req, res);	
				return;			
			}

			req.user.operationCodes(function(operationCodes) {		
				res.render('pages/pesquisar_papel', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': null, name: '', code: '', description: '', 'messages': ["Papel " + idRole + " - " + roleCode + " excluído com sucesso"], 'messagesTypes': ["success"] });
			});		
		});
	}
);

app.get('/pesquisar_operacao', isLoggedIn, function(req, res, next) {
		return hasPermission('pesquisar_operacao', req, res, next);
	}, function (req, res) {
		req.user.operationCodes(function(operationCodes) {		
			res.render('pages/pesquisar_operacao', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': null, name: '', code: '', description: '', 'messages': null });
		});		
	}
);

app.get('/pesquisarOperacao', isLoggedIn, function(req, res, next) {
		return hasPermission('pesquisar_operacao', req, res, next);
	}, function (req, res) {

		var name = req.query.name;
		var code = req.query.code;
		var description = req.query.description;

		administration.buscarOperacoes(name, code, description, function(err, operations) {

			if(err) {
				redirectError("Erro ao Pesquisar Operações", err, req, res);
				return;					
			}

			req.user.operationCodes(function(operationCodes) {	
				res.render('pages/pesquisar_operacao', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': operations, name: name, code: code, description: description, 'messages': null });
			});		
		});
	}
);

app.get('/incluir_operacao', isLoggedIn, function(req, res, next) {
		return hasPermission('incluir_operacao', req, res, next);
	}, function (req, res) {
		var operation = model.Operation.build({});
		req.user.operationCodes(function(operationCodes) {	
			res.render('pages/manter_operacao', { authenticatedUser: req.user, operationCodes: operationCodes, 'operation' : operation});	
		});	
	}
);

app.post('/incluirOperacao', isLoggedIn, function(req, res, next) {
		return hasPermission('incluir_operacao', req, res, next);
	}, function (req, res) {

		var name = req.body.name;
		var code = req.body.code;
		var description = req.body.description;
		
		administration.incluirOperacao(name, code, description, function (err, operation) {
			
			if(err) {
				redirectError("Erro ao Incluir Operação", err, req, res);	
				return;				
			}
			
			req.user.operationCodes(function(operationCodes) {				
				res.render('pages/visualizar_operacao', { authenticatedUser: req.user, operationCodes: operationCodes, 'operation' : operation, 'messages': ["Operação " + operation.id + " - " + operation.code + " incluída com sucesso"], 'messagesTypes': ["success"] } );		
			});		
		});		
	}
);

app.get('/editar_operacao', isLoggedIn, function(req, res, next) {
		return hasPermission('editar_operacao', req, res, next);
	}, function (req, res) {

		var idOperation = req.query.idOperation;

		administration.buscarOperacaoPorId(idOperation, function (err, operation) {
			
			if(!err && !operation) {
				err = new Error("Operação " + idOperation + " não encontrada.");
			}
			if(err) {
				redirectError("Erro ao Pesquisar Operação", err, req, res);	
				return;			
			} 
			
			req.user.operationCodes(function(operationCodes) {	
				res.render('pages/manter_operacao', { authenticatedUser: req.user, operationCodes: operationCodes, 'operation' : operation});	
			});
		});
	}
);

app.post('/editarOperacao', isLoggedIn, function(req, res, next) {
		return hasPermission('editar_operacao', req, res, next);
	}, function (req, res) {

		var idOperation = req.body.idOperation;
		var name = req.body.name;
		var code = req.body.code;
		var description = req.body.description;	

		administration.editarOperacao(idOperation, name, code, description, function (err, operation) {
			
			if(err) {
				redirectError("Erro ao Editar Operação", err, req, res);	
				return;			
			}

			req.user.operationCodes(function(operationCodes) {	
				res.render('pages/visualizar_operacao', { authenticatedUser: req.user, operationCodes: operationCodes, 'operation' : operation, 'messages': ["Operação " + idOperation + " atualizada com sucesso"], 'messagesTypes': ["success"] } );
			});				
		});			
	}
);

app.get('/excluirOperacao', isLoggedIn, function(req, res, next) {
		return hasPermission('excluir_operacao', req, res, next);
	}, function (req, res) {

		var idOperation = req.query.idOperation;
		var operationCode = req.query.operationCode;
		
		administration.excluirOperacao(idOperation, operationCode, function(err) {

			if(err) {
				redirectError("Erro ao Excluir Operação", err, req, res);	
				return;			
			}

			req.user.operationCodes(function(operationCodes) {	
				res.render('pages/pesquisar_operacao', { authenticatedUser: req.user, operationCodes: operationCodes, 'result': null, name: '', code: '', description: '', 'messages': ["Operação " + idOperation + " - " + operationCode + " excluída com sucesso"], 'messagesTypes': ["success"] });
			});	
		});
	}
);

// ***** Gerenciamento dos Objetos de Aprendizagem Customizáveis *****

app.get('/ajuda', function (req, res) {
	if (req.user) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/ajuda', { authenticatedUser: req.user, operationCodes: operationCodes });
		});
	} else {
		res.render('pages/ajuda', { authenticatedUser: null });	
	}
});

app.get('/incluir_oac', isLoggedIn, function(req, res, next) {
		return hasPermission('incluir_oac', req, res, next);
	}, function (req, res) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/incluir_oac', { authenticatedUser: req.user, operationCodes: operationCodes });
		});
	}
);

app.get('/pesquisar_oac', function (req, res) {
	if (req.user) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/pesquisar_oac', { authenticatedUser: req.user, operationCodes: operationCodes, 'result' : null, 'title' : '', 'description': '', 'keyWord': ''});
		});
	} else {
		res.render('pages/pesquisar_oac', { authenticatedUser: null, 'result' : null, 'title' : '', 'description': '', 'keyWord': ''});	
	}
});

app.get('/incluir_versao_customizada', isLoggedIn, function(req, res, next) {
		return hasPermission('incluir_versao_customizada', req, res, next);
	}, function (req, res) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/incluir_versao_customizada', { authenticatedUser: req.user, operationCodes: operationCodes });
		});	
	}
);

app.get('/pesquisarOAC', function (req, res) {
	
	var title = req.query.title;
	var description = req.query.description;
	var keyWord = req.query.keyWord;

	db.mongo.open(function(err, mongoConnection) {

		if (err) {
			redirectError("Erro ao Pesquisar OAC", err, req, res);
			db.mongo.close();
			return;
		}

		clover.buscarOAC(mongoConnection, title, description, keyWord, function(err, result) {			

			if(err) {
				redirectError("Erro ao Pesquisar OAC", err, req, res);
				db.mongo.close();
				return;
			}

			mongoConnection.close();
			if (req.user) {
				req.user.operationCodes(function(operationCodes) {
					res.render('pages/pesquisar_oac', { authenticatedUser: req.user, operationCodes: operationCodes, 'result' : result, 'title' : title, 'description': description, 'keyWord': keyWord});
				});
			} else {
				res.render('pages/pesquisar_oac', { authenticatedUser: null, 'result' : result, 'title' : title, 'description': description, 'keyWord': keyWord});
			}
		});
	});
});

app.get('/visualizarMetadadosOAC', function (req, res) {
	
	var idOAC = req.query.id;

	db.mongo.open(function(err, mongoConnection) {
		if(err) { 
			redirectError("Erro ao Visualizar Metadados de OAC", err, req, res);			
			db.mongo.close();
			return;
		}

		clover.buscarMetadadosOAC(mongoConnection, idOAC, function(err, metadados) {
			
			if(err) {
				redirectError("Erro ao Visualizar Metadados de OAC", err, req, res);
				db.mongo.close();
				return;
			}

			mongoConnection.close();
			
			if (req.user) {
				req.user.operationCodes(function(operationCodes) {
					res.render('pages/visualizar_metadados_oac', { authenticatedUser: req.user, operationCodes: operationCodes, 'metadados' : metadados});
				});
			} else {
				res.render('pages/visualizar_metadados_oac', { authenticatedUser: null, 'metadados' : metadados});
			}
		});
	});
});

app.get("/baixarOAC", function(req, res) {
	//Lê a identificação do DescritorDeArquivoExecutável e o diretório em que 
	//o arquivo executável está localizado no servidor
	var id = req.query.id
	var filePath = req.query.filePath

	var userId = 0;
	var degreeOfFreedom = 0;
	if (req.user) {
		userId = req.user.id;
		degreeOfFreedom = req.user.degree_of_freedom;
	}

	db.mongo.open(function(err, mongoConnection) {
		
		if (err) {
			redirectError("Erro ao Baixar OAC", err, req, res);
			db.mongo.close();
			return;
		}
		
		//Chama a função que gera e retorna o arquivo representando o OAC
		clover.gerarPacoteOAC(mongoConnection, id, filePath, userId, degreeOfFreedom, function(err, oac) {			
			
			if(err) {
				redirectError("Erro ao Baixar OAC", err, req, res);
				db.mongo.close();
				return;
			}

			//Informa ao navegador o tipo de arquivo a ser enviado. Neste caso, zip.
			res.set('Content-Type', 'application/zip');
			//Informa o nome do arquivo ao navegador.
			res.set('Content-Disposition', 'attachment; filename="' + path.basename(filePath, path.extname(filePath)) + '.zip"');			
			//Envia o arquivo em forma de bytes.
			oac.pipe(res);

			mongoConnection.close();
		});
	});
});

app.get('/listarVersoesCustomizadas', function (req, res) {
	
	var idSourceVersion = req.query.id;
	var filePath = req.query.filePath;

	db.mongo.open(function(err, mongoConnection) {
		if(err) { 
			redirectError("Erro ao Listar Versões Customizadas", err, req, res);
			db.mongo.close();
			return;
		}

		clover.buscarVersoesCustomizadas(mongoConnection, idSourceVersion, filePath, function(err, versoesCustomizadas) {
			
			if(err) {
				redirectError("Erro ao Listar Versões Customizadas", err, req, res);
				db.mongo.close();
				return;
			}

			mongoConnection.close();	

			if (req.user) {
				req.user.operationCodes(function(operationCodes) {
					res.render('pages/listar_versoes_customizadas', { authenticatedUser: req.user, operationCodes: operationCodes, 'versoesCustomizadas' : versoesCustomizadas});
				});
			} else {
				res.render('pages/listar_versoes_customizadas', { authenticatedUser: null, 'versoesCustomizadas' : versoesCustomizadas});
			}
		});
	});
});

app.get('/listarVersoesCustomizadasDeVersao', function (req, res) {
	
	var idSourceVersion = req.query.id;
	var filePath = req.query.filePath;

	db.mongo.open(function(err, mongoConnection) {
		
		if(err) { 
			redirectError("Erro ao Listar Versões Customizadas", err, req, res);
			db.mongo.close();
			return;
		}

		clover.buscarVersoesCustomizadas(mongoConnection, idSourceVersion, filePath, function(err, versoesCustomizadas) {
			
			if(err) {
				redirectError("Erro ao Listar Versões Customizadas", err, req, res);
				db.mongo.close();
				return;
			}
			
			res.setHeader('Content-Type', 'application/json');
    		res.send(JSON.stringify(versoesCustomizadas));

    		mongoConnection.close();
		});
	});
});

app.get("/baixarVersaoCustomizada", function(req, res) {
	//Lê a identificação do DescritorDeVersao, do DescritorDeArquivoExecutável e o diretório em que 
	//o arquivo executável está localizado no servidor
	var id = req.query.id;
	var idRootVersion = req.query.idRootVersion;
	var filePath = req.query.filePath;

	var userId = 0;
	var degreeOfFreedom = 0;
	if (req.user) {
		userId = req.user.id;
		degreeOfFreedom = req.user.degree_of_freedom;
	}

	db.mongo.open(function(err, mongoConnection) {
		
		if(err) {
			redirectError("Erro ao Baixar Versão Customizada", err, req, res);			
			db.mongo.close();
			return;
		}
		
		//Chama a função que gera e retorna o arquivo representando a Versão Customizada
		clover.gerarPacoteVersao(mongoConnection, id, idRootVersion, filePath, userId, degreeOfFreedom, function(err, versaoCustomizada) {			
			
			if(err) {
				redirectError("Erro ao Baixar Versão Customizada", err, req, res);
				db.mongo.close();
				return;
			}

			//Informa ao navegador o tipo de arquivo a ser enviado. Neste caso, zip.
			res.set('Content-Type', 'application/zip');
			//Informa o nome do arquivo ao navegador.			
			res.set('Content-Disposition', 'attachment; filename="' + path.basename(filePath, path.extname(filePath)) + '.zip"');
			//Envia o arquivo em forma de bytes.
			versaoCustomizada.pipe(res);

			mongoConnection.close();
		});
	});
});

app.post("/incluirOAC", isLoggedIn, function(req, res, next) {
		return hasPermission('incluir_oac', req, res, next);
	}, function(req, res) {

		var userId = req.user.id;
		var oac = new zip(req.files.fileInput.path);
		var manifestData = cloUtils.lerManifest(oac);
		console.log(new Date() + " Versao do MANIFEST.MF: " + manifestData.version);

		db.mongo.open(function(err, mongoConnection) {
			
			if(err) {
				redirectError("Erro ao Incluir OAC", err, req, res);
				db.mongo.close();
				return;
			}

			clover.criarOAC(mongoConnection, oac, userId, manifestData.fileNames, function(err, result) {

				if(err) {
					redirectError("Erro ao Incluir OAC", err, req, res);
					db.mongo.close();
					return;
				}

				fs.unlink(req.files.fileInput.path, function(err) {
					if(err) {
						console.error(new Date() + " Erro ao Remover Arquivo Temporário: " + err);
						req.user.operationCodes(function(operationCodes) {
							res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': ["OAC incluído com sucesso", "Erro ao Remover Arquivo Temporário"], 'messagesTypes': ["success", "danger"]});
						});
						return;
					}
					console.log(new Date() + " Arquivo Temporário \"" + path.basename(req.files.fileInput.path) + "\" removido com sucesso.");
				});

				mongoConnection.close();	

				req.user.operationCodes(function(operationCodes) {
					res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': ["OAC incluído com sucesso"], 'messagesTypes': ["success"]});
				});				
			});
		});
	}
);

app.post("/incluirVersaoCustomizada", isLoggedIn, function(req, res, next) {
		return hasPermission('incluir_versao_customizada', req, res, next);
	}, function(req, res) {
		
		var userId = req.user.id;
		var degreeOfFreedom = req.user.degree_of_freedom;
		var title = req.body.title;		
		var languages = req.body.languages.split(";");
		var description = req.body.description;
		var oac = new zip(req.files.fileInput.path);

		db.mongo.open(function(err, mongoConnection) {
			
			if(err) {
				redirectError("Erro ao Incluir Versão Customizada", err, req, res);			
				db.mongo.close();
				return;
			}

			clover.criarVersaoCustomizada(mongoConnection, oac, userId, degreeOfFreedom, title, description, languages, function(err, result) {				
				
				if(err) {
					redirectError("Erro ao Incluir Versão Customizada", err, req, res);
					db.mongo.close();
					return;
				}

				fs.unlink(req.files.fileInput.path, function(err) {
					if(err) {
						console.error(new Date() + " Erro ao Remover Arquivo Temporário: " + err);
						req.user.operationCodes(function(operationCodes) {
							res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': ["Versão Customizada incluída com sucesso", "Erro ao Remover Arquivo Temporário"], 'messagesTypes': ["success", "danger"]});
						});
						return;
					}
					console.log(new Date() + " Arquivo temporário \"" + path.basename(req.files.fileInput.path) + "\" removido com sucesso.");
				});
				
				mongoConnection.close();								
				req.user.operationCodes(function(operationCodes) {
					res.render('pages/index', { authenticatedUser: req.user, operationCodes: operationCodes, 'messages': ["Versão Customizada incluída com sucesso"], 'messagesTypes': ["success"]});
				});				
			});
		});
	}
);

// ***** Application Programming Interface (API) de Interação com o CLORepoistory *****

app.get('/developer', isLoggedIn, function (req, res) {
		req.user.operationCodes(function(operationCodes) {
			res.render('pages/developer', { authenticatedUser: req.user, operationCodes: operationCodes });
		});
	}
);

app.post('/api/obter-token-acesso', function (req, res) {		

	if (req.body.login && req.body.password) {
		passport.authenticate('local-login', function (err, user) {
			if(err) {
				jwt.sendResponse(400, 'text/plain', null, err.message, req, res);
			} else {
				jwt.generateToken(user, req, res);
			}
		})(req, res);
	} else {
		jwt.sendResponse(400, 'text/plain', null, "Campos obrigatórios não informados", req, res);
	}
});

app.post("/api/oacs", jwt.hasValidToken, function(req, res, next) {
		return jwt.hasPermission('incluir_oac', req, res, next);
	}, function(req, res) {

		var userId = req.user.id;
		var fileInput = req.files.fileInput;

		if (fileInput && fileInput.path) {

			var oac = new zip(fileInput.path);
			var manifestData = cloUtils.lerManifest(oac);
			console.log(new Date() + " Versao do MANIFEST.MF: " + manifestData.version);

			db.mongo.open(function(err, mongoConnection) {
				
				if(err) {
					jwt.sendResponse(500, 'text/plain', null, "Erro ao Incluir AOC: " + err.message, req, res);
					db.mongo.close();
					return;
				}

				clover.criarOAC(mongoConnection, oac, userId, manifestData.fileNames, function(err, result) {

					if(err) {
						jwt.sendResponse(500, 'text/plain', null, "Erro ao Incluir AOC: " + err.message, req, res);
						db.mongo.close();
						return;
					}

					fs.unlink(fileInput.path, function(err) {
						if(err) {
							console.error(new Date() + " Erro ao Remover Arquivo Temporário: " + err);
						} else {
							console.log(new Date() + " Arquivo temporário \"" + path.basename(fileInput.path) + "\" removido com sucesso.");
						}

						clover.buscarIdDescritoresDeArquivoExecutavelPorIdRaiz(mongoConnection, result._id, function(err, idDescritoresDeArquivosExecutaveis) {			
						
							if(err) {
								jwt.sendResponse(500, 'text/plain', null, "Erro ao Incluir AOC: " + err.message, req, res);
								db.mongo.close();
								return;
							}

							var uri = "";
							for(var i = 0; i < idDescritoresDeArquivosExecutaveis.length; i++) {
								if (i > 0) {
									uri = uri + "; ";
								}
								uri = uri + "/api/oacs/" + result._id + "/" + idDescritoresDeArquivosExecutaveis[i];
							}

							mongoConnection.close();

							jwt.sendResponse(201, 'text/plain', null, uri, req, res);
						});		
					});											
				});
			});
		} else {
			jwt.sendResponse(400, 'text/plain', null, "Campos obrigatórios não informados", req, res);
		}	
	}
);

app.get("/api/oacs/:oacId/:daeId", jwt.hasValidToken, function(req, res) {	

	var oacId = req.params.oacId;
	var daeId = req.params.daeId;
	var userId = req.user.id;
	var degreeOfFreedom = req.user.degree_of_freedom;

	db.mongo.open(function(err, mongoConnection) {
		
		if(err) {
			jwt.sendResponse(500, 'text/plain', null, "Erro ao Baixar AOC: " + err.message, req, res);
			db.mongo.close();
			return;
		}
		
		clover.buscarDescritorPorId(mongoConnection, "DescritoresDeArquivosExecutaveis", daeId, {"id_clo": 1, "locations": 1}, function(err, descritorDeArquivoExecutavel) {

			if(err) {
				jwt.sendResponse(500, 'text/plain', null, "Erro ao Baixar AOC: " + err.message, req, res);
				db.mongo.close();
				return;
			}

			if (descritorDeArquivoExecutavel && descritorDeArquivoExecutavel.id_clo == oacId) {			

				var filePath = descritorDeArquivoExecutavel.locations[0];

				clover.gerarPacoteOAC(mongoConnection, daeId, filePath, userId, degreeOfFreedom, function(err, oac) {								

					if(err) {
						jwt.sendResponse(500, 'text/plain', null, "Erro ao Baixar AOC: " + err.message, req, res);
						db.mongo.close();
						return;
					}

					mongoConnection.close();

					jwt.sendResponse(200, 'application/zip', path.basename(filePath, path.extname(filePath)) + '.zip', oac, req, res);			
				});
			} else {
				jwt.sendResponse(404, 'text/plain', null, "OAC não encontrado", req, res);
				db.mongo.close();
			}			
		});
	});
});

app.post("/api/oacs/:oacId/:daeId/versoes-customizadas", jwt.hasValidToken, function(req, res, next) {
		return jwt.hasPermission('incluir_versao_customizada', req, res, next);
	}, function(req, res) {	

		var oacId = req.params.oacId;
		var daeId = req.params.daeId;

		var userId = req.user.id;
		var degreeOfFreedom = req.user.degree_of_freedom;
		var title = req.query.title;		
		var languages = req.query.languages;		
		var description = req.query.description;
		var fileInput = req.files.fileInput;

		if (title && description && languages && fileInput && fileInput.path) {			
		
			languages = languages.split(";");

			db.mongo.open(function(err, mongoConnection) {
				
				if(err) {
					jwt.sendResponse(500, 'text/plain', null, "Erro ao Incluir Versão Customizada: " + err.message, req, res);
					db.mongo.close();
					return;
				}

				clover.buscarDescritorPorId(mongoConnection, "DescritoresDeArquivosExecutaveis", daeId, {"id_clo": 1, "locations": 1}, function(err, descritorDeArquivoExecutavel) {

					if(err) {
						jwt.sendResponse(500, 'text/plain', null, "Erro ao Incluir Versão Customizada: " + err.message, req, res);
						db.mongo.close();
						return;
					}

					if (descritorDeArquivoExecutavel && descritorDeArquivoExecutavel.id_clo == oacId) {												
						
						var oac = new zip(fileInput.path);
						var tokenAsArray = oac.readAsText("token.txt").split(" ");
						var idDescritorOrigem = tokenAsArray[0];	

						clover.buscarDescritorPorId(mongoConnection, "DescritoresDeVersoes", idDescritorOrigem, {"id_parent_version": 1, "id_root_version": 1, "version": 1}, function(err, descritorDeVersao) {

							if(err) {
								jwt.sendResponse(500, 'text/plain', null, "Erro ao Incluir Versão Customizada: " + err.message, req, res);
								db.mongo.close();
								return;
							}

							if (idDescritorOrigem == daeId || (descritorDeVersao && descritorDeVersao.id_root_version == daeId)) {

								clover.criarVersaoCustomizada(mongoConnection, oac, userId, degreeOfFreedom, title, description, languages, function(err, result) {				
									
									if(err) {
										jwt.sendResponse(500, 'text/plain', null, "Erro ao Incluir Versão Customizada: " + err.message, req, res);
										return;
									}

									fs.unlink(fileInput.path, function(err) {
										if(err) {
											console.error(new Date() + " Erro ao Remover Arquivo Temporário: " + err);
										} else {
											console.log(new Date() + " Arquivo temporário \"" + path.basename(fileInput.path) + "\" removido com sucesso.");
										}										
									});
									
									mongoConnection.close();
									
									var version = result.version.replace(/\./g, '-');
									var uri = "/api/oacs/" + oacId + "/" + daeId + "/versoes-customizadas/" + version;
									jwt.sendResponse(201, 'text/plain', null, uri, req, res);
								});
							} else {
								jwt.sendResponse(400, 'text/plain', null, "Esta não é uma Versão Customizada deste OAC", req, res);
								db.mongo.close();
							}			
						});
					} else {
						jwt.sendResponse(404, 'text/plain', null, "OAC não encontrado", req, res);
						db.mongo.close();
					}			
				});
			});						
		} else {
			jwt.sendResponse(400, 'text/plain', null, "Campos obrigatórios não informados", req, res);
		}
	}
);

app.get("/api/oacs/:oacId/:daeId/versoes-customizadas/:versionNumber", jwt.hasValidToken, function(req, res) {	

	var oacId = req.params.oacId;
	var daeId = req.params.daeId;
	var versionNumber = req.params.versionNumber.replace(/-/g, '.');
	var userId = req.user.id;
	var degreeOfFreedom = req.user.degree_of_freedom;

	db.mongo.open(function(err, mongoConnection) {
		
		if(err) {
			jwt.sendResponse(500, 'text/plain', null, "Erro ao Baixar Versão Customizada: " + err.message, req, res);
			db.mongo.close();
			return;
		}
		
		clover.buscarDescritorPorId(mongoConnection, "DescritoresDeArquivosExecutaveis", daeId, {"id_clo": 1, "locations": 1}, function(err, descritorDeArquivoExecutavel) {

			if(err) {
				jwt.sendResponse(500, 'text/plain', null, "Erro ao Baixar Versão Customizada: " + err.message, req, res);
				db.mongo.close();
				return;
			}

			if (descritorDeArquivoExecutavel && descritorDeArquivoExecutavel.id_clo == oacId) {
				
				clover.buscarDescritorDeVersao(mongoConnection, daeId, versionNumber, function(err, descritorDeVersao) {

					if(err) {
						jwt.sendResponse(500, 'text/plain', null, "Erro ao Baixar Versão Customizada: " + err.message, req, res);
						db.mongo.close();
						return;
					}

					if (descritorDeVersao) {
						
						var filePath = descritorDeArquivoExecutavel.locations[0];

						clover.gerarPacoteVersao(mongoConnection, descritorDeVersao._id, daeId, filePath, userId, degreeOfFreedom, function(err, versaoCustomizada) {			
							
							if(err) {
								jwt.sendResponse(500, 'text/plain', null, "Erro ao Baixar Versão Customizada: " + err.message, req, res);
								db.mongo.close();
								return;
							}

							mongoConnection.close();

							jwt.sendResponse(200, 'application/zip', path.basename(filePath, path.extname(filePath)) + '.zip', versaoCustomizada, req, res);			
						});
					} else {
						jwt.sendResponse(404, 'text/plain', null, "Versão Customizada não encontrada", req, res);
						db.mongo.close();
					}			
				});		
			} else {
				jwt.sendResponse(404, 'text/plain', null, "OAC não encontrado", req, res);
				db.mongo.close();
			}			
		});
	});
});

// ***** Inicialização do Servidor *****

app.use(express.static(__dirname + '/views/images'));
app.use(express.static(__dirname + '/views/styles'));
//Servidor fica ouvindo a porta 80.
server.listen(80);
