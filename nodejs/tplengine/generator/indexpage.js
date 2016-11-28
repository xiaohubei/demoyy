var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var template = require('art-template/node/template-native.js');

var conf = require('../../common/conf');
var _rootPath = conf.rootPath;
var _needCompress = conf.needCompress;

var generator = require('./common');

generator.register('IndexPage', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.OtherPage.call(this, req, params, callback);
    };
    page.prototype = new generator.OtherPage();
    page.prototype.pageRoute = pageRoute;

    page.prototype.constructHtmlTpl = function (headerHtmlTpl, footerHtmlTpl, viewData, isAndroid, fromWechat) {
        var params = this.getParams();
        var links;
        var scripts = ['jquery/jquery-1.11.3.min.js'];
        if (_needCompress && !params.keepOrigin) {      	
            if (isAndroid) {
                links = ['framework7plus/css/framework7.ios.min.css', 'framework7plus/css/framework7.ios.colors.min.css'];
                scripts.push('framework7plus/js/framework7.min.js');
            } else {
                links = ['framework7/css/framework7.ios.min.css', 'framework7/css/framework7.ios.colors.min.css'];
                scripts.push('framework7/js/framework7.min.js');
            }
            scripts.push('js/script.min.js');
            scripts.push('js/cube.mobile.min.js');
            if (fromWechat || params.mode === 'package')
                scripts.push('js/cube.config.min.js');
        } else {
            if (isAndroid) {
                links = ['framework7plus/css/framework7.ios.css', 'framework7plus/css/framework7.ios.colors.css'];
                scripts.push('framework7plus/js/framework7.js');
            } else {
                links = ['framework7/css/framework7.ios.css', 'framework7/css/framework7.ios.colors.css'];
                scripts.push('framework7/js/framework7.js');
            }
            scripts.push('js/script.js');
            scripts.push('js/cube.mobile.js');
            if (fromWechat || params.mode === 'package')
                scripts.push('js/cube.config.js');
        }
        viewData.links = {};
        links.forEach(function (link) {
            viewData.links[generator.utility.processLink(path.resolve(_rootPath, link), viewData)] = true;
        });
        viewData.scripts = {};
        scripts.forEach(function (script) {
            viewData.scripts[generator.utility.processScript(path.resolve(_rootPath, script), viewData)] = true;
        });
        if (params.results) {
            for (var attr in params.results) {
                var subViewData = params.results[attr];
                var subLinks = subViewData.links;
                for (var subLink in subLinks) {
                    viewData.links[subLink] = true;
                }
                var subScripts = subViewData.scripts;
                for (var subScript in subScripts) {
                    viewData.scripts[subScript] = true;
                }
            }
        }
        if (fromWechat)
            viewData.mode = 'wechat';
        var htmlTpl = this._get_data('designData');
        if (headerHtmlTpl)
            htmlTpl = htmlTpl.replace('<header></header>', headerHtmlTpl);
        if (footerHtmlTpl)
            htmlTpl = htmlTpl.replace('<footer></footer>', footerHtmlTpl);
        return htmlTpl;
    };

    page.prototype.getOutputParams = function (outputBasePath) {
        var params = this.getParams();
        var device = params.device || 'ios';
        if (params.mode === 'wechat')
            device += '.wechat';
        var name = params.route + '_' + params.size;
        var outputPath = path.resolve(outputBasePath, name);
        var outputParams = this.buildOutputParams(params, outputPath, device);
        return { dir: outputBasePath, file: outputParams.filePath, js: outputParams.jsPath, name: name };
    };

    page.prototype.resetOutputParams = function (isAndroid, fromWechat) {
        var params = this.getParams();
        var device = isAndroid ? 'android' : 'ios';
        if (fromWechat)
            device += '.wechat';
        var outputParams = this._get_data('outputParams');
        var outputPath = path.resolve(outputParams.dir, params.route + '_' + params.size);
        var outputParas = this.buildOutputParams(params, outputPath, device);
        outputParams.file = outputParas.filePath;
        return outputParams;
    };

    page.prototype.buildOutputParams = function (params, outputPath, device) {
        var outputFilePath;
        var outputJsPath;
        switch (params.mode) {
            case 'preview':
                outputFilePath = outputPath + '.preview.html';
                break;
            case 'designer':
                outputFilePath = outputPath + '.designer.html';
                break;
            case 'package':
                outputFilePath = outputPath.substr(0, outputPath.length - 2) + '.' + device + '.html';
                if (_needCompress && !params.keepOrigin)
                    outputJsPath = outputPath + '.min.js';
                break;
            default:
                if (_needCompress && !params.keepOrigin) {
                    outputFilePath = outputPath + '.' + device + '.min.html';
                    outputJsPath = outputPath + '.min.js';
                } else {
                    outputFilePath = outputPath + '.' + device + '.html';
                }
                break;
        }
        return { filePath: outputFilePath, jsPath: outputJsPath };
    };

    page.prototype.process = function () {
        var self = this;
        self.logInfo('生成页面：开始...', 'generateHtml');
        var params = self.getParams();
        var callback = self.getCallback();
        var basePath = path.resolve(_rootPath, 'templates', params.corpId, params.templateId, 'pages');
        var designBasePath = path.resolve(basePath, 'views_design');
        var configBasePath = path.resolve(basePath, 'config');
        self.processDesignFile(designBasePath, function (err, result) {
            if (err) {
                callback(err);
                return;
            }
            var packageBasePath = params.mode === 'package' ? path.resolve(_rootPath, 'package', params.corpId) : null;
            var isAndroids = [false, true];
            var fromWechats = [false, true];
            var asyncParams = [];
            if (params.device) {
                var isAndroid = params.device === 'android' ? true : false;
                var fromWechat = params.mode === 'wechat' ? true : false;
                self.processInner(asyncParams, result, isAndroid, fromWechat, designBasePath);
            } else if (params.mode === 'package') {
                isAndroids.forEach(function (isAndroid) {
                    self.processInner(asyncParams, result, isAndroid, false, designBasePath, packageBasePath);
                });
            } else if (params.mode === 'wechat') {
                isAndroids.forEach(function (isAndroid) {
                    self.processInner(asyncParams, result, isAndroid, true, designBasePath);
                });
            } else {
                isAndroids.forEach(function (isAndroid) {
                    fromWechats.forEach(function (fromWechat) {
                        self.processInner(asyncParams, result, isAndroid, fromWechat, designBasePath);
                    });
                });
            }
            async.series(asyncParams, function (error, results) {
                if (error) {
                    callback(error);
                    return;
                }
                self.logInfo('生成页面：完成...', 'generateHtml');
                if (params.mode === 'package') {
                    self.packageCopy(callback, results);
                    return;
                }
                callback(null, results[0]);
                self.isBusy = false;
            });
        });
    };

    page.prototype.processInner = function (asyncParams, designData, isAndroid, fromWechat, designBasePath, packageBasePath) {
        var self = this;
        var params = self.getParams();
        asyncParams.push(function (asyncCallback) {
            var commonTplDict = generator.utility.getCommonTplDict(params.corpId, params.size);
            var viewData = { corpId: params.corpId, size: params.size, lang: params.lang, level: params.level };
            viewData.route = params.route;
            viewData.corp = params.corp;
            viewData.mode = params.mode;
            viewData.keepOrigin = params.keepOrigin;
            viewData.overrideConfig = params.overrideConfig;
            var outputParams;
            if (params.device) {
                outputParams = self._get_data('outputParams');
            } else {
                outputParams = self.resetOutputParams(isAndroid, fromWechat);
            }
            viewData.outputParams = outputParams;
            var widgets = {};
            if (designData.hasHeader)
                generator.utility.mergeWidgets(commonTplDict['HeaderData'].widgets, widgets);
            if (designData.hasFooter)
                generator.utility.mergeWidgets(commonTplDict['FooterData'].widgets, widgets);
            viewData.widgets = widgets;
            var headerHtmlTpl = designData.hasHeader ? commonTplDict['HeaderDesign'].body : null;
            var footerHtmlTpl = designData.hasFooter ? commonTplDict['FooterDesign'].body : null;
            var htmlTpl = self.constructHtmlTpl(headerHtmlTpl, footerHtmlTpl, viewData, isAndroid, fromWechat);
            viewData.tplDir = designBasePath;
            for (var attr in widgets)
                widgets[attr].tplDir = designBasePath;
            //var func = template.compile(htmlTpl);
            //var html = func({ view: viewData });
            //var outputHtml = html;
            var outputHtml = self.runTemplate(htmlTpl, viewData);
            var outputDir = params.mode === 'package' ? packageBasePath : outputParams.dir;
            mkdirp(outputDir, function (err1, result1) {
                if (err1) {
                    asyncCallback(err1);
                    return;
                }
                var outputFile = params.mode === 'package' ? path.resolve(packageBasePath, path.basename(outputParams.file)) : outputParams.file;
                fs.writeFile(outputFile, outputHtml, function (err2, result2) {
                    if (err2) {
                        asyncCallback(err2);
                        return;
                    }
                    generator.cache.delPageContent(outputParams.file);
                    if (params.mode === 'package') {
                        asyncCallback(null, viewData);
                        return;
                    }
                    self.postProcess(viewData, function (err3, result3) {
                        if (err3) {
                            asyncCallback(err3);
                            return;
                        }
                        asyncCallback(null, outputHtml);
                    });
                });
            });
        });
    };

    page.prototype.packageCopy = function (callback, results) {
        var self = this;
        self.logInfo('复制文件：开始...', 'packageCopy');
        var params = self.getParams();
        var packageBasePath = path.resolve(_rootPath, 'package', params.corpId);
        var dirnames = ['framework7/img', 'framework7plus/img', 'img'];
        var tplBasePath = 'templates/' + params.corpId + '/' + params.templateId;
        dirnames.push(tplBasePath + '/widgets/images');
        dirnames.push(tplBasePath + '/pages/img');
        var refObj = {};
        results.forEach(function (viewData) {
            viewData.linkPaths.forEach(function (linkPath) {
                refObj[linkPath] = true;
            });
            viewData.scriptPaths.forEach(function (scriptPath) {
                refObj[scriptPath] = true;
            });
        });
        var refPaths = [];
        for (var refPath in refObj) {
            refPaths.push(refPath);
        }
        var asyncParams = [];
        asyncParams.push(function (asyncCallback) {
            self.postProcess(results[0], asyncCallback);
        });
        dirnames.forEach(function (dirname) {
            asyncParams.push(function (asyncCallback) {
                var fromPath = path.resolve(_rootPath, dirname);
                var toPath = path.resolve(packageBasePath, dirname);
                generator.utility.copyDir(fromPath, toPath, asyncCallback, []);
            });
        });
        refPaths.forEach(function (refPath) {
            asyncParams.push(function (asyncCallback) {
                var toRefPath = path.resolve(packageBasePath, path.relative(_rootPath, refPath));
                generator.utility.copyFile(refPath, toRefPath, asyncCallback);
            });
        });
        asyncParams.push(function (asyncCallback) {
            var items = [];
            items.push('cb.config = {');
            items.push('    webDomain: "http://' + params.webDomain + '",');
            if (params.version)
                items.push('    version: "' + params.version + '",');
            items.push('    filePath: "' + path.relative(_rootPath, self._get_data('outputParams').dir).replace(/\\/g, '/') + '",');
            items.push('    dynamicRoute: [ "home" ]');
            items.push('};');
            var configFileName = _needCompress && !params.keepOrigin ? 'cube.config.min.js' : 'cube.config.js';
            var configFilePath = path.resolve(packageBasePath, 'js', configFileName);
            fs.writeFile(configFilePath, items.join('\r\n'), asyncCallback);
        });
        async.series(asyncParams, function (error, results) {
            if (error) {
                callback(error);
                return;
            }
            self.logInfo('复制文件：完成...', 'packageCopy');
            callback();
            self.isBusy = false;
        });
    };

    return page;
});