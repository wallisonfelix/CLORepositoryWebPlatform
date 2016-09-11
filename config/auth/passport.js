var model = require('../../model/models.js');
var administration = require('../../administration.js');
var console = require('console');
var bcrypt = require('bcrypt-nodejs');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

//Serializa Usuário na sessão
passport.serializeUser(function(user, done) {
	done(null, user.id);
});

//Deserializa Usuário
passport.deserializeUser(function(id, done) {
    administration.buscarUsuarioPorId(id, function(err, user) {
        done(err, user);
    });    
});

//Realiza a validação das credenciais de acesso de um Usuário e, caso permitido, realiza a autenticação
passport.use('local-login', new LocalStrategy({
        usernameField : 'login',
        passwordField : 'password',
    }, function(login, password, done) {

        administration.buscarUsuarioPorLogin(login, true, function(err, user) {
            
            if(err){
                console.error(new Date() + " Erro ao Realizar Login: " + err);
                return done(err);
            }

            if (user) {
                if ( bcrypt.compareSync(password, user.password) ) {
                    console.log(new Date() + " Login de Usuário realizado com sucesso: " + user.login + ".");
                    done(null, user);        
                } else {
                    return done(new Error("Senha Inválida."));    
                }
            } else {
                return done(new Error("Usuário com o login " + login + " não encontrado."));
            }
        });
    })
);

module.exports = passport;
