var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var htmlparser = require('htmlparser');
var log = require('../../logger/log');

var template = require('art-template/node/template-native.js');
template.config('escape', false);

template.onerror = function (e) {
    var message = 'Template Error\n\n';
    for (var name in e)
        message += '<' + name + '>\n' + e[name] + '\n\n';
    log.logger.error(message);
};

//template.helper('adjustImgSrc', function (src) {
//    if (!src) return src;
//    var newSrc = src.replace(/\\/g, '/');
//    if (conf.imageServerUrl) {
//        if (newSrc.substr(0, 1) === '/') {
//            newSrc = conf.imageServerUrl + newSrc;
//        } else {
//            newSrc = conf.imageServerUrl + '/' + newSrc;
//        }
//    }
//    return newSrc;
//});

template.helper('getImgRelativePath', function (value, tplDir) {
    return path.relative(_rootPath, path.resolve(tplDir, value)).replace(/\\/g, '/');
});

template.helper('logInfo', function (message, source) {
    log.logger.info(message, source);
});

template.helper('logError', function (message, source) {
    log.logger.error(message, source);
});

template.helper('getYiLianServerUrl', function () {
    return conf.yilianServerUrl;
});

template.helper('resetTitle', function (viewData, title) {
    viewData.corp = viewData.corp ||  {};
    return viewData.corp.siteName ? viewData.corp.siteName + ' - ' + title : title;
});

// 处理页面样式引用
template.helper('includeLinks', function (viewData, external) {
    viewData.corp = viewData.corp ||  {};
    var linkObj = viewData.links;
    if (external && external.length) {
        external.forEach(function (link) {
            var newLink = generator.utility.processLink(generator.utility.processHeadRoot(link, viewData.tplDir), viewData);
            if (!linkObj[newLink])
                linkObj[newLink] = true;
        });
    }
    if (viewData.mode === 'package' && viewData.route !== 'index') return;
    var links = [];
    var linkPaths = [];
    if (viewData.size === 'L' && viewData.mode !== 'preview')
        links.push('<meta http-equiv="X-UA-Compatible" content="IE=edge" />');
    if (!conf.isDebugMode && viewData.overrideConfig !== false) {
        var oneAPMScript = generator.utility.processScript(path.resolve(_rootPath, 'js/OneAPM.js'), viewData);
        var items = oneAPMScript.split('&');
        links.push(items[0]);
        var loggerScript = generator.utility.processScript(path.resolve(_rootPath, 'js/logger/install_up_beacon.js'), viewData);
        items = loggerScript.split('&');
        links.push(items[0]);
    }
    var iconPath = viewData.corp.iconPath || 'img/logo.ico';
    links.push('<link rel="shortcut icon" href="' + iconPath + '" />');
    if (_needCompress && !viewData.keepOrigin) {
        for (var link in linkObj) {
            var items = link.split('&');
            if (items[1].substr(items[1].length - 8, 8) === '.min.css') {
                links.push(items[0]);
                linkPaths.push(items[1]);
                delete linkObj[link];
            }
        }
        var minLinks = generator.utility.handleMinLinks(linkObj, viewData);
        minLinks.forEach(function (minLink) {
            var items = minLink.split('&');
            links.push(items[0]);
            linkPaths.push(items[1]);
        });
    } else {
        for (var link in linkObj) {
            var items = link.split('&');
            links.push(items[0]);
            linkPaths.push(path.extname(items[1]) === '.less' ? generator.utility.resetLinkName(items[1], viewData.corp.theme) : items[1]);
        }
    }
    viewData.linkPaths = linkPaths;
    return links.join('\r\n');
});

// 处理挂件
template.helper('includeWidget', function (widgetData) {
    if (!widgetData) return;
    var widgetTplDict = generator.utility.getWidgetTplDict(widgetData.corpId, widgetData.size);
    if (!widgetTplDict) return;
    var widgetKey = widgetData.type + '_' + widgetData.size;
    var widgetTpl = widgetTplDict[widgetKey];
    if (!widgetTpl || !widgetTpl.body) return;
    var resource = widgetTpl.head && widgetTpl.head.resource && widgetTpl.head.resource[widgetData.lang];
    var newData = _cb.webserver.utility.extend(true, {}, resource, widgetData);
    return widgetTpl.body(newData);
});

