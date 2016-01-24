var cloUtils = require('./cloUtils.js');
var DIR = './file';
var path = require('path');
var mongodb = require('mongodb');
var zip = require('adm-zip');
var crypto = require('crypto');

//Realiza a criação dos elementos que compõem um OAC no banco de dados
var criarOAC = function(mongoConnection, zip, fileNames, callback)
{
  //Variáveis que receberão os JSONs de arquivos executáveis e seus componentes.
  var toCollection = []
  var count = 0
  //Variáveis para formatação de nome do JSON de cada arquivo executável e componente.
  var lista_componentes, dae, ext, dir
  var lomFile = JSON.parse(zip.readAsText("LOM.json").trim())
  //Diretório principal para onde os arquivos serão extraídos.
  //Cria e insere o novo DescritorRaiz.
  criarDescritorRaiz(mongoConnection, lomFile, function(err)
   {
   		if(err) {
			console.error(new Date() + " Erro ao Criar DescritorRaiz: " + err);
			callback(err);
		}

		fileNames.forEach(function(element) {
		   var obj = {}
		   //Nome do executável a partir do caminho completo.
		   fileName = path.basename(element);
		   //Recebe o nome original do arquivo e substitui 
		   //sua extensão por JSON para que fique no formato NomeDoOAC.json
		   ext = (path.extname(element)).substr(1);
		   newFileName = fileName.replace(ext, "json");
		   //Caminho completo do arquivo NomeDoOAC_extensao.json
		   dae = element.replace(".", "_") + ".json";
		   //Caminho completo do arquivo NomeDoOAC.json
		   lista_componentes = element.replace(fileName, newFileName);
		   obj.exec = JSON.parse(zip.readAsText(dae).trim())
		   obj.exec.clo_id = lomFile._id
		   obj.comp = JSON.parse(zip.readAsText(lista_componentes).trim())
		   obj.fileName = element
		   toCollection.push(obj)
		})
	   	//Intera a lista de arquivos executáveis do OAC para incluí-los no banco
		toCollection.forEach(function(item)
		{
			criarDescritorDeArquivoExecutavel(mongoConnection, zip, item.fileName, lomFile.qualified_name, item.exec, item.comp, function(err, data)
			{
			   if(err) {
					console.error(new Date() + " Erro ao Criar DescritorDeArquivoExecutavel: " + err);
					callback(err);
				}
			   	count++;
			   	if(count == toCollection.length) {
					console.log(new Date() + " OAC inserido com sucesso.");
					callback(null);
				}
			})
		})
	})
}

//Cria um novo documento na Collection DescritoresRaizes
function criarDescritorRaiz(mongoConnection, lom, callback)
  {
    lom._id = new mongodb.ObjectID()
    lom.user = Math.floor(100000000*Math.random())
	lom.date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    mongoConnection.collection('DescritoresRaizes').insert(lom, function(err, data) {

	    if(err) {
			console.error(new Date() + " Erro ao Inserir DescritorRaiz: " + err);
			callback(err);
		}

	    console.log(new Date() + " Novo documento DescritorRaiz inserido: " + lom._id + ".");
		callback(null)
    })
  }
  
