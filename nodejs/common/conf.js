var path = require('path');

var parseUrl = function (url) {
    if (!url) return url;
    if (url.substr(url.length - 1, 1) === '/')
        url = url.substr(0, url.length - 1);
    return url;
};

var rootPath = path.dirname(path.dirname(__dirname));
var currentPort = process.env.PORT;
//var serviceBaseUrl = parseUrl(process.env.PLAY);
var serviceBaseUrl = "http://127.0.0.1:9000";
var yilianServerUrl = parseUrl(process.env.YILIAN);
var imageServerUrl = parseUrl(process.env.IMAGE);
var needCompress = process.env.MODE !== 'debug' && process.env.ZIP === 'true' ? true : false;
var needPatch = process.env.PATCH === 'true' ? true : false;
//var isDebugMode = process.env.MODE === 'debug' ? true : false;
var isDebugMode = false;
//var debugTemplateAlias = process.env.TPL;
var debugTemplateAlias = "red";
var needPackage = process.env.PACKAGE != null && process.env.PACKAGE !== 'false' ? true : false;
var demoWebDomain = process.env.DEMO;

module.exports = {
    rootPath: rootPath,
    currentPort: currentPort,
    serviceBaseUrl: serviceBaseUrl,
    yilianServerUrl: yilianServerUrl,
    imageServerUrl: imageServerUrl,
    needCompress: needCompress,
    needPatch: needPatch,
    isDebugMode: isDebugMode,
    debugTemplateAlias: debugTemplateAlias,
    needPackage: needPackage,
    demoWebDomain: demoWebDomain
};