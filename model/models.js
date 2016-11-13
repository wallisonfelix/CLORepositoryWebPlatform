var db = require('../config/database/db.js');
var Sequelize = require('sequelize');

//Definição dos Modelos utilizados para o controle de Autenticação e Autorização da CLOWebPlatform.

//Representação no CLORepository de um Usuário da Plataforma.
var User = db.sequelize.define('user', {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	name: { type: Sequelize.STRING(255), allowNull: false, validate: { notEmpty: { args: true, msg: "Preencha o campo Nome do Usuário"} } }, 
	email: { type: Sequelize.STRING(255), allowNull: false, unique: true, validate: { isEmail: { args: true, msg: "E-mail inválido"} } },
	emailValidated: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
	profile: { type: Sequelize.STRING(1024), defaultValue: null },
	login: { type: Sequelize.STRING(32), allowNull: false, unique: true, validate: { notEmpty: { args: true, msg: "Preencha o campo Login do Usuário"} } },
	password: { type: Sequelize.STRING(64), allowNull: false, validate: { notEmpty: { args: true, msg: "Preencha o campo Senha do Usuário"} } },
	degree_of_freedom: { type: Sequelize.INTEGER(1), allowNull: false, defaultValue: 0, 
		validate: { isNumeric: { args: true, msg: "O Grau de Liberdade do Usuário deve ser um número"}, min: 0, max: 4 } },
	userValidated: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
}, {
	tableName: "users",
	timestamps: true,
	underscored: true,
	indexes: [ {
    		unique: true,
    		fields: ["email"]
    	}, {
    		unique: true,
    		fields: ["login"]
    	} 
    ],
    instanceMethods: {
	   	operationCodes: function(callback) {	  		 
	    	this.getRoles().then(function(roles) {	   		
	    		var operationCodes = [];

				if (roles && roles.length > 0) {
					var i = 0;
					roles.forEach(function(role) {
						role.operationCodes(function(codes) {
				   			if (codes && codes.length > 0) {
				   				operationCodes = operationCodes.concat(codes);
				   				i++;
				   				if (i == roles.length) {				   				
				   					callback(operationCodes);
				   				}
				   			}
						});
					});	   					   		
				} else {				
					callback(operationCodes);
				}
			}).catch(function (err) {
				callback([]);
			});  
	    }
  	}
});

//Representação no CLORepository de um Papel que os Usuários da Plataforma podem possuir.
var Role = db.sequelize.define('role', {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	name: { type: Sequelize.STRING(32), allowNull: false, validate: { notEmpty: { args: true, msg: "Preencha o campo Nome do Papel"} } },
	code: { type: Sequelize.STRING(32), allowNull: false, unique: true, validate: { notEmpty: { args: true, msg: "Preencha o campo Código do Papel"} } },
	description: { type: Sequelize.STRING(255), allowNull: false, validate: { notEmpty: { args: true, msg: "Preencha o campo Descrição do Papel"} } },
}, {
	tableName: "roles",
	timestamps: true,
	underscored: true,
	indexes: [ {
 	   		unique: true,
    		fields: ["code"]
    	}
    ],
    instanceMethods: {
	   	operationCodes: function(callback) {
	   		this.getOperations( { attributes: ['code'] } ).then(function(operations) {	
	   			var operationCodes = [];
				if (operations && operations.length > 0) {
					for (var i = 0; i < operations.length; i++) {
						operationCodes.push(operations[i].code);
					}

				} 
				callback(operationCodes);			
			}).catch(function (err) {	
				callback([]);
			});   
	    }
	}
});

//Representação no CLORepository de uma Operação oferecida na Plataforma,
//para a qual os Pápeis são autorizados a realizarem.
var Operation = db.sequelize.define('operation', {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	name: { type: Sequelize.STRING(32), allowNull: false, validate: { notEmpty: { args: true, msg: "Preencha o campo Nome da Operação"} } },
	code: { type: Sequelize.STRING(32), allowNull: false, unique: true, validate: { notEmpty: { args: true, msg: "Preencha o campo Código da Operação"} } },
	description: { type: Sequelize.STRING(255), allowNull: false, validate: { notEmpty: { args: true, msg: "Preencha o campo Descrição da Operação"} } },
}, {
	tableName: "operations",
	timestamps: true,
	underscored: true,
	indexes: [ {
      		unique: true,
    		fields: ["code"]
    	}
    ]
});

//Representação no CLORepository de uma Atividade que os Usuários da Plataforma indicar que praticam.
var Activity = db.sequelize.define('activity', {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	name: { type: Sequelize.STRING(32), allowNull: false, validate: { notEmpty: { args: true, msg: "Preencha o campo Nome da Atividade"} } },	
	code: { type: Sequelize.STRING(32), allowNull: false, unique: true, validate: { notEmpty: { args: true, msg: "Preencha o campo Código da Atividade"} } },
}, {
	tableName: "activities",
	timestamps: true,
	underscored: true,
	indexes: [ {
      		unique: true,
    		fields: ["code"]
    	}
    ]
});

//Relacionamento m : n entre os Papéis e as Operações - Vários Papéis podem ser autorizados para muitas Operações.
Role.belongsToMany(Operation, { constraints: true, as: 'Operations', through: 'role_operations', foreignKey: 'role_id', otherKey: 'operation_id', timestamps: false, onDelete: 'cascade', onUpdate: 'cascade'});

//Relacionamento m : n entre os Usuários e os Papéis - Vários Usuários podem possuir um conjunto de Papéis.
User.belongsToMany(Role, { constraints: true, as: 'Roles', through: 'user_roles', foreignKey: 'user_id', otherKey: 'role_id', timestamps: false, onDelete: 'cascade', onUpdate: 'cascade'});

//Relacionamento m : n entre os Usuários e as Atividades - Vários Usuários podem exercer um conjunto de Atividades.
User.belongsToMany(Activity, { constraints: true, as: 'Activities', through: 'user_activities', foreignKey: 'user_id', otherKey: 'activity_id', timestamps: false, onDelete: 'cascade', onUpdate: 'cascade'});

//Deleta e Recria o Banco de Dados - Apenas para o ambiente de DESENVOLVIMENTO.
//db.sequelize.sync( { force: true } );
db.sequelize.sync();

module.exports.User = User;
module.exports.Role = Role;
module.exports.Operation = Operation;
module.exports.Activity = Activity;