//Cria um novo DescritorDeArquivoExecutavel, criando também o DescritorDeComponents ao qual ele o referencia
function criarDescritorDeArquivoExecutavel(mongoConnection, zip, element, qualified_name, jsonExec, jsonComp, callback)
{
  var count = 0;

  jsonExec._id = new mongodb.ObjectID();
  jsonComp._id = new mongodb.ObjectID();
  jsonExec.id_components = jsonComp._id;

  //Variáveis com o path dos diretórios de destino do Arquivo Executável e dos seus Componentes
  var diretorioDestinoExecutavel = DIR + '/' + path.dirname(element.replace("executable_files", qualified_name));
  var diretorioDestinoComponentes = diretorioDestinoExecutavel + "/components/";

  //Atualiza os campos "source" do JSON com o estado dos Componentes antes de incluí-lo no banco
  jsonComp.scenes.forEach(function(scene) {
  	scene.components.forEach(function(component) {
	  	if (component.hasOwnProperty("source")) {
	  		component.source = diretorioDestinoComponentes + path.basename(component.source);
	  	}
  	});
  });
  mongoConnection.collection('DescritoresDeComponentes').insert(jsonComp, function(err, data) {
    
    if(err) {
      console.error(new Date() + " Erro ao Inserir DescritorDeComponente: " + err);
      callback(err, data)
	}
	//Envia os componentes para o diretório de destino no servidor.
	//Caso exista arquivos com a mesma nomenclatura, eles não são substituidos.
    zip.extractEntryTo(path.dirname(element) + "/components/", diretorioDestinoComponentes, false, false);
    console.log(new Date() + " Novo documento DescritorDeComponente inserido: " + jsonComp._id + ".");
	count++
	if(count == 2)
		callback(null, data)
  })

  //Cria a lista "locations" no JSON que resultará no Descritor de Arquivo Executável,
  //contendo o path de onde ficará o Arquivo Executável.
  jsonExec.locations = [diretorioDestinoExecutavel + '/' + path.basename(element)];
  mongoConnection.collection('DescritoresDeArquivosExecutaveis').insert(jsonExec, function(err, data) {
    if(err) {
      console.error(new Date() + " Erro ao Inserir DescritorDeArquivoExecutavel: " + err);
	  callback(err, data)
	}	
	//Envia o arquivo executável para o diretório de destino no servidor.
	//Caso exista um arquivo com a mesma nomenclatura, ele não é substituido.
	zip.extractEntryTo(element, diretorioDestinoExecutavel, false, false)
	console.log(new Date() + " Novo documento DescritorDeArquivoExecutavel inserido: " + jsonExec._id + ".");
	count++
	if(count == 2)
		callback(null, data)
  });
}

//Realiza a busca de OACs cujo metadados correspondam com os campos passados como parâmetro
var buscarOAC = function(mongoConnection, title, callback)
{
	//Monta Regex para consulta pelo campo Título do OAC
	var titleRegex = new RegExp(".*" + title + ".*", "i");
	
	var result = [];

	//Pesquisa os Descritores Raízes passando os campos utilizados como filtro e 
	//limitando o retorno aos campos que serão utilizados
	var cursorDescritoresRaizes = mongoConnection.collection("DescritoresRaizes").find({"title.value": titleRegex}, {"qualified_name": 1, "title.value": 1});

	cursorDescritoresRaizes.count(function(err, count) {			

		if (err) {
		    console.error(new Date() + " Erro ao Pesquisar DescritoresRaizes: " + err);
			callback(err, result);
		}

		var countDescritoresRaizes = count;
		var indexDescritoresRaizes = 0;	

		if (countDescritoresRaizes == 0) {
			console.log(new Date() + " Pesquisa por OAC com retorno vazio");
			callback(null, result);
		}
		//Intera na lista de resultados
		cursorDescritoresRaizes.forEach(function(descritorRaiz)	{
			//Prepara objeto para representar um registro no retorno da busca
			var obj = {};
			obj._id = descritorRaiz._id;
			obj.title = descritorRaiz.title.value;
			obj.files = new Array();

			//Pesquisa os Descritores de Arquivos Executáveis referente ao Descritor Raiz,
			//limitando o retorno aos campos que serão utilizados
			var cursorDescritoresDeArqExec = mongoConnection.collection("DescritoresDeArquivosExecutaveis").find({"clo_id" : descritorRaiz._id}, {"locations": 1});

			cursorDescritoresDeArqExec.count(function(err, count) {

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
					callback(err, result);
				}

				var countDescritoresDeArqExec = count;	
				var indexDescritoresDeArqExec = 0;						
				
				//Intera na lista dos Descritores de Arquivos Executáveis
				cursorDescritoresDeArqExec.forEach(function(descritorDeArqExec) {
					//Prepara objeto para representar o Arquivo Executável
					var file = {};
					file._id = descritorDeArqExec._id;
					//Caminhos onde o Arquivo Executável pode ser encontrado
					file.locations = [];
					descritorDeArqExec.locations.forEach(function(location) {
						var fileLocation = {};
						fileLocation.ext = path.extname(location);
						fileLocation.path = location;
						file.locations.push(fileLocation);
					});

					//Obtem a quantidade de Versões Customizadas do DescritorDeArquivoExecutavel
					mongoConnection.collection("DescritoresDeVersoes").count({"id_root_version" : descritorDeArqExec._id}, function(err, qtyCustomizedVersion) {

						if (err) {
						    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
							callback(err, result);
						}

						//Preenche o campo qtyCustomizedVersion
						file.qtyCustomizedVersion = qtyCustomizedVersion;						

						obj.files.push(file);

						indexDescritoresDeArqExec++;
						if(indexDescritoresDeArqExec == countDescritoresDeArqExec) {
							//Adiciona a lista de resultados o objeto montado para representar um registro na busca 
							result.push(obj);
							
							indexDescritoresRaizes++;
							if(indexDescritoresRaizes == countDescritoresRaizes) {					
								//Retorna a lista de resultados da pesquisa
								console.log(new Date() + " Retorno de uma Pesquisa por OAC: " + JSON.stringify(result) + ".");
								callback(null, result);
							}
						}
					});
				});
			});
		});
	});
}

