var fs = require('fs');
var path = require('path');
var async = require('async');
var generator = require('./generator/common');
var factory = require('./generator/factory');

var _rootPath = require('../common/conf').rootPath;

var _cb = require('../common/cube');

var getWidgetHtml = function (params, callback) {
    var asyncParams = {};
    asyncParams['widgetTpl'] = function (asyncCallback) {
        getWidgetTpl(params.size, params.corp.alias, params.corp.templateAlias[params.size], asyncCallback);
    };
    asyncParams['widgetSetting'] = function (asyncCallback) {
        getWidgetSetting(params.size, asyncCallback);
    };
    async.series(asyncParams, callback);
};

var getWidgetTplInner = function (size, corpId, callback) {
    if (generator.utility.isPreloading(corpId, size)) {
        setTimeout(getWidgetTplInner, 100, size, corpId, callback);
        return;
    }
    var widgetTplDict = generator.utility.getWidgetTplDict(corpId, size);
    var result = {};
    for (var attr in widgetTplDict) {
        var key = attr.substr(0, attr.length - 2);
        var value = widgetTplDict[attr].html;
        result[key] = value;
    }
    callback(null, result);
};

var getWidgetTpl = function (size, corpId, templateId, callback) {
    var asyncParams = [];
    asyncParams.push(function (asyncCallback) {
        generator.utility.preloadWidgetTpl(size, asyncCallback);
    });
    asyncParams.push(function (asyncCallback) {
        generator.utility.preloadWidgetTpl(size, asyncCallback, corpId, templateId);
    });
    asyncParams.push(function (asyncCallback) {
        generator.utility.preloadCommonTpl(size, asyncCallback, corpId, templateId);
    });
    async.series(asyncParams, function (err) {
        if (err) {
            callback(err);
            return;
        }
        getWidgetTplInner(size, corpId, callback);
    });
};

var getWidgetSetting = function (size, callback) {
    var widgetSettingPath = path.resolve(_rootPath, 'templatedesigner', 'setting');
    generator.utility.walk(widgetSettingPath, function (err, results) {
        if (err) {
            callback(err);
            return;
        }
        var templates = [];
        results.forEach(function (file) {
            var extname = path.extname(file);
            if (extname !== '.html') return;
            var key = path.basename(file, '.html');
            if (key.substr(key.length - 2) !== '_' + size) return;
            templates.push({ key: key.substr(0, key.length - 2), file: file });
        });
        var params = {};
        templates.forEach(function (template) {
            params[template.key] = function (asyncCallback) {
                fs.readFile(template.file, 'utf-8', asyncCallback);
            };
        });
        async.series(params, callback);
    });
};

var execTemplateEngine = function (req, params, callback) {
    //if (!params || !params.corp || !params.corp.alias || !params.corp.templateAlias || !params.route) return;
    var asyncParams = [];
    asyncParams.push(function (asyncCallback) {
        generator.utility.preloadWidgetTpl(params.size, asyncCallback);
    });
    //params.corpId = params.corp.alias;
    //params.templateId = params.corp.templateAlias[params.size];
    asyncParams.push(function (asyncCallback) {
        generator.utility.preloadWidgetTpl(params.size, asyncCallback, params.corpId, params.templateId);
    });
    asyncParams.push(function (asyncCallback) {
        generator.utility.preloadCommonTpl(params.size, asyncCallback, params.corpId, params.templateId);
    });
    async.series(asyncParams, function (err) {
        if (err) {
            callback(err);
            return;
        }
        execTemplateEngineInner(req, params, callback);
    });
};

var execTemplateEngineInner = function (req, params, callback) {
    /*if (generator.utility.isPreloading(params.corpId, params.size)) {
        setTimeout(execTemplateEngineInner, 100, req, params, callback);
        return;
    }*/
    params.lang = params.lang || 'zh-CN';
    params.level = params.level || 0;
    //params.corp.theme = params.corp.theme || 'default';
    callback = callback || function (err, result) { };
    var pageGenerator = factory.getPageGenerator(req, params, callback);
    if (!pageGenerator) return;
    pageGenerator.process();
};

var batchExecTemplateEngine = function (req, params, callback) {
    params.corpId = params.corp.alias;
    params.templateId = params.corp.templateAlias[params.size];
    params.size = params.size || 'L';
    if (!params.route) {
        var designPath = path.resolve(_rootPath, 'templates', params.corpId, params.templateId, 'pages', 'views_design');
        generator.utility.walk(designPath, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            var items = [];
            results.forEach(function (file) {
                var relativeFilePath = file.substr(designPath.length + 1);
                var extname = path.extname(file);
                var basename = relativeFilePath.substring(0, relativeFilePath.length - extname.length);
                if (basename.substr(basename.length - 2) === '_' + params.size) {
                    var item = basename.substring(0, basename.length - 2);
                    if (item !== 'header' && item !== 'footer') {
                        items.push(item.replace('\\', '.').replace('/', '.'));
                    }
                }
            });
            batchExecTemplateEngineInner(req, items, params, callback);
        });
    } else {
        var items = params.route.split('|');
        batchExecTemplateEngineInner(req, items, params, callback);
    }
};

