var sequelize = require('./config/database/postgres.js');

var User = sequelize.define('user', {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	name: { type: Sequelize.STRING(255), validate: { notNull: { args: true, msg: "Preencha o campo Nome do Usuário"}, notEmpty: { args: true, msg: "Preencha o campo Nome do Usuário"} },
	email: { type: Sequelize.STRING(255), unique: true, validate: { notNull: { args: true, msg: "Preencha o campo E-mail do Usuário"}, isEmail: { args: true, msg: "E-mail inválido"} },
	profile: { type: Sequelize.STRING(1024), defaultValue: null },
	login: { type: Sequelize.STRING(32), unique: true, validate: { notNull: { args: true, msg: "Preencha o campo Login do Usuário"}, notEmpty: { args: true, msg: "Preencha o campo Login do Usuário"} },
	password: { type: Sequelize.STRING(40), validate: { notNull: { args: true, msg: "Preencha o campo Senha do Usuário"}, notEmpty: { args: true, msg: "Preencha o campo Senha do Usuário"} },
	degree_of_fredom: { type: Sequelize.INTEGER(1), defaultValue: 0, validate: { min: { args: 0, msg: "O Grau de Liberdade do Usuário deve ser no mínimo 0"},  min: { args: 4, msg: "O Grau de Liberdade do Usuário deve ser no máximo 4"} },
}, {
	tableName: "usuarios",
	timestamps: true,
	underscored: true,
	indexes: [ {
    	unique: true,
    	fields: ["email", "login"]
    }
});

var Role = sequelize.define('role', {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	name: { type: Sequelize.STRING(32), validate: { notNull: { args: true, msg: "Preencha o campo Nome do Papel"}, notEmpty: { args: true, msg: "Preencha o campo Nome do Papel"} },
	code: { type: Sequelize.STRING(32), unique: true, validate: { notNull: { args: true, msg: "Preencha o campo Código do Papel"}, notEmpty: { args: true, msg: "Preencha o campo Código do Papel"} },
	description: { type: Sequelize.STRING(255), validate: { notNull: { args: true, msg: "Preencha o campo Descrição do Papel"}, notEmpty: { args: true, msg: "Preencha o campo Descrição do Papel"} },
}, {
	tableName: "roles",
	timestamps: true,
	underscored: true,
	indexes: [ {
    	unique: true,
    	fields: ["code"]
    }
});

var Operation = sequelize.define('operation', {
	id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
	name: { type: Sequelize.STRING(32), validate: { notNull: { args: true, msg: "Preencha o campo Nome da Operação"}, notEmpty: { args: true, msg: "Preencha o campo Nome da Operação"} },
	code: { type: Sequelize.STRING(32), unique: true, validate: { notNull: { args: true, msg: "Preencha o campo Código da Operação"}, notEmpty: { args: true, msg: "Preencha o campo Código da Operação"} },
	description: { type: Sequelize.STRING(255), validate: { notNull: { args: true, msg: "Preencha o campo Descrição da Operação"}, notEmpty: { args: true, msg: "Preencha o campo Descrição da Operação"} },
}, {
	tableName: "operations",
	timestamps: true,
	underscored: true,
	indexes: [ {
    	unique: true,
    	fields: ["code"]
    }
});

Role.belongsToMany(Operation, { constraints: true, as: 'Operations', through: 'role_operations', foreignKey: 'role_id', otherKey: 'operation_id', onDelete: 'cascade', onUpdate: 'cascade'});
User.belongsToMany(Role, { constraints: true, as: 'Roles', through: 'user_roles', foreignKey: 'user_id', otherKey: 'role_id', onDelete: 'cascade', onUpdate: 'cascade'});