//Realiza a busca dos metadados do OAC cujo DescritorRaiz tem o mesmo id passado como parâmetro
function buscarMetadadosOAC(mongoConnection, idDescritorRaiz, callback) {
    
	mongoConnection.collection("DescritoresRaizes").findOne({_id: new mongodb.ObjectID(idDescritorRaiz)}, function(err, descritorRaiz) {

	    if(err) {
			console.error(new Date() + " Erro ao Pesquisar DescritorRaiz: " + err);
			callback(err, null);
		}

		console.log(descritorRaiz);

		if(descritorRaiz) {		
			console.log(new Date() + " Retornando Metadados para Visualização: " + idDescritorRaiz + ".");
			callback(null, descritorRaiz);	
		} else {
			callback(new Error(" DescritorRaiz com o id " + idDescritorRaiz + " não encontrado."), null);
		}	    
		
    });
}

//Gera e retorna um arquivo compactado representando o OAC compatível com os parâmetros informados
var gerarPacoteOAC = function(mongoConnection, idDescritorDeArquivoExecutavel, pathArquivoExecutavel, callback)
{
	//Gera, temporariamente, números aleatórios para representar o id e o Grau de Liberdade do Usuário  que faz o download
	//TODO: setar corretamente quando a Plataforma possuir autenticação. Caso o usuário não esteja autenticado, setar 'null'
	var userId = (new mongodb.ObjectID()).toString();
	var grauDeLiberdade = Math.floor(Math.random() * 5);

	//Pesquisa o DescritorDeArquivoExecutavel do OAC que se deseja baixar
	mongoConnection.collection("DescritoresDeArquivosExecutaveis").findOne({_id : new mongodb.ObjectID(idDescritorDeArquivoExecutavel)}, {'id_components': 1}, function(err, descritorDeArquivoExecutavel) {
		
		if (err) {
			console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
			callback(err, null);
		}

		//Pesquisa o DescritorDeComponentes referenciado pelo DescritorDeArquivoExecutavel
		mongoConnection.collection('DescritoresDeComponentes').findOne({_id : descritorDeArquivoExecutavel.id_components}, function(err, descritorDeComponentes) {

			if (err) {	
				console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + err);
				callback(err, null);
			}

			//Gera o arquivo compactado que representa o OAC
			cloUtils.gerarArquivoOAC(idDescritorDeArquivoExecutavel, pathArquivoExecutavel, descritorDeComponentes, userId, grauDeLiberdade, function(oac) {
				callback(null, oac);
			});
		});
	});
}