// 处理页面脚本引用
template.helper('includeScripts', function (viewData, external) {
    viewData.corp = viewData.corp ||  {};
    var scriptObj = viewData.scripts;
    if (external && external.length) {
        external.forEach(function (script) {
            var newScript = generator.utility.processScript(generator.utility.processHeadRoot(script, viewData.tplDir), viewData);
            if (!scriptObj[newScript])
                scriptObj[newScript] = true;
        });
    }
    if (viewData.mode === 'package' && viewData.route !== 'index') return;
    var scripts = [];
    var scriptPaths = [];
    if (_needCompress && !viewData.keepOrigin) {
        for (var script in scriptObj) {
            var items = script.split('&');
            if (items[1].substr(items[1].length - 7, 7) === '.min.js') {
                scripts.push(items[0]);
                scriptPaths.push(items[1]);
                delete scriptObj[script];
            }
        }
        var items = generator.utility.processScript(viewData.outputParams.js, viewData).split('&');
        scripts.push(items[0]);
        scriptPaths.push(items[1]);
    } else {
        for (var script in scriptObj) {
            var items = script.split('&');
            scripts.push(items[0]);
            scriptPaths.push(items[1]);
        }
    }
    viewData.scriptPaths = scriptPaths;
    return scripts.join('\r\n');
});

var conf = require('../../common/conf');
var _rootPath = conf.rootPath;
var _needCompress = conf.needCompress;

var _cb = require('../../common/cube');

// 生成html
var generator = {};

generator.register = function (pageRoute, func) {
    generator[pageRoute] = func(pageRoute);
};

generator.cache = { pageContentDict: {} };

generator.cache.setPageContent = function (htmlPath, content) {
    return;
    this.pageContentDict[htmlPath] = content;
};

generator.cache.getPageContent = function (htmlPath) {
    return this.pageContentDict[htmlPath];
};

generator.cache.delPageContent = function (htmlPath) {
    delete this.pageContentDict[htmlPath];
};

generator.utility = { widgetTplFlag: {}, widgetTplDict: {}, commonTplFlag: {}, commonTplDict: {} };

generator.utility.handleMinLinks = function (linkObj, viewData) {
    var minLinks = [];
    var dirObj = {};
    for (var link in linkObj) {
        var items = link.split('&');
        dirObj[path.dirname(items[1]) + 'min'] = true;
    }
    var cssObj = viewData.outputParams.css;
    for (var item in cssObj) {
        var cssPath = cssObj[item];
        var dir = path.dirname(cssPath);
        if (dirObj[dir])
            minLinks.push(this.processLink(cssPath, viewData));
    }
    return minLinks;
};

generator.utility.getWidgetTplDict = function (corpId, size) {
    return _cb.webserver.utility.extend(true, {}, this.widgetTplDict['default_' + size], this.widgetTplDict[corpId + '_' + size]);
};

generator.utility.getCommonTplDict = function (corpId, size) {
    return this.commonTplDict[corpId + '_' + size];
};

generator.utility.isPreloading = function (corpId, size) {
    return !this.widgetTplDict['default_' + size] || !this.widgetTplDict[corpId + '_' + size] || !this.commonTplDict[corpId + '_' + size];
};

