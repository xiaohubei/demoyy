var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');

var conf = require('../../common/conf');
var _rootPath = conf.rootPath;

var _cb = require('../../common/cube');

var generator = require('./common');

generator.register('CommonPage', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.BasePage.call(this, req, params, callback);
    };
    page.prototype = new generator.BasePage();
    page.prototype.pageRoute = pageRoute;

    page.prototype.process = function () {
        var self = this;
        self.logInfo('生成页面：开始...', 'generateHtml');
        var params = self.getParams();
        var callback = self.getCallback();
        var basePath = path.resolve(_rootPath, 'templates', params.corpId, params.templateId, 'pages');
        var designBasePath = path.resolve(basePath, 'views_design');
        var configBasePath = path.resolve(basePath, 'config');
        var asyncParams = [];
        asyncParams.push(function (asyncCallback) {
            self.processDesignFile(designBasePath, asyncCallback);
        });
        asyncParams.push(function (asyncCallback) {
            self.processConfigFile(configBasePath, asyncCallback);
        });
        async.series(asyncParams, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            var viewData = results[1];
            viewData.tplDir = designBasePath;
            self.processInner(viewData);
        });
    };

    page.prototype.processDesignFile = function (designBasePath, callback) {
        var self = this;
        var params = self.getParams();
        var designFilePath = path.resolve(designBasePath, params.route + '_' + params.size + '.json');
        var designData;
        if (params.para && params.para.designData) {
            designData = params.para.designData;
            var stream = fs.createWriteStream(designFilePath);
            stream.end(JSON.stringify(designData, null, '\t'), function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                self.processDesignFileInner(designData, callback, designFilePath);
            });
        } else {
            fs.readFile(designFilePath, 'utf-8', function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                designData = _cb.webserver.utility.parseJson(data);
                self.processDesignFileInner(designData, callback, designFilePath);
            });
        }
    };

    page.prototype.processDesignFileInner = function (designData, callback, designFilePath) {
        if (!designData) {
            callback();
            return;
        }
        var body = designData.page.body[0];
        body.row = body.row || [];
        var self = this;
        var params = self.getParams();
        if (params.route === 'header') {
            var cartBoxWidgets = [];
            var hasNamedCartBoxWidget = false;
            body.row.forEach(function (row) {
                if (!row.col) return;
                row.col.forEach(function (col) {
                    if (col.$.datatype === 'cart_box') {
                        cartBoxWidgets.push(col);
                        if (col.$.widgetname === 'cart_box')
                            hasNamedCartBoxWidget = true;
                    }
                });
            });
            if (!hasNamedCartBoxWidget) {
                if (cartBoxWidgets.length) {
                    cartBoxWidgets[0].$.widgetname = 'cart_box';
                } else {
                    body.row.push({
                        col: [{
                            $: {
                                "widgetname": "cart_box",
                                "datatype": "cart_box",
                                "colspan": "12"
                            }
                        }],
                        parent: 'hide'
                    });
                }
            }
        }
        body.row.forEach(function (row) {
            if (!row.col) return;
            row.col.forEach(function (col) {
                switch (col.$.datatype) {
                    case 'topbar_member':
                    case 'topbar-subnav':
                        row.parent = 'up-header';
                        break;
                    case 'search':
                        row.parent = 'up-searchBox';
                        break;
                    case 'navigation':
                        row.parent = 'up-nav-box';
                        break;
                    case 'help_center':
                        row.parent = 'border-top-f2';
                        break;
                    case 'friend_links':
                    case 'site_info':
                        row.parent = 'bg-2d';
                        break;
                }
            });
        });
        self.processDesignFileCallback(body, designFilePath, callback);
    };

    page.prototype.processDesignFileCallback = function (body, designFilePath, callback) {
        var params = this.getParams();
        var items = [];
        items.push('<!DOCTYPE html>');
        items.push('<html>');
        items.push('<head>');
        items.push('</head>');
        items.push('<body>');
        var content = this.processPage(body);
        this._set_data('content', content);
        items.push(content);
        items.push('</body>');
        items.push('</html>');
        designFilePath = designFilePath.substring(0, designFilePath.length - path.extname(designFilePath).length) + '.html';
        var stream = fs.createWriteStream(designFilePath);
        stream.end(items.join('\r\n'), function (err) {
            if (err) {
                callback(err);
                return;
            }
            callback();
        });
    };

    page.prototype.processPage = function (body) {
        if (!body.row) return;
        var items = [];
        body.row.forEach(function (item) {
            items.push(this.processRow(item));
        }, this);
        return items.join('\r\n');
    };

    page.prototype.processRow = function (row) {
        if (!row.col) return;
        var items = [];
        if (row.parent)
            items.push('<div class="container ' + row.parent + '">');
        items.push('<div class="row">');
        row.col.forEach(function (item) {
            items.push(this.processCol(item));
        }, this);
        items.push('</div>');
        if (row.parent)
            items.push('</div>');
        return items.join('\r\n');
    };

    page.prototype.processCol = function (col) {
        var attributes = col.$;
        var position = attributes['position'];
        var colspan = attributes['colspan'];
        var widgetname = attributes['widgetname'];
        if (!position && !colspan) return;
        var items = [];
        if (position)
            items.push('<div class="pull-' + position + '">');
        else if (colspan)
            items.push('<div class="col-xs-' + colspan + '">');
        if (col.row)
            items.push(this.processPage(col));
        else if (widgetname)
            items.push('<%=includeWidget(view.widgets["' + widgetname + '"]);%>');
        items.push('</div>');
        return items.join('\r\n');
    };

    page.prototype.processConfigFile = function (configBasePath, callback) {
        var self = this;
        var params = self.getParams();
        var configFilePath = path.resolve(configBasePath, params.route + '_' + params.size + '.json');
        if (params.para && params.para.configData) {
            self.processConfigFileInner(params.para.configData, callback, configFilePath, true);
        } else {
            fs.readFile(configFilePath, 'utf-8', function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                var configData = _cb.webserver.utility.parseJson(data);
                self.processConfigFileInner(configData, callback, configFilePath);
            });
        }
    };

    page.prototype.processConfigFileInner = function (configData, callback, configFilePath, needSave) {
        var params = this.getParams();
        var viewData = { corpId: params.corpId, size: params.size, lang: params.lang };
        if (!configData) {
            callback(null, viewData);
            return;
        }
        configData.view.widget = configData.view.widget || [];
        if (params.route === 'header') {
            var cartBoxWidgets = [];
            var hasNamedCartBoxWidget = false;
            configData.view.widget.forEach(function (widget) {
                if (widget.$.type === 'cart_box') {
                    cartBoxWidgets.push(widget);
                    if (widget.$.name === 'cart_box')
                        hasNamedCartBoxWidget = true;
                }
            });
            if (!hasNamedCartBoxWidget) {
                needSave = true;
                if (cartBoxWidgets.length) {
                    cartBoxWidgets[0].$.name = 'cart_box';
                } else {
                    configData.view.widget.push({
                        $: {
                            "name": "cart_box",
                            "type": "cart_box"
                        }
                    });
                }
            }
        }
        generator.utility.processView(configData.view, viewData);
        if (!needSave) {
            callback(null, viewData);
            return;
        }
        var stream = fs.createWriteStream(configFilePath);
        stream.end(JSON.stringify(configData, null, '\t'), function (err) {
            if (err) {
                callback(err);
                return;
            }
            callback(null, viewData);
        });
    };

    page.prototype.processInner = function (viewData) {
        var self = this;
        var params = self.getParams();
        var callback = self.getCallback();
        viewData.route = params.route;
        viewData.corp = params.corp;
        viewData.mode = params.mode;
        viewData.keepOrigin = params.keepOrigin;
        viewData.overrideConfig = params.overrideConfig;
        var outputParams = self._get_data('outputParams');
        viewData.outputParams = outputParams;
        var htmlTpl = self.constructHtmlTpl();
        self.constructCommonRefs(viewData);
        generator.utility.processRefs(viewData);
        var outputHtml = self.runTemplate(htmlTpl, viewData);
        if (outputHtml === '{Template Error}') {
            callback(outputHtml);
            return;
        }
        var asyncParams = [];
        asyncParams.push(function (asyncCallback) {
            mkdirp(outputParams.dir, asyncCallback);
        });
        asyncParams.push(function (asyncCallback) {
            fs.writeFile(outputParams.file, outputHtml, asyncCallback);
        });
        asyncParams.push(function (asyncCallback) {
            self.postProcess(viewData, asyncCallback);
        });
        async.series(asyncParams, function (err, results) {
            if (err) {
                callback(err);
                return;
            }
            self.logInfo('生成页面：完成...', 'generateHtml');
            callback(null, outputHtml);
            self.isBusy = false;
        });
    };

    page.prototype.constructHtmlTpl = function () {
        var items = [];
        items.push('<!DOCTYPE html>');
        items.push('<html>');
        items.push('<head>');
        items.push('<meta charset="utf-8">');
        items.push('<title><%=view.title%></title>');
        items.push('<%=includeLinks(view);%>');
        items.push('</head>');
        items.push('<body>');
        items.push('<div class="container" data-controller="<%=view.controller%>">');
        items.push(this._get_data('content'));
        items.push('</div>');
        var params = this.getParams();
        items.push('<%=includeScripts(view, ["../js/common_' + params.size + '.js"]);%>');
        items.push('<script type="text/javascript">');
        items.push('cb.init();');
        items.push('</script>');
        items.push('</body>');
        items.push('</html>');
        return items.join('\r\n');
    };

    return page;
});