//Realiza a busca das Versões Customizadas do DescritorDeVersao ou DescritorDeArquivoExecutavel que tem o mesmo id passado como parâmetro
var buscarVersoesCustomizadas = function(mongoConnection, idSourceVersion, filePath, callback) {
	var result = [];

	//Pesquisa as Versões Customizadas oriundas do DescritorDeVersao ou do DescritorDeArquivoExecutavel com o id passado como parâmetro
	var cursorDescritoresDeVersoes = mongoConnection.collection("DescritoresDeVersoes").find({"id_source_version" : new mongodb.ObjectID(idSourceVersion)});

	cursorDescritoresDeVersoes.count(function(err, cursorSize) {			

		if (err) {
		    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
			callback(err, result);
		}

		if (cursorSize == 0) {
			console.log(new Date() + " Pesquisa por Versões Customizadas com retorno vazio");
			callback(null, result);
		}
		
		indexDescritoresDeVersoes = 0;
		//Intera na lista de Versões Customizadas retornadas
		cursorDescritoresDeVersoes.forEach(function(descritorDeVersao)	{

			//Obtem a quantidade de Versões Customizadas do DescritorDeVersao ou do DescritorDeArquivoExecutavel
			mongoConnection.collection("DescritoresDeVersoes").count({"id_source_version" : descritorDeVersao._id}, function(err, qtyCustomizedVersion) {

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, result);
				}

				indexMetadados = 0;
				//Um registro de Versão Customizada para cada Versão existente ou incorporação realizada
				descritorDeVersao.metadata.forEach(function(metadata) {

					//Prepara objeto para representar um registro no retorno da busca
					var obj = {};
					obj._id = descritorDeVersao._id;
					obj.id_root_version = descritorDeVersao.id_root_version;
					obj.id_source_version = descritorDeVersao.id_source_version;
					obj.version = descritorDeVersao.version;
					obj.languages = descritorDeVersao.languages;
					obj.path = filePath;

					//Preenche o campo qtyCustomizedVersion
					obj.qtyCustomizedVersion = qtyCustomizedVersion;

					obj.user = metadata.user;
					obj.date = metadata.date;
					obj.title = metadata.title;
					obj.description = metadata.description;
					
					result.push(obj);

					indexMetadados++;
					if (indexMetadados == descritorDeVersao.metadata.length) {
						indexDescritoresDeVersoes++;
						if (indexDescritoresDeVersoes == cursorSize) {
							callback(null, result);
						}
					}
				});
			});
		});		
	});
}

//Gera e retorna um arquivo compactado representando a Versão Customizada compatível com os parâmetros informados
var gerarPacoteVersao = function(mongoConnection, idVersion, idRootVersion, pathArquivoExecutavel, callback)
{
	//Gera, temporariamente, números aleatórios para representar o id e o Grau de Liberdade do Usuário que faz o download
	//TODO: setar corretamente quando a Plataforma possuir autenticação. Caso o usuário não esteja autenticado, setar 'null'
	var userId = (new mongodb.ObjectID()).toString();
	var grauDeLiberdade = Math.floor(Math.random() * 5);

	//Pesquisa o DescritorDeArquivoExecutavel raiz da hierarquia em que a Versão está inserida
	mongoConnection.collection("DescritoresDeArquivosExecutaveis").findOne({_id : new mongodb.ObjectID(idRootVersion)}, {'id_components': 1}, function(err, descritorDeArquivoExecutavel) {
		
		if (err) {
			console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
			callback(err, null);
		}

		if (!descritorDeArquivoExecutavel) {
			callback(new Error(" DescritorDeArquivosExecutavel com o id " + idRootVersion + " não encontrado."), null);
		}

		//Pesquisa o DescritorDeComponentes referenciado pelo DescritorDeArquivoExecutavel raiz da hierarquia em que a Versão está inserida
		mongoConnection.collection("DescritoresDeComponentes").findOne({_id : descritorDeArquivoExecutavel.id_components}, function(err, descritorDeComponentesRaiz) {
			
			if (err) {
				console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + err);
				callback(err, null);
			}

			if (!descritorDeComponentesRaiz) {
				callback(new Error(" DescritorDeComponentes com o id " + descritorDeArquivoExecutavel.id_components + " não encontrado."), null);
			}


			//Pesquisa o DescritorDeVersao referente à versão que se deseja fazer o download
			mongoConnection.collection('DescritoresDeVersoes').findOne({_id : new mongodb.ObjectID(idVersion)}, function(err, descritorDeVersao) {

				if (err) {
					console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, null);
				}

				if (!descritorDeVersao) {
					callback(new Error(" DescritorDeVersao com o id " + idVersion + " não encontrado."), null);
				}
				
				//Gera o arquivo compactado que representa a Versão Customizada
				cloUtils.gerarArquivoVersaoCustomizada(descritorDeVersao, descritorDeComponentesRaiz, pathArquivoExecutavel, userId, grauDeLiberdade, function(versaoCustomizada) {
					callback(null, versaoCustomizada);
				});
			});
		});
	});
}