generator.utility.preloadCommonTpl = function (size, callback, corpId, templateId) {
    var commonKey = corpId + '_' + size;
    if (!conf.isDebugMode) {
        if (this.commonTplFlag[commonKey]) {
            callback();
            return;
        }
        this.commonTplFlag[commonKey] = true;
    }
    this.commonTplDict[commonKey] = null;
    var message = '"' + commonKey + '/' + templateId + '"模板公共';
    log.logger.info('初始化：开始加载' + message + '...', 'preloadCommonTpl');
    var basePath = path.resolve(_rootPath, 'templates', corpId, templateId, 'pages');
    var designBasePath = path.resolve(basePath, 'views_design');
    var configBasePath = path.resolve(basePath, 'config');
    var self = this;
    var asyncParams = {};
    asyncParams['HeaderDesign'] = function (asyncCallback) {
        var headerDesignPath = path.resolve(designBasePath, 'header_' + size + '.html');
        self.processDesignHtml(headerDesignPath, designBasePath, asyncCallback);
    };
    asyncParams['HeaderData'] = function (asyncCallback) {
        var headerDataPath = path.resolve(configBasePath, 'header_' + size + '.json');
        self.processDataJson(headerDataPath, corpId, size, asyncCallback);
    };
    asyncParams['FooterDesign'] = function (asyncCallback) {
        var footerDesignPath = path.resolve(designBasePath, 'footer_' + size + '.html');
        self.processDesignHtml(footerDesignPath, designBasePath, asyncCallback);
    };
    asyncParams['FooterData'] = function (asyncCallback) {
        var footerDataPath = path.resolve(configBasePath, 'footer_' + size + '.json');
        self.processDataJson(footerDataPath, corpId, size, asyncCallback);
    };
    async.series(asyncParams, function (err, results) {
        if (err) {
            log.logger.error(err.message, 'preloadCommonTpl');
            delete self.commonTplFlag[commonKey];
            callback(err);
            return;
        }
        self.commonTplDict[commonKey] = results;
        log.logger.info('初始化：全部' + message + '已加载完成...', 'preloadCommonTpl');
        callback();
    });
};

// 预加载挂件模板
generator.utility.preloadWidgetTpl = function (size, callback, corpId, templateId) {
    var widgetKey = corpId ? (corpId + '_' + size) : 'default_' + size;
    if (!conf.isDebugMode) {
        if (this.widgetTplFlag[widgetKey]) {
            callback();
            return;
        }
        this.widgetTplFlag[widgetKey] = true;
    }
    this.widgetTplDict[widgetKey] = null;
    var message = widgetKey === 'default_' + size ? '"' + widgetKey + '"系统挂件' : '"' + widgetKey + '/' + templateId + '"模板挂件';
    log.logger.info('初始化：开始加载' + message + '...', 'preloadWidgetTpl');
    var widgetTplPartPath = widgetKey === 'default_' + size ? '' : corpId + '/' + templateId;
    var widgetTplPath = path.resolve(_rootPath, 'templates', widgetTplPartPath, 'widgets', 'views');
    var self = this;
    this.walk(widgetTplPath, function (err, results) {
        if (err) {
            log.logger.error(err.message, 'preloadWidgetTpl');
            delete self.widgetTplFlag[widgetKey];
            callback(err);
            return;
        }
        var templates = [];
        results.forEach(function (file) {
            var extname = path.extname(file);
            if (extname !== '.html') return;
            var key = path.basename(file, '.html');
            if (key.substr(key.length - 2) !== '_' + size) return;
            templates.push({ key: key, dir: widgetTplPath, file: file });
        });
        self.readTemplate(templates, widgetKey, function (err1) {
            if (err1) {
                log.logger.error(err1.message, 'preloadWidgetTpl');
                delete self.widgetTplFlag[widgetKey];
                callback(err1);
                return;
            }
            log.logger.info('初始化：全部' + message + '已加载完成（模板数：' + templates.length + '）...', 'preloadWidgetTpl');
            callback();
        });
    });
};

