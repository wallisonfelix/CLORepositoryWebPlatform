var model = require('../../model/models.js');
var administration = require('../../administration.js');
var console = require('console');
var moment = require('moment');
var jwt = require('jwt-simple');

var jwtTokenSecret = '12345';

//Envia reposta ao cliente que realizou uma requisição a uma das operações da API
var sendResponse = function(statusCode, contentType, filename, data, req, res) {
	res.status(statusCode);
	res.set('Content-Type', contentType);

	//Caso seja enviado um arquivo, o tratamento do envio da resposta é diferenciado
	if (!filename) {
		console.log(new Date() + " API: " + statusCode + " " + data);		

		console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Retornando os dados ###");

		//Envia a resposta
		res.send(data);
	} else {
		res.set('Content-Disposition', 'attachment; filename="' + filename + '"');

		console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Retornando os dados ###");

		//Envia a resposta
		data.pipe(res);		
	}	
};

//Gera um Token de Acesso com validade de uma hora. Ele inclui o login e as operações do usuário utilizado pelo cliente para a obtenção do Token
var generateToken = function(user, req, res) {			
	var expires = moment().add(10, 'minutes').valueOf();

	var token = jwt.encode({ 
		iss: user.login,			
		exp: expires
	}, jwtTokenSecret);

	sendResponse(200, 'application/json', null, {token: token, expires: expires}, req, res);
};

//Verifica se a requisição possui um Token de Acesso válido
//Caso o Token sejá válido, o usuário utilizado pelo cliente para a obtenção do Token é adicionado à requisição
var hasValidToken = function(req, res, next) {	

	console.log(moment().format("DD/MM/YYYY HH:mm:ss.SSS") + " ### Iniciando processamento de requisição com Token ###");

	//Ler o Token enviado
	var token = req.query.token;

	if (token) {
		try {
			//Decodifica o Token enviado
			var decodedToken = jwt.decode(token, jwtTokenSecret);
			
			//Verifica se o Token não está expirado
			if (decodedToken.exp < Date.now()) {
				sendResponse(401, 'text/plain', null, "Token expirado! Obtenha um novo Token de Acesso à API", req, res);
				return null;
			}

			//Busca o Usuário com base no login contido no Token
			administration.buscarUsuarioPorLogin(decodedToken.iss, true, function(err, user) {

				if (err) {
					sendResponse(500, 'text/plain', null, "Erro ao validar Token de Acesso à API: " + err.message, req, res);
					return null;
	            }
	            
	            if (user) {
	            	req.user = user;
	            	return next();
	            } else {
	            	sendResponse(401, 'text/plain', null, "Usuário com o login " + decodedToken.iss + " não encontrado", req, res);
	            }
			});
	  	} catch (err) {
	  		sendResponse(401, 'text/plain', null, "Token inválido", req, res);
	  	}
	} else {
		sendResponse(401, 'text/plain', null, "Token não detectado na requisição", req, res);		
	}
};

//Verifica se o cliente que realiza requisição a uma das operações da API possui a permissão para a Operação passada como parâmetro
var hasPermission = function(operationCode, req, res, next) {
	req.user.operationCodes(function(operationCodes) {		
       	if (operationCodes.indexOf(operationCode) != -1) {
       		return next();		
       	} else {			
       		sendResponse(403, 'text/plain', null, "Acesso negado! Você não possui autorização para esta funcionalidade", req, res);
		}
	});
};

module.exports.sendResponse = sendResponse;
module.exports.generateToken = generateToken;
module.exports.hasValidToken = hasValidToken;
module.exports.hasPermission = hasPermission;