//Retorna as informações referentes à versão de um novo DescritorDeVersao deve assumir, 
//com base no identificador da versão de origem passado como parâmetro
var getVersion = function(mongoConnection, id, callback) {

	//Pesquisa um DescritorDeArquivoExecutavel que possua o identificador passado como parâmetro
	mongoConnection.collection("DescritoresDeArquivosExecutaveis").findOne({"_id": id}, {"_id": 1}, function(err, resultDescDeArqExec) {				

		if (err) {
		    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
			callback(err, null);
		}

		//Caso seja retornado um DescritorDeArquivoExecutavel,
		//a nova Versão Customizada é uma versão de Primeiro Nível	
		if(resultDescDeArqExec) {
			
			var ret = {};
			//A versão raiz e a de origem para o novo DescritorDeVersao são o próprio DescritorDeArquivoExecutavel retornado
			ret.id_root_version = id;
			ret.id_source_version = id;

			//Pesquisa os DescritoresDeVersoes cuja versão de origem seja o próprio DescritorDeArquivoExecutavel retornado
			mongoConnection.collection("DescritoresDeVersoes").find({"id_source_version" : id}, {'version': 1}).toArray(function(err, resultDescDeVerPrimeiroNivel) {

				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, null);
				}

				//Define a versão que o novo DescritorDeVersao deve assumir
				var version = 0;
				for(var i = 0; i < resultDescDeVerPrimeiroNivel.length; i++) {
					if(parseInt(resultDescDeVerPrimeiroNivel[i].version) > version) {
						version = parseInt(resultDescDeVerPrimeiroNivel[i].version);
					}	
				}
				ret.version = (version + 1).toString();				
				
				callback(null, ret);
			});
		
		} else {
			//Não sendo encontrado um DescritorDeArquivoExecutavel com o identificador passado como parâmetro,
			//busca-se DescritoresDeVersoes com esse id e, simultaneamente, suas Versões Customizadas
			mongoConnection.collection("DescritoresDeVersoes").find({$or: [{"_id" : id}, {"id_source_version": id}]}, {"id_root_version": 1, "id_source_version": 1, "version": 1}).toArray(function(err, resultDescDeVers) {
				
				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeVersoes: " + err);
					callback(err, null);
				}

				var ret = {};						

				//Caso seja retornado um DescritorDeVersao,
				//a nova Versão Customizada é uma versão de Segundo Nível em diante	
				if(resultDescDeVers.length > 0) {
					
					//A versão raiz do novo DescritorDeVersao é a mesma dos demais elementos na sua hierarquia
					ret.id_root_version = resultDescDeVers[0].id_root_version;
					//A versão de origem do novo DescritorDeVersao
					ret.id_source_version = id;

					//Define a versão que o novo DescritorDeVersao deve assumir
					var prefix = "";
					var greaterLastVersionNumber = 0;
					var versionNumbers = [];
					var lastVersionNumber;
					//O retorno de mais de um DescritorDeVersao indica a existência de outras Versões Customizadas
					//derivadas da versão de origem	
					for(var i = 0; i < resultDescDeVers.length; i++) {

						if(resultDescDeVers[i]._id.valueOf() != "" + id) {
							//Obtêm o último inteiro do campo version
							versionNumbers = resultDescDeVers[i].version.split(".");
							lastVersionNumber = parseInt(versionNumbers[versionNumbers.length-1]);
							//Obtêm o último número de versão de um dado nível da hierarquia
							if(lastVersionNumber > greaterLastVersionNumber) {
								greaterLastVersionNumber = lastVersionNumber;
							}
						} else {
							//Obtêm o prefixo do número de versão
							prefix = resultDescDeVers[i].version;
						}	

					}							
					greaterLastVersionNumber++;
					ret.version = prefix.concat('.' + greaterLastVersionNumber);					
				} else {
					//Caso não se encontre DescritoresDeArquivosExecutaveis e DescritoresDeVersoes com o identificador,
					//o retorno da função é anulada
					ret = null;
				}

				callback(null, ret);
			});
		}
	});
}