generator.utility.readTemplate = function (templates, widgetKey, callback) {
    var handler = new htmlparser.DefaultHandler();
    var parser = new htmlparser.Parser(handler);
    var params = {};
    templates.forEach(function (template) {
        params[template.key] = function (asyncCallback) {
            fs.readFile(template.file, 'utf-8', function (err, result) {
                if (err) {
                    asyncCallback(err);
                    return;
                }
                var head = result.split('<head>')[1].split('</head>')[0];
                var body = result.split('<body>')[1].split('</body>')[0].trim('\r\n');
                parser.parseComplete(head);
                asyncCallback(null, { head: generator.utility.processHead(handler.dom, template.dir), body: generator.utility.processBody(body), html: body });
            });
        };
    });
    var self = this;
    async.series(params, function (err, results) {
        if (err) {
            callback(err);
            return;
        }
        self.widgetTplDict[widgetKey] = results;
        callback();
    });
};

generator.utility.processHead = function (dom, dir) {
    var refInfo = { links: [], scripts: [] };
    dom.forEach(function (node) {
        switch (node.name) {
            case 'link':
                if (!node.attribs.href) break;
                refInfo.links.push(this.processHeadRoot(node.attribs.href, dir));
                break;
            case 'script':
                if (!node.attribs.src) break;
                refInfo.scripts.push(this.processHeadRoot(node.attribs.src, dir));
                break;
            case 'resource':
                if (!node.attribs.path) break;
                refInfo.resource = this.processResource(node.attribs.path, dir);
                break;
        }
    }, this);
    return refInfo;
};

generator.utility.processHeadRoot = function (refPath, dir) {
    return refPath.substr(0, 6) === '@root/' ? path.resolve(_rootPath, refPath.substr(6)) : path.resolve(dir, refPath);
};

generator.utility.processResource = function (resPath, dir) {
    var content = fs.readFileSync(path.resolve(dir, resPath), 'utf-8');
    return _cb.webserver.utility.parseJson(content);
};

generator.utility.processBody = function (body) {
    return template.compile(body);
};

generator.utility.mergeWidgets = function (fromWidgets, toWidgets) {
    for (var attr in fromWidgets) {
        toWidgets[attr] = fromWidgets[attr];
    }
};

generator.utility.processDataXml = function (dataPath, corpId, size, lang, level, callback) {
    var viewData = { corpId: corpId, size: size, lang: lang, level: level };
    if (!dataPath) {
        callback(null, viewData);
        return;
    }
    fs.readFile(dataPath, 'utf-8', function (err, data) {
        if (err) {
            callback({ message: err.toLocaleString(), path: dataPath });
            return;
        }
        xml2js.parseString(data, function (err1, data1) {
            if (err1) {
                callback({ message: err1.toLocaleString(), source: data, path: dataPath });
                return;
            }
            processView(data1.view, viewData);
            callback(null, viewData);
        });
    });
};

generator.utility.processDataJson = function (dataPath, corpId, size, callback) {
    var viewData = { corpId: corpId, size: size };
    if (!dataPath) {
        callback(null, viewData);
    } else if (typeof dataPath === 'object') {
        this.processView(dataPath.view, viewData);
        callback(null, viewData);
    } else {
        var self = this;
        this.processDataJsonInner(dataPath, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            if (data)
                self.processView(data.view, viewData);
            callback(null, viewData);
        });
    }
};

generator.utility.processDataJsonInner = function (dataPath, callback) {
    var self = this;
    fs.readFile(dataPath, 'utf-8', function (err, data) {
        if (err) {
            callback({ message: err.toLocaleString(), path: dataPath });
            return;
        }
        var data1 = _cb.webserver.utility.parseJson(data);
        callback(null, data1);
    });
};

generator.utility.processDesignHtml = function (designPath, designBasePath, callback) {
    var self = this;
    fs.readFile(designPath, 'utf-8', function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        var handler = new htmlparser.DefaultHandler();
        var parser = new htmlparser.Parser(handler);
        try {
            var head = data.split('<head>')[1].split('</head>')[0];
            var body = data.split('<body>')[1].split('</body>')[0];
            parser.parseComplete(head);
            callback(null, { head: self.processHead(handler.dom, designBasePath), body: body, html: data });
        } catch (e) {
            callback(e);
        }
    });
};

