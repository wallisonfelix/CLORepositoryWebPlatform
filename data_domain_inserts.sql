-- Insert Operations
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (1,	'Pesquisar Operação', 'pesquisar_operacao', 'Operação referente a funcionalidade de Pesquisa de Operações', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (2,	'Incluir Operação', 'incluir_operacao', 'Operação referente a funcionalidade de Inclusão de Operações', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (3,	'Editar Operação', 'editar_operacao', 'Operação referente a funcionalidade de Edição de Operações', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (4,	'Excluir Operação',	'excluir_operacao', 'Operação referente a funcionalidade de Exclusão de Operações', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (5,	'Pesquisar Papel', 'pesquisar_papel', 'Operação referente a funcionalidade de Pesquisa de Papéis', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (6,	'Incluir Papel', 'incluir_papel', 'Operação referente a funcionalidade de Inclusão de Papéis', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (7,	'Editar Papel', 'editar_papel', 'Operação referente a funcionalidade de Edição de Papéis', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (8,	'Excluir Papel', 'excluir_papel', 'Operação referente a funcionalidade de Exclusão de Papéis', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (9,	'Pesquisar Usuário', 'pesquisar_usuario', 'Operação referente a funcionalidade de Pesquisa de Usuários', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (10, 'Validar Usuário',	'validar_usuario', 'Operação referente a funcionalidade de Validação de Usuários', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (11, 'Editar Usuário', 'editar_usuario', 'Operação referente a funcionalidade de Edição de Usuários', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (12, 'Excluir Usuário',	'excluir_usuario', 'Operação referente a funcionalidade de Exclusão de Usuários', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (13, 'Pesquisar OAC', 'pesquisar_oac', 'Operação referente a funcionalidade de Pesquisa de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (14, 'Visualizar Metadados de OAC',	'visualizar_metadado_oac', 'Operação referente a funcionalidade de Visualização de Metadados de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (15, 'Visualizar Versões de OAC', 'visualizar_versoes_oac',	'Operação referente a funcionalidade de Visualização de Versões Customizadas de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (16, 'Baixar OAC',	'baixar_oac', 'Operação referente a funcionalidade de Baixar OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (17, 'Baixar Versões de OAC', 'baixar_versoes_oac', 'Operação referente a funcionalidade de Baixar Versões Customizadas de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (18, 'Incluir OAC',	'incluir_oac', 'Operação referente a funcionalidade de Inclusão de OAC', NOW(), NOW());
INSERT INTO operations (id, name, code, description, created_at, updated_at) VALUES (19, 'Incluir Versão Customizada', 'incluir_versao_customizada', 'Operação referente a funcionalidade de Inclusão de Versões Customizadas', NOW(), NOW());

SELECT setval('operations_id_seq', (SELECT MAX(id) FROM operations));

-- Insert Roles
INSERT INTO roles (id, name, code, description, created_at, updated_at) VALUES (1, 'Professor', 'professor', 'Papel destinado à Professores', NOW(), NOW());
INSERT INTO roles (id, name, code, description, created_at, updated_at) VALUES (2, 'Aluno', 'aluno', 'Papel destinado à Alunos', NOW(), NOW());
INSERT INTO roles (id, name, code, description, created_at, updated_at) VALUES (3, 'Designer', 'designer', 'Papel destinado à Designers', NOW(), NOW());
INSERT INTO roles (id, name, code, description, created_at, updated_at) VALUES (4, 'Administrador', 'administrador', 'Papel destinado  aos Administradores do Repositório', NOW(), NOW());

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