//Cria um novo documento na Collection DescritoresDeVersoes ou realiza uma incorporação,
//para a representação da nova Versão Customizada no banco de dados
var criarVersaoCustomizada = function(mongoConnection, oac, title, description, languages, callback) {
	
	//Novo DescritorDeVersao
	var descritorDeVersao = {};
	//Gerador de Hash SHA1
	var shasum = crypto.createHash('sha1');
	
	//Conteúdo do token.txt
	var tokenAsArray = oac.readAsText("token.txt").split(" ");
	//Descritor de origem da nova Versão Customizada
	var idDescritorOrigem = new mongodb.ObjectID(tokenAsArray[0]);
	//Grau de Liberdade do Usuário
	var grauDeLiberdade = parseInt(tokenAsArray[2]);

	//Diretório em que o Arquivo Executável da Versão está localizado no servidor
	var diretorioArquivoExecutavel;
	//Path do diretório de destino dos arquivos de mídias modificados
	var diretorioDestinoComponentes;

	//Conteúdo do Arquivo Compactado
	var oacEntries = oac.getEntries();

	//Obtêm o JSON com o novo estado dos componentes
	var jsonComp;
	oacEntries.forEach(function(entry) {
		if(entry.entryName.endsWith(".json")) {			
			jsonComp = JSON.parse(oac.readAsText(entry.entryName).trim());
		}
	});
	
	//Obtêm as informações referentes à versão para o novo DescritorDeVersao
	getVersion(mongoConnection, idDescritorOrigem, function(err, result) {		

		if (err) {
		    console.error(new Date() + " Erro ao Obter Número de Versão para novo DescritorDeVersao: " + err);
			callback(err, null);
		}
	
		if(result) {
			console.log(new Date() + " Inserindo nova Versão Customizada: \n" + JSON.stringify(result));
			//Preenche o novo DescritorDeVersao
			descritorDeVersao = {
				_id : new mongodb.ObjectID(),			
				id_source_version : new mongodb.ObjectID(result.id_source_version),
				id_root_version : new mongodb.ObjectID(result.id_root_version),
				version : result.version,
				languages : languages,
				//TODO: setar corretamente o Usuário quando a Plataforma possuir autenticação
				metadata : [{user : tokenAsArray[1], date : new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''), title : title, description : description}]
			}

			//Pesquisa o DescritorDeArquivoExecutavel raiz da hierarquia onde o novo DescritorDeVersao será inserido
			mongoConnection.collection("DescritoresDeArquivosExecutaveis").findOne({_id: descritorDeVersao.id_root_version}, {'id_components': 1, 'locations': 1}, function(err, descritorDeArqExec) {
			
				if (err) {
				    console.error(new Date() + " Erro ao Pesquisar DescritoresDeArquivosExecutaveis: " + err);
					callback(err, null);
				}

				diretorioArquivoExecutavel = descritorDeArqExec.locations;

				//Pesquisa o DescritorDeComponente referenciado pelo DescritorDeArquivoExecutavel raiz da hierarquia
				mongoConnection.collection("DescritoresDeComponentes").findOne({_id : descritorDeArqExec.id_components}, function(error, descritorDeComponente) {

				    if(error) {
				      console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + error);
				      callback(error, null);
					}

					//Obtêm o Delta (diferença) entre o estado dos componentes na raiz da hierarquia e a nova Versão Customizada
					cloUtils.getDelta(jsonComp, descritorDeComponente, grauDeLiberdade, function(err, delta) {

						if (err) {
						    console.error(new Date() + " Erro ao Obter Delta para novo DescritorDeVersao: " + err);
							callback(err, null);
						}

						descritorDeVersao.customizations = delta;
						//Obtêm o Hash do Delta
						descritorDeVersao.hash = shasum.update(JSON.stringify(delta)).digest('hex');

						//Pesquisa DescritorDeVersao com o mesmo Hash na hierarquia
						mongoConnection.collection("DescritoresDeVersoes").findOne({id_root_version: new mongodb.ObjectID(descritorDeVersao.id_root_version), hash: descritorDeVersao.hash}, function(err, descDeVersParaIncorporacao) {

							if(err) {						      
						    	console.error(new Date() + " Erro ao Pesquisar DescritoresDeComponentes: " + err);
						    	callback(err, null);
							}

							if(descDeVersParaIncorporacao) {
								//Caso seja encontrado DescritorDeVersao com as mesmas customizações, 
								//a Incorporação de Versão é realizada
								var metadata = descDeVersParaIncorporacao.metadata;						
								//Verifica se já existe um nó com os mesmos metadados
								var exists = false;								
								metadata.forEach(function(data) {
									if(descritorDeVersao.metadata[0].user == data.user && 
									descritorDeVersao.metadata[0].title == data.title && 
									descritorDeVersao.metadata[0].description == data.description) {
										exists = true;
									}
								});
								//Caso não exista um nó idêntico, realiza-se a Incorporação de Versão
								if(!exists) {
									metadata.push(descritorDeVersao.metadata[0]);
									//Atualiza o DescritorDeVersao
									mongoConnection.collection("DescritoresDeVersoes").update({_id : descDeVersParaIncorporacao._id}, {$set: {metadata: metadata}}, function(err, descDeVersAtualizado) {
										if(err) {						      
									    	console.error(new Date() + " Erro ao Atualizar DescritorDeVersao: " + err);
									    	callback(err, null);
										}

										console.log(new Date() + " Nova Incorporação de Versão realizada: " + descDeVersParaIncorporacao._id);
										callback(null, metadata);
									});
								}																
							} else {
								//Caso não seja encontrado DescritorDeVersao com as mesmas customizações, 
								//um novo DescritorDeVersao é incluído

								//Atualiza os campos "source" dos Componentes que tiveram o arquivo de mídia referenciado modificado
								diretorioDestinoComponentes = path.dirname(diretorioArquivoExecutavel[0]) + "/components/";
								descritorDeVersao.version.split(".").forEach(function(numberVersion) {								
									diretorioDestinoComponentes = diretorioDestinoComponentes + numberVersion + "/";
								});
							
								descritorDeVersao.customizations.forEach(function(scene) {
								  	scene.components.forEach(function(component) {
								  		if (component.hasOwnProperty("source")) {
								  			oacEntries.forEach(function(file) {
								  				if(component.source == path.basename(file.entryName)) {
								  					component.source = diretorioDestinoComponentes + path.basename(component.source);
								  				}
											});											
										}
								  	});
								});

								//Inclui um novo DescritorDeVersao
								mongoConnection.collection("DescritoresDeVersoes").insert(descritorDeVersao, function(err, data) {
									
									if(err) {						      
								    	console.error(new Date() + " Erro ao Inserir DescritorDeVersao: " + err);
								    	callback(err, null);
									}

									//Envia os novos Componentes para o diretório de destino no servidor.
									//Caso exista arquivos com a mesma nomenclatura, eles não são substituidos.
								    oac.extractEntryTo("components/", diretorioDestinoComponentes, false, false);
									
									console.log(new Date() + " Novo documento DescritorDeVersao inserido: " + descritorDeVersao._id);
									callback(null, descritorDeVersao);
								});
							}
						});
					});
				});
			});
		}
	});
}

module.exports.criarOAC = criarOAC;
module.exports.buscarOAC = buscarOAC;
module.exports.buscarMetadadosOAC = buscarMetadadosOAC;
module.exports.buscarVersoesCustomizadas = buscarVersoesCustomizadas;
module.exports.gerarPacoteOAC = gerarPacoteOAC;
module.exports.gerarPacoteVersao = gerarPacoteVersao;
module.exports.criarVersaoCustomizada = criarVersaoCustomizada;