generator.utility.processView = function (view, viewData) {
    var attributes = view.$;
    for (var attr in attributes) {
        viewData[attr] = attributes[attr];
    }
    viewData.widgets = {};
    if (!view.widget) return;
    view.widget.forEach(function (widget) {
        this.processWidget(widget, viewData);
    }, this);
};

generator.utility.processWidget = function (widget, viewData) {
    var widgetData = { corpId: viewData.corpId, size: viewData.size, lang: viewData.lang, configs: {} };
    var attributes = widget.$;
    for (var attr in attributes) {
        widgetData[attr] = attributes[attr];
    }
    viewData.widgets[widgetData.name] = widgetData;
    if (!widget.config) return;
    widget.config.forEach(function (config) {
        this.processConfig(config, widgetData);
    }, this);
    widgetData.config = this.stringifyConfig(widgetData.configs);
};

generator.utility.processConfig = function (config, widgetData) {
    var configData = config.$;
    if (!configData || !configData.key) return;
    if (configData.value) {
        widgetData.configs[configData.key] = configData.value;
    } else {
        var text = config._;
        if (text) {
            widgetData.configs[configData.key] = text;
            return;
        }
        if (!config.item) {
            widgetData.configs[configData.key] = null;
        } else {
            widgetData.configs[configData.key] = [];
            config.item.forEach(function (item) {
                this.processItem(item, widgetData.configs[configData.key]);
            }, this);
        }
    }
};

generator.utility.processItem = function (item, configData) {
    var itemData = item.$;
    configData.push(itemData);
};

generator.utility.stringifyConfig = function (config) {
    return template.utils.$escape(JSON.stringify(config));
};

generator.utility.processRefs = function (viewData) {
    var widgetTplDict = this.getWidgetTplDict(viewData.corpId, viewData.size);
    if (!widgetTplDict) return;
    var widgetKeys = {};
    for (var name in viewData.widgets) {
        var widgetData = viewData.widgets[name];
        var widgetKey = widgetData.type + '_' + widgetData.size;
        if (!widgetKeys[widgetKey])
            widgetKeys[widgetKey] = true;
    }
    for (var attr in widgetKeys) {
        var widgetTpl = widgetTplDict[attr];
        if (!widgetTpl || !widgetTpl.head) continue;
        this.processRefsInner(widgetTpl.head.links, widgetTpl.head.scripts, viewData);
    }
};

generator.utility.processRefsInner = function (links, scripts, viewData) {
    var linkObj = viewData.links;
    if (links && links.length) {
        links.forEach(function (link) {
            var newLink = this.processLink(link, viewData);
            if (!linkObj[newLink])
                linkObj[newLink] = true;
        }, this);
    }
    var scriptObj = viewData.scripts;
    if (scripts && scripts.length) {
        scripts.forEach(function (script) {
            var newScript = this.processScript(script, viewData);
            if (!scriptObj[newScript])
                scriptObj[newScript] = true;
        }, this);
    }
};

generator.utility.processLink = function (link, viewData) {
    var extname = path.extname(link);
    var newLink;
    if (extname === '.less') {
        newLink = this.resetLinkName(link, viewData.corp.theme);
    } else {
        newLink = link;
    }
    var filePath = this.processFilePath(viewData.level);
    var items = [];
    items.push('<link href="');
    //    if (viewData.preview) {
    //        items.push('http://');
    //        items.push(viewData.corp.webDomain);
    //        items.push('/');
    //    }
    items.push(path.relative(filePath, newLink).replace(/\\/g, '/'));
    items.push('" rel="Stylesheet" type="text/css" />');
    items.push('&');
    items.push(link);
    return items.join('');
};

generator.utility.resetLinkName = function (link, theme) {
    var extname = path.extname(link);
    var basename = link.substring(0, link.length - extname.length);
    return basename + '.' + theme + '.css';
};

