-- Insert Operations
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (1,	'Pesquisar Opera��o', 'pesquisar_operacao', 'Opera��o referente a funcionalidade de Pesquisa de Opera��es', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (2,	'Incluir Opera��o', 'incluir_operacao', 'Opera��o referente a funcionalidade de Inclus�o de Opera��es', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (3,	'Editar Opera��o', 'editar_operacao', 'Opera��o referente a funcionalidade de Edi��o de Opera��es', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (4,	'Excluir Opera��o',	'excluir_operacao', 'Opera��o referente a funcionalidade de Exclus�o de Opera��es', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (5,	'Pesquisar Papel', 'pesquisar_papel', 'Opera��o referente a funcionalidade de Pesquisa de Pap�is', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (6,	'Incluir Papel', 'incluir_papel', 'Opera��o referente a funcionalidade de Inclus�o de Pap�is', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (7,	'Editar Papel', 'editar_papel', 'Opera��o referente a funcionalidade de Edi��o de Pap�is', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (8,	'Excluir Papel', 'excluir_papel', 'Opera��o referente a funcionalidade de Exclus�o de Pap�is', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (9,	'Pesquisar Usu�rio', 'pesquisar_usuario', 'Opera��o referente a funcionalidade de Pesquisa de Usu�rios', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (10, 'Validar Usu�rio',	'validar_usuario', 'Opera��o referente a funcionalidade de Valida��o de Usu�rios', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (11, 'Editar Usu�rio', 'editar_usuario', 'Opera��o referente a funcionalidade de Edi��o de Usu�rios', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (12, 'Excluir Usu�rio',	'excluir_usuario', 'Opera��o referente a funcionalidade de Exclus�o de Usu�rios', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (13, 'Pesquisar OAC', 'pesquisar_oac', 'Opera��o referente a funcionalidade de Pesquisa de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (14, 'Visualizar Metadados de OAC',	'visualizar_metadado_oac', 'Opera��o referente a funcionalidade de Visualiza��o de Metadados de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (15, 'Visualizar Vers�es de OAC', 'visualizar_versoes_oac',	'Opera��o referente a funcionalidade de Visualiza��o de Vers�es Customizadas de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (16, 'Baixar OAC',	'baixar_oac', 'Opera��o referente a funcionalidade de Baixar OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (17, 'Baixar Vers�es de OAC', 'baixar_versoes_oac', 'Opera��o referente a funcionalidade de Baixar Vers�es Customizadas de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (18, 'Incluir OAC',	'incluir_oac', 'Opera��o referente a funcionalidade de Inclus�o de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (19, 'Incluir Vers�o Customizada', 'incluir_versao_customizada', 'Opera��o referente a funcionalidade de Inclus�o de Vers�es Customizadas', NOW(), NOW());

SELECT setval('operations_id_seq', (SELECT MAX(id) FROM operations));

-- Insert Roles
INSERT INTO roles (id, name, code, description, created_at, updated_at) VALUES (1, 'Professor', 'professor', 'Papel destinado � Professores', NOW(), NOW());
INSERT INTO roles (id, name, code, description, created_at, updated_at) VALUES (2, 'Aluno', 'aluno', 'Papel destinado � Alunos', NOW(), NOW());
INSERT INTO roles (id, name, code, description, created_at, updated_at) VALUES (3, 'Designer', 'designer', 'Papel destinado � Designers', NOW(), NOW());
INSERT INTO roles (id, name, code, description, created_at, updated_at) VALUES (4, 'Administrador', 'administrador', 'Papel destinado  aos Administradores do Reposit�rio', NOW(), NOW());

SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- Insert relations roles - operations
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'professor'), (SELECT id FROM operations WHERE code = 'pesquisar_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'professor'), (SELECT id FROM operations WHERE code = 'visualizar_metadado_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'professor'), (SELECT id FROM operations WHERE code = 'visualizar_versoes_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'professor'), (SELECT id FROM operations WHERE code = 'baixar_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'professor'), (SELECT id FROM operations WHERE code = 'baixar_versoes_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'professor'), (SELECT id FROM operations WHERE code = 'incluir_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'professor'), (SELECT id FROM operations WHERE code = 'incluir_versao_customizada'));

INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'aluno'), (SELECT id FROM operations WHERE code = 'pesquisar_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'aluno'), (SELECT id FROM operations WHERE code = 'visualizar_metadado_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'aluno'), (SELECT id FROM operations WHERE code = 'visualizar_versoes_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'aluno'), (SELECT id FROM operations WHERE code = 'baixar_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'aluno'), (SELECT id FROM operations WHERE code = 'baixar_versoes_oac'));

INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'designer'), (SELECT id FROM operations WHERE code = 'pesquisar_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'designer'), (SELECT id FROM operations WHERE code = 'visualizar_metadado_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'designer'), (SELECT id FROM operations WHERE code = 'visualizar_versoes_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'designer'), (SELECT id FROM operations WHERE code = 'baixar_oac'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'designer'), (SELECT id FROM operations WHERE code = 'baixar_versoes_oac'));

INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'pesquisar_operacao'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'incluir_operacao'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'editar_operacao'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'excluir_operacao'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'pesquisar_papel'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'incluir_papel'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'editar_papel'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'excluir_papel'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'pesquisar_usuario'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'validar_usuario'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'editar_usuario'));
INSERT INTO role_operations (role_id, operation_id) VALUES ((SELECT id FROM roles WHERE code = 'administrador'), (SELECT id FROM operations WHERE code = 'excluir_usuario'));

-- Insert Activities
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (1, 'professor_ens_infantil', 'Professor do Ensino Infantil', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (2, 'professor_ens_fundamental', 'Professor do Ensino Fundamental', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (3, 'professor_ens_medio', 'Professor do Ensino M�dio', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (4, 'professor_ens_tecnico', 'Professor do Ensino T�cnico', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (5, 'professor_ens_superior', 'Professor do Ensino Superior', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (6, 'professor_pos_graduacao', 'Professor de P�s-gradua��o', NOW(), NOW());

INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (7, 'aluno_ens_fundamental', 'Aluno do Ensino Fundamental', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (8, 'aluno_ens_medio', 'Aluno do Ensino M�dio', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (9, 'aluno_ens_tecnico', 'Aluno do Ensino T�cnico', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (10, 'aluno_ens_superior', 'Aluno do Ensino Superior', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (11, 'aluno_pos_graduacao', 'Aluno de P�s-gradua��o', NOW(), NOW());

INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (12, 'analista_sistemas', 'Analista de Sistemas', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (13, 'desenvolvedor_sistemas', 'Desenvolvedor de Sistema', NOW(), NOW());
INSERT INTO activities (id, code, name, created_at, updated_at) VALUES (14, 'designer', 'Designer', NOW(), NOW());

SELECT setval('activities_id_seq', (SELECT MAX(id) FROM activities));	

-- Insert Default User ADMIN - Login admin / Password admin
INSERT INTO users (id, name, email, "emailValidated", profile, login, password, degree_of_freedom, "userValidated", created_at, updated_at) 
	VALUES (1, 'ADMIN', 'admin@email.com', TRUE, 'Administrador da Plataforma', 'admin', '$2a$08$62aL8DUIZnjJU6bcOaCGp.pYCXgN3l9VKN8AuQtySipBt9UyIu6kW', 4, TRUE, NOW(), NOW());
INSERT INTO user_roles (user_id, role_id) VALUES ((SELECT id FROM users WHERE login = 'admin'), (SELECT id FROM roles WHERE code = 'administrador'));
INSERT INTO user_activities (user_id, activity_id) VALUES ((SELECT id FROM users WHERE login = 'admin'), (SELECT id FROM activities WHERE code = 'analista_sistemas'));

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));	