var batchExecTemplateEngineInner = function (req, items, params, callback) {
    var asyncParams1 = [];
    asyncParams1.push(function (asyncCallback) {
        generator.utility.preloadWidgetTpl(params.size, asyncCallback);
    });
    asyncParams1.push(function (asyncCallback) {
        generator.utility.preloadWidgetTpl(params.size, asyncCallback, params.corpId, params.templateId);
    });
    asyncParams1.push(function (asyncCallback) {
        generator.utility.preloadCommonTpl(params.size, asyncCallback, params.corpId, params.templateId);
    });
    async.series(asyncParams1, function (err) {
        if (err) {
            callback(err);
            return;
        }
        var asyncParams = {};
        items.forEach(function (item) {
            if (params.mode === 'package' && item === 'index') return;
            var singleParams = _cb.webserver.utility.extend(true, {}, params);
            if (params.mode === 'package') {
                singleParams.postProcessCSS = false;
                singleParams.postProcessJS = false;
            }
            var routes = item.split('.');
            if (routes.length === 1) {
                if (item !== 'member') {
                    singleParams.route = item;
                } else {
                    singleParams.route = item;
                    singleParams.subroute = 'index';
                    singleParams.level = 1;
                }
            } else {
                singleParams.route = routes[0];
                singleParams.subroute = routes[1];
                singleParams.level = 1;
            }
            asyncParams[item] = function (asyncCallback) {
                execTemplateEngineInner(req, singleParams, asyncCallback);
            };
        });
        if (params.mode === 'package') {
            async.series(asyncParams, function (error, results) {
                if (error) {
                    callback(error);
                    return;
                }
                var singleParams = _cb.webserver.utility.extend(true, {}, params, { route: 'index', results: results });
                execTemplateEngineInner(req, singleParams, callback);
            });
            return;
        }
        async.series(asyncParams, callback);
    });
};

var readHtml = function (req, params, callback) {
    //if (!params || !params.corp || !params.corp.alias || !params.corp.templateAlias || !params.route) return;
    //params.corpId = params.corp.alias;
    //params.templateId = params.corp.templateAlias[params.size];
    params.size = params.size || 'L';
    callback = callback || function (err, result) { };
    var pageGenerator = factory.getPageGenerator(req, params, callback);
    if (!pageGenerator) return;
    pageGenerator.read(function () {
        execTemplateEngine(req, params, callback);
    });
};

var executeTemplate = function (req, params, callback) {
    if (_cb.webserver.utility.isArray(params)) {
        var asyncParams = [];
        params.forEach(function (item) {
            asyncParams.push(function (asyncCallback) {
                batchExecTemplateEngine(req, item, asyncCallback);
            });
        });
        async.series(asyncParams, callback);
    } else {
        batchExecTemplateEngine(req, params, callback);
    }
};

var processTemplate = function (params, callback) {
    if (_cb.webserver.utility.isArray(params)) {
        var asyncParams = [];
        params.forEach(function (item) {
            if (item.corpAlias === 'system') return;
            asyncParams.push(function (asyncCallback) {
                processTemplateInner(item, asyncCallback);
            });
        });
        async.series(asyncParams, callback);
    } else {
        if (params.corpAlias === 'system') {
            callback();
            return;
        }
        processTemplateInner(params, callback);
    }
};

var processTemplateInner = function (params, callback) {
    var copyBasePath = path.resolve(_rootPath, 'templates');
    var fromPath = path.resolve(copyBasePath, 'system');
    var toPath = path.resolve(copyBasePath, params.corpAlias);
    var templateAlias = params.templateAlias;
    if (templateAlias) {
        if (_cb.webserver.utility.isArray(templateAlias)) {
            var asyncParams = [];
            templateAlias.forEach(function (item) {
                asyncParams.push(function (asyncCallback) {
                    getExceptPaths(fromPath, toPath, item, function (exceptPaths) {
                        copyDirPreprocess(path.resolve(fromPath, item), path.resolve(toPath, item), asyncCallback, exceptPaths);
                    });
                });
            });
            async.series(asyncParams, callback);
        } else {
            getExceptPaths(fromPath, toPath, templateAlias, function (exceptPaths) {
                copyDirPreprocess(path.resolve(fromPath, templateAlias), path.resolve(toPath, templateAlias), callback, exceptPaths);
            });
        }
    } else {
        generator.utility.copyDir(fromPath, toPath, callback);
    }
};

var getExceptPaths = function (fromPath, toPath, templateAlias, callback) {
    var folder = ['views_design', 'config'];
    var route = ['home', 'list', 'detail'];
    var size = ['L', 'M'];
    var asyncParams = [];
    folder.forEach(function (folderItem) {
        route.forEach(function (routeItem) {
            size.forEach(function (sizeItem) {
                var to = path.resolve(toPath, templateAlias, 'pages', folderItem, routeItem + '_' + sizeItem + '.json');
                var from = path.resolve(fromPath, templateAlias, 'pages', folderItem, routeItem + '_' + sizeItem + '.json');
                asyncParams.push(function (asyncCallback) {
                    fs.exists(to, function (exists) {
                        asyncCallback(null, { exists: exists, from: from });
                    });
                });
            });
        });
    });
    async.series(asyncParams, function (err, results) {
        var exceptPaths = [
            path.resolve(fromPath, templateAlias, 'pages', 'views'),
            path.resolve(fromPath, templateAlias, 'widgets', 'cssmin'),
            path.resolve(fromPath, templateAlias, 'pages', 'cssmin')
        ];
        results.forEach(function (item) {
            if (item.exists)
                exceptPaths.push(item.from);
        });
        callback(exceptPaths);
    });
};

var copyDirPreprocess = function (fromPath, toPath, callback, exceptPaths) {
    fs.exists(fromPath, function (exists) {
        if (exists) {
            generator.utility.copyDir(fromPath, toPath, callback, exceptPaths);
        } else {
            callback(null, fromPath);
        }
    });
};

if (typeof exports !== "undefined") {
    module.exports = {
        getWidgetHtml: getWidgetHtml,
        execTemplateEngine: execTemplateEngine,
        readHtml: readHtml,
        processTemplate: processTemplate,
        executeTemplate: executeTemplate
    };
};