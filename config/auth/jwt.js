var model = require('../../model/models.js');
var administration = require('../../administration.js');
var console = require('console');
var moment = require('moment');
var jwt = require('jwt-simple');

var jwtTokenSecret = '12345';

//Envia reposta ao cliente que realizou uma requisição a uma das operações da API
var sendResponse = function(sucessResponse, messages, data, req, res) {
	var resultType = "";
	var logMessageType = "";

	if (sucessResponse) {
		resultType = "Sucess";
		logMessageType = " Mensagem de Sucesso da API: ";
	} else {
		resultType = "Erro";	
		logMessageType = "  Mensagem de Erro da API: ";	
	}
	//Log das mensagens de resposta
	for (var index = 0; index < messages.length; index++) {
		console.error(new Date() +  + messages[index].message);	
	}

	//Criação do objeto de resposta
	var response = { 
		resultType: resultType;
		messages: messages;
	};	
	//Adiciona o atributo data ao objeto de resposta apenas se necessário
	if (data) {
		response.data = data;
	}

	//Envia a resposta
	res.JSON(response);
};

//Gera um Token de Acesso com validade de uma hora. Ele inclui o login e as operações do usuário utilizado pelo cliente para a obtenção do Token
var generateToken = function(user, req, res) {			
	user.operationCodes(function(operationCodes) {
		var expires = moment().add('hour', 1).valueOf();

		var token = jwt.encode({ 
			iss: user.login,	
			operationCodes: operationCodes,
			exp: expires
		}, jwtTokenSecret);

		sendResponse(true, [{messageType: 'sucess', message: 'Token de Acesso à API obtido com sucesso'}], {token: token, expires: expires}, req, res);
	});
};

//Verifica se a requisição possui um Token de Acesso válido
//Caso o Token sejá válido, o usuário utilizado pelo cliente para a obtenção do Token é adicionado à requisição
var hasValidToken = function(req, res, next) {
	//Ler o Token enviado
	var token = req.headers['x-access-token'];

	if (token) {
		try {
			//Decodifica o Token enviado
			var decodedToken = jwt.decode(token, jwtTokenSecret);
			
			//Verifica se o Token não está expirado
			if (decodedToken.exp < Date.now()) {
				sendResponse(false, [{messageType: 'danger', message: 'Token expirado! Obtenha um novo Token de Acesso à API'}], null, req, res);
			}

			//Busca o Usuário com base no login contido no Token
			administration.buscarUsuarioPorLogin(decodedToken.iss, true, function(err, user) {

				if (err) {	           
	                sendResponse(false, [{messageType: 'danger', message: 'Erro ao validar Token de Acesso à API: ' + err}], null, req, res);
	            }

	            if (user) {
	            	req.user = user;
	            	return next();
	            } else {
	            	sendResponse(false, [{messageType: 'danger', message: 'Erro ao validar Token de Acesso à API: Usuário com o login ' + decodedToken.iss + ' não encontrado'}], null, req, res);
	            }
			)};
	  	} catch (err) {
	  		sendResponse(false, [{messageType: 'danger', message: 'Token inválido!'}], null, req, res);
	  	}
	} else {
		sendResponse(false, [{messageType: 'danger', message: 'Token não detectado na requisição'}], null, req, res);
	}
};

//Verifica se o cliente que realiza requisição a uma das operações da API possui a permissão para a Operação passada como parâmetro
var hasPermission = function(operationCode, req, res, next) {
	req.user.operationCodes(function(operationCodes) {
       	if (operationCodes.indexOf(operationCode) != -1) {
       		return next();		
       	} else {			
			sendResponse(false, [{messageType: 'danger', message: 'Acesso negado! Você não possui autorização para esta funcionalidade'}], null, req, res);
		}
	});
};

module.exports.sendResponse = sendResponse;
module.exports.generateToken = generateToken;
module.exports.hasValidToken = hasValidToken;
module.exports.hasPermission = hasPermission;
