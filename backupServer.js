var http = require('http');
var fs = require('fs');
var path = require("path"); 

var validExtensions = {
	".html" : "text/html",			
	".js": "application/javascript", 
	".css": "text/css",
	".txt": "text/plain",
	".jpg": "image/jpeg",
	".gif": "image/gif",
	".png": "image/png"
};
http.createServer(function(req, res){
	var filePath = '..' + req.url;
	if(filePath == '../') filePath = '../index.html';
	try{
	 filePath = decodeURIComponent(filePath); //Декодирует символы вида %D6%A1 и т.д.
	} catch (err) {//Ловим ошибку

	} 
	if(filePath.indexOf('\0') != -1){ //Символ '\0' нельзя передавать серверу, т.к. с ним могут неправильно работать некоторые функции
	 Ошибка
	}
	var ext = validExtensions[path.extname(filePath)];
	filePath = path.normalize(path.join(path.dirname(require.main.filename), filePath)); //Добавление начального пути к ссылке и нормализация ссылки (удаление всяких .. и ///). Используется модуль path
	console.log(filePath);
	sendFile(filePath, res, ext);
}).listen(3000);

function sendFile(fileName, res, extension){
	res.setHeader("Content-Type", extension);
	console.log(extension);
	var fileStream = fs.createReadStream(fileName);
	fileStream.pipe(res);
	fileStream.on('error', function(){
		res.statusCode = 500;
		res.end('Server error');
	});
	res.on('close', function(){ //При закрытии потока с ошибкой (разрыве соединения)
		fileStream.destroy();
	});
}