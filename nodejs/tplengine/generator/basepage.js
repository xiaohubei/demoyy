var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var less = require('less');
var log = require('../../logger/log');
var template = require('art-template/node/template-native.js');

var conf = require('../../common/conf');
var _rootPath = conf.rootPath;
var _needCompress = conf.needCompress;

var _cb = require('../../common/cube');

//var MiniHTML;
var CleanCSS;
var UglifyJS;
if (_needCompress) {
    //MiniHTML = require('html-minifier').minify;
    CleanCSS = require('clean-css');
    UglifyJS = require('uglify-js');
}

var generator = require('./common');

generator.register('BasePage', function (pageRoute) {
    var page = function (req, params, callback) {
        var _data = {};

        this._get_data = function (attr) {
            return _data[attr];
        };

        this._set_data = function (attr, val) {
            _data[attr] = val;
        };

        this.init(req, params, callback);
    };
    page.prototype.pageRoute = pageRoute;

    page.prototype.init = function (req, params, callback) {
        if(params){
            params.corpId =  params.corpId || "system";
            params.templateId = params.templateId || "red";
            params.corp = params.corp || {};
            params.corp.theme = params.corp.theme || "blue";
        }
        this._set_data('req', req);
        this._set_data('params', params);
        this._set_data('callback', callback);
        this.initOutputParams();
    };

    page.prototype.getReq = function () {
        return this._get_data('req');
    };

    page.prototype.getParams = function () {
        return this._get_data('params');
    };

    page.prototype.getCallback = function () {
        return this._get_data('callback');
    };

    page.prototype.initOutputParams = function () {
        var params = this.getParams();
        if (!params) return;
        var basePath = path.resolve(_rootPath, 'templates');
        var tplBasePath = path.resolve(basePath, params.corpId, params.templateId);
        var outputParams = this.getOutputParams(path.resolve(tplBasePath, 'pages', 'views'));
        if (_needCompress && !params.keepOrigin) {
            var tplNameSections = [];
            tplNameSections.push(outputParams.name);
            tplNameSections.push(params.corp.theme);
            tplNameSections.push('min.css');
            var tplName = tplNameSections.join('.');
            var sysWidgetNameSections = [];
            sysWidgetNameSections.push(params.corpId);
            sysWidgetNameSections.push(params.templateId);
            var sysWidgetName = sysWidgetNameSections.join('.') + '.' + tplName;
            outputParams.css = {
                'sysWidget': path.resolve(basePath, 'widgets', 'cssmin', sysWidgetName),
                'tplWidget': path.resolve(tplBasePath, 'widgets', 'cssmin', tplName),
                'tplPage': path.resolve(tplBasePath, 'pages', 'cssmin', tplName)
            };
        }
        this._set_data('outputParams', outputParams);
    };

    page.prototype.postProcess = function (viewData, callback) {
        var self = this;
        var params = self.getParams();
        if (params.postProcessCSS === false) {
            if (params.postProcessJS === false) {
                callback();
                return;
            } else {
                if (_needCompress && !params.keepOrigin) {
                    var outputParams = self._get_data('outputParams');
                    try {
                        self.writeCompressJS(viewData.scripts, outputParams.js, callback);
                    } catch (exp) {
                        self.logError(exp.message, 'postProcess');
                        callback(exp);
                    }
                }
            }
        } else {
            var theme = params.corp.theme;
            var themeFilePath = path.resolve(_rootPath, 'css', 'themes', theme + '.less');
            fs.readFile(themeFilePath, 'utf-8', function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                result += '\r\n' + '@w:' + (viewData.width === 'fixed' ? '1200px' : '98%') + ';';
                try {
                    if (_needCompress && !params.keepOrigin) {
                        var outputParams = self._get_data('outputParams');
                        var asyncParams = {
                            compressCSS: function (asyncCallback) {
                                self.writeCompressCSS(viewData.links, outputParams.css, result, asyncCallback);
                            }
                        };
                        if (params.postProcessJS !== false) {
                            asyncParams['compressJS'] = function (asyncCallback) {
                                self.writeCompressJS(viewData.scripts, outputParams.js, asyncCallback);
                            }
                        }
                        async.series(asyncParams, function (err1, results) {
                            if (err1) {
                                self.logError(err1.message, 'postProcess');
                                callback(err1);
                                return;
                            }
                            callback();
                        });
                    } else {
                        self.writeOriginalCSS(viewData.links, theme, result, callback);
                    }
                } catch (exp) {
                    self.logError(exp.message, 'postProcess');
                    callback(exp);
                }
            });
        }
    };

    page.prototype.writeCompressCSS = function (linkObj, cssObj, result, callback) {
        var minLinks = [];
        var dirObj = {};
        for (var link in linkObj) {
            var items = link.split('&');
            var index = path.dirname(items[1]) + 'min';
            if (dirObj[index]) {
                dirObj[index].push(items[1]);
            } else {
                dirObj[index] = [items[1]];
            }
        }
        for (var item in cssObj) {
            var cssPath = cssObj[item];
            var dir = path.dirname(cssPath);
            if (dirObj[dir]) {
                minLinks.push({ dir: dir, file: cssPath, value: dirObj[dir] });
            }
        }
        var asyncParams = [];
        minLinks.forEach(function (minLink) {
            asyncParams.push(function (asyncCallback) {
                var asyncParams1 = [];
                minLink.value.forEach(function (link) {
                    asyncParams1.push(function (asyncCallback1) {
                        fs.readFile(link, 'utf-8', function (err1, result1) {
                            if (err1) {
                                asyncCallback1(err1);
                                return;
                            }
                            var extname = path.extname(link);
                            if (extname !== '.less') {
                                asyncCallback1(null, result1);
                                return;
                            }
                            less.render(result + '\r\n' + result1, { paths: [path.dirname(link)] }, function (err2, result2) {
                                if (err2) {
                                    asyncCallback1({ message: err2.message, source: link });
                                    return;
                                }
                                asyncCallback1(null, result2.css);
                            });
                        });
                    });
                });
                async.series(asyncParams1, function (err, results) {
                    if (err) {
                        asyncCallback(err);
                        return;
                    }
                    var minified = new CleanCSS().minify(results.join('\r\n')).styles;
                    mkdirp(minLink.dir, function (err1, result) {
                        if (err1) {
                            asyncCallback(err1);
                            return;
                        }
                        fs.writeFile(minLink.file, minified, asyncCallback);
                        _cb.webserver.cache.delFileContent(minLink.file);
                    });
                });
            });
        });
        async.series(asyncParams, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            callback();
        });
    };

    page.prototype.writeCompressJS = function (scriptObj, minJsPath, callback) {
        var scripts = [];
        for (var script in scriptObj) {
            var items = script.split('&');
            scripts.push(items[1]);
        }
        try {
            if (!scripts.length) {
                callback();
                return;
            }
            var result = UglifyJS.minify(scripts);
            mkdirp(path.dirname(minJsPath), function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                var stream = fs.createWriteStream(minJsPath);
                stream.end(result.code, 'utf-8', callback);
                _cb.webserver.cache.delFileContent(minJsPath);
            });
        } catch (exp) {
            callback(exp);
            log.logger.error(exp.message, 'writeCompressJS');
        }
    };

    page.prototype.writeOriginalCSS = function (linkObj, theme, result, callback) {
        var links = [];
        for (var link in linkObj) {
            var items = link.split('&');
            links.push(items[1]);
        }
        var asyncParams = [];
        links.forEach(function (link) {
            var extname = path.extname(link);
            if (extname !== '.less') {
                return;
            }
            asyncParams.push(function (asyncCallback) {
                fs.readFile(link, 'utf-8', function (err1, result1) {
                    if (err1) {
                        asyncCallback(err1);
                        return;
                    }
                    less.render(result + '\r\n' + result1, { paths: [path.dirname(link)] }, function (err2, result2) {
                        if (err2) {
                            asyncCallback({ message: err2.message, source: link });
                            return;
                        }
                        var newLink = generator.utility.resetLinkName(link, theme);
                        fs.writeFile(newLink, result2.css, asyncCallback);
                        _cb.webserver.cache.delFileContent(newLink);
                    });
                });
            });
        });
        async.series(asyncParams, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            callback();
        });
    };

    page.prototype.getOutputParams = function (outputBasePath) {
        var subFolderName = this.getSubFolderName ? this.getSubFolderName() : '';
        var params = this.getParams();
        var outputDir = subFolderName ? path.resolve(outputBasePath, subFolderName) : outputBasePath;
        var subName = (subFolderName ? params.subroute : params.route) + '_' + params.size;
        var name = subFolderName ? subFolderName + '.' + subName : subName;
        var outputPath = path.resolve(outputDir, subName);
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
                outputFilePath = outputPath.substr(0, outputPath.length - 2) + '.html';
                break;
            default:
                if (_needCompress && !params.keepOrigin) {
                    outputFilePath = outputPath + '.min.html';
                    outputJsPath = outputPath + '.min.js';
                } else {
                    outputFilePath = outputPath + '.html';
                }
                break;
        }
        return { dir: outputDir, file: outputFilePath, js: outputJsPath, name: name };
    };

    page.prototype.processDesignFile = function (designBasePath, callback) {
        var self = this;
        //var params = self.getParams();
        var designFilePath = this.getDesignFilePath(designBasePath);
        generator.utility.processDesignHtml(designFilePath, designBasePath, function (err, result) {
            if (err) {
                callback(err);
                return;
            }
            self._set_data('designData', result.html);
            var hasHeader = result.body.indexOf('<header></header>') !== -1;
            var hasFooter = result.body.indexOf('<footer></footer>') !== -1;
            callback(null, { hasHeader: hasHeader, hasFooter: hasFooter });
        });
    };

    page.prototype.getDesignFilePath = function (designBasePath) {
        var subFolderName = this.getSubFolderName ? this.getSubFolderName() : '';
        var params = this.getParams();
        var tplDir = subFolderName ? path.resolve(designBasePath, subFolderName) : designBasePath;
        this._set_data('tplDir', tplDir);
        var fileName = (subFolderName ? params.subroute : params.route) + '_' + params.size + '.html';
        return path.resolve(tplDir, fileName);
    };

    page.prototype.processConfigFile = function (configBasePath, callback) {
        var params = this.getParams();
        var bodyDataPath = this.getBodyDataPath(configBasePath);
        if (params.para && params.para.configData) {
            var configData = params.para.configData;
            generator.utility.processDataJson(configData, params.corpId, params.size, function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                if (params.overrideConfig === false) {
                    callback(null, result);
                } else {
                    mkdirp(path.dirname(bodyDataPath), function (err1, result1) {
                        if (err1) {
                            callback(err1);
                            return;
                        }
                        var stream = fs.createWriteStream(bodyDataPath);
                        stream.end(JSON.stringify(configData, null, '\t'), function (err2, result2) {
                            if (err2) {
                                callback(err2);
                                return;
                            }
                            callback(null, result);
                        });
                    });
                }
            });
        } else {
            fs.exists(bodyDataPath, function (exists) {
                generator.utility.processDataJson(exists ? bodyDataPath : null, params.corpId, params.size, callback);
            });
        }
    };

    page.prototype.getBodyDataPath = function (configBasePath) {
        var params = this.getParams();
        return path.resolve(configBasePath, params.route + '_' + params.size + '.json');
    };

    page.prototype.constructCommonRefs = function (viewData) {
        var params = this.getParams();
        var links;
        var scripts;
        if (params.size === 'L') {
            if (_needCompress && !params.keepOrigin) {
                links = ['bootstrap/css/bootstrap.min.css'];
                scripts = ['jquery/jquery-1.11.3.min.js', 'js/template-native.min.js', 'js/cube.min.js'];
            } else {
                links = ['bootstrap/css/bootstrap.css'];
                scripts = ['jquery/jquery-1.11.3.js', 'js/template-native-debug.js', 'js/cube.js'];
            }
        } else {
            links = [];
            scripts = [];
        }
        viewData.links = {};
        links.forEach(function (link) {
            viewData.links[generator.utility.processLink(path.resolve(_rootPath, link), viewData)] = true;
        });
        viewData.scripts = {};
        scripts.forEach(function (script) {
            viewData.scripts[generator.utility.processScript(path.resolve(_rootPath, script), viewData)] = true;
        });
    };

    page.prototype.logInfo = function (message, source) {
        var outputParams = this._get_data('outputParams');
        log.logger.info(outputParams.name, message, source);
    };

    page.prototype.logError = function (message, source) {
        var outputParams = this._get_data('outputParams');
        log.logger.error(outputParams.name, message, source);
    };

    page.prototype.runTemplate = function (htmlTpl, viewData) {
        var func = template.compile(htmlTpl);
        return func({ view: viewData });
    };

    page.prototype.process = function () {
        var self = this;
        self.logInfo('生成页面：开始...', 'generateHtml');
        var params = self.getParams();
        var callback = self.getCallback();
        var basePath = path.resolve(_rootPath, 'templates', params.corpId, params.templateId, 'pages');
        //var basePath = path.resolve(_rootPath, 'templates', "system", "red", 'pages');
        var designBasePath = path.resolve(basePath, 'views_design');
        var configBasePath = path.resolve(basePath, 'config');
        self.processDesignFile(designBasePath, function (designErr, designData) {
            if (designErr) {
                callback(designErr);
                return;
            }
            self.processConfigFile(configBasePath, function (configErr, configData) {
                if (configErr) {
                    callback(configErr);
                    return;
                }
                var commonTplDict = generator.utility.getCommonTplDict(params.corpId, params.size);
                var viewData = configData;
                viewData.lang = params.lang;
                viewData.level = params.level;
                viewData.route = params.route;
                viewData.corp = params.corp;
                viewData.mode = params.mode;
                viewData.keepOrigin = params.keepOrigin;
                viewData.overrideConfig = params.overrideConfig;
                var outputParams = self._get_data('outputParams');
                viewData.outputParams = outputParams;
                var widgets = {};
                if (designData.hasHeader)
                    generator.utility.mergeWidgets(commonTplDict['HeaderData'].widgets, widgets);
                generator.utility.mergeWidgets(viewData.widgets, widgets);
                if (designData.hasFooter)
                    generator.utility.mergeWidgets(commonTplDict['FooterData'].widgets, widgets);
                for (var attr in widgets) {
                    widgets[attr].lang = params.lang;
                }
                viewData.widgets = widgets;
                var headerHtmlTpl = designData.hasHeader ? commonTplDict['HeaderDesign'].body : null;
                var footerHtmlTpl = designData.hasFooter ? commonTplDict['FooterDesign'].body : null;
                var htmlTpl = self.constructHtmlTpl(headerHtmlTpl, footerHtmlTpl, viewData);
                viewData.tplDir = viewData.tplDir || designBasePath;
                self.constructCommonRefs(viewData);
                generator.utility.processRefs(viewData);
                if (designData.hasHeader) {
                    var head = commonTplDict['HeaderDesign'].head;
                    generator.utility.processRefsInner(head.links, head.scripts, viewData);
                }
                if (designData.hasFooter) {
                    var head = commonTplDict['FooterDesign'].head;
                    generator.utility.processRefsInner(head.links, head.scripts, viewData);
                }
                //var func = template.compile(htmlTpl);
                //var html = func({ view: viewData });
                //var outputHtml = html;
                var outputHtml = self.runTemplate(htmlTpl, viewData);
                var packageBasePath = params.mode === 'package' ? path.resolve(_rootPath, 'package', params.corpId) : null;
                var outputDir = params.mode === 'package' ? path.resolve(packageBasePath, path.relative(_rootPath, outputParams.dir)) : outputParams.dir;
                mkdirp(outputDir, function (err1, result1) {
                    if (err1) {
                        callback(err1);
                        return;
                    }
                    var outputFile = params.mode === 'package' ? path.resolve(packageBasePath, path.relative(_rootPath, outputParams.file)) : outputParams.file;
                    fs.writeFile(outputFile, outputHtml, function (err2, result2) {
                        if (err2) {
                            callback(err2);
                            return;
                        }
                        generator.cache.delPageContent(outputParams.file);
                        self.postProcess(viewData, function (err3, result3) {
                            if (err3) {
                                callback(err3);
                                return;
                            }
                            self.logInfo('生成页面：完成...', 'generateHtml');
                            if (params.mode === 'package') {
                                viewData.html = outputHtml;
                                callback(null, viewData);
                            } else {
                                callback(null, outputHtml);
                            }
                            self.isBusy = false;
                        });
                    });
                });
            });
        });
    };

    page.prototype.read = function (noExistCallback) {
        var params = this.getParams();
        var callback = this.getCallback();
        var htmlPath = this._get_data('outputParams').file;
        var pageContent = generator.cache.getPageContent(htmlPath);
        if (pageContent) {
            callback(null, pageContent);
            return;
        }
        var self = this;
        fs.exists(htmlPath, function (exists) {
            if (exists) {
                fs.readFile(htmlPath, 'utf-8', function (err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    generator.cache.setPageContent(htmlPath, result);
                    callback(null, result);
                    self.isBusy = false;
                });
            } else {
                //callback(htmlPath + ' not exists');
                noExistCallback();
            }
        });
    };

    return page;
});