if (!sucess) {
	responseJSON.resultType = 'Erro';
	console.error(new Date() + " " + MENSAGEM_DE_ERRO);
} else {
	responseJSON.resultType = 'Sucess';
}