generator.utility.processScript = function (script, viewData) {
    var filePath = this.processFilePath(viewData.level);
    var items = [];
    items.push('<script src="');
    //    if (viewData.preview) {
    //        items.push('http://');
    //        items.push(viewData.corp.webDomain);
    //        items.push('/');
    //    }
    items.push(path.relative(filePath, script).replace(/\\/g, '/'));
    items.push('" type="text/javascript"></script>');
    items.push('&');
    items.push(script);
    return items.join('');
};

generator.utility.processFilePath = function (level) {
    var filePath = _rootPath;
    if (level) {
        for (var i = 0; i < level; i++) {
            filePath = path.resolve(filePath, i.toLocaleString());
        }
    }
    return filePath;
};

generator.utility.walk = function (dir, done) {
    var results = [];
    var self = this;
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    self.walk(file, function (err, res) {
                        results = results.concat(res);
                        if (! --pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (! --pending) done(null, results);
                }
            });
        });
    });
};

generator.utility.copyFile = function (fromFile, toFile, callback) {
    async.waterfall([
        function (asyncCallback) {
            fs.exists(toFile, function (exists) {
                asyncCallback(null, exists);
            });
        },
        function (exists, asyncCallback) {
            if (exists) {
                asyncCallback(null, true);
            } else {
                mkdirp(path.dirname(toFile), asyncCallback);
            }
        },
        function (p, asyncCallback) {
            var reads = fs.createReadStream(fromFile);
            var writes = fs.createWriteStream(toFile);
            reads.pipe(writes);
            reads.on('end', function () {
                writes.end();
                asyncCallback(null);
            });
            reads.on('error', function (err) {
                asyncCallback(true, err);
            });
        }
    ], callback);
};

generator.utility.countTaskInner = function (from, to, wrapper, exceptPaths) {
    var self = this;
    async.waterfall([
        function (asyncCallback) {
            fs.stat(from, asyncCallback);
        },
        function (stats, asyncCallback) {
            if (stats.isFile()) {
                if (exceptPaths.indexOf(from) === -1)
                    wrapper.addFile(from, to);
                asyncCallback(null, []);
            } else if (stats.isDirectory()) {
                if (exceptPaths.indexOf(from) === -1) {
                    fs.readdir(from, asyncCallback);
                } else {
                    asyncCallback(null, []);
                }
            }
        },
        function (files, asyncCallback) {
            if (files.length) {
                files.forEach(function (file) {
                    self.countTaskInner(path.join(from, file), path.join(to, file), wrapper.increase(), exceptPaths);
                });
            }
            asyncCallback(null);
        }
    ], wrapper);
};

generator.utility.countTask = function (from, to, callback, exceptPaths) {
    var files = [];
    var count = 1;

    function wrapper(err) {
        count--;
        if (err || count <= 0) {
            callback(err, files);
        }
    };

    wrapper.increase = function () {
        count++;
        return wrapper;
    };

    wrapper.addFile = function (fromFile, toFile) {
        files.push({ fromFile: fromFile, toFile: toFile });
    };

    this.countTaskInner(from, to, wrapper, exceptPaths);
};

generator.utility.copyDir = function (from, to, callback, exceptPaths) {
    var self = this;
    async.waterfall([
        function (asyncCallback) {
            fs.exists(from, function (exists) {
                if (exists) {
                    asyncCallback(null, true);
                } else {
                    asyncCallback(true);
                }
            });
        },
        function (exists, asyncCallback) {
            fs.stat(from, asyncCallback);
        },
        function (stats, asyncCallback) {
            if (stats.isFile() && exceptPaths.indexOf(from) === -1) {
                self.copyFile(from, to, function (err) {
                    if (err) {
                        asyncCallback(true);
                    } else {
                        asyncCallback(null, []);
                    }
                });
            } else if (stats.isDirectory() && exceptPaths.indexOf(from) === -1) {
                self.countTask(from, to, asyncCallback, exceptPaths);
            }
        },
        function (files, asyncCallback) {
            async.mapLimit(files, 10, function (f, cb) {
                self.copyFile(f.fromFile, f.toFile, cb);
            }, asyncCallback);
        }
    ], callback);
};

module.exports = generator;