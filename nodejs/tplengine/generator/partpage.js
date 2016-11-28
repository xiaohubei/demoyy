var fs = require('fs');
var path = require('path');
var async = require('async');

var conf = require('../../common/conf');

var _cb = require('../../common/cube');

var generator = require('./common');

generator.register('PartPage', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.HomePage.call(this, req, params, callback);
    };
    page.prototype = new generator.HomePage();
    page.prototype.pageRoute = pageRoute;

    page.prototype.processDesignFile = function (designBasePath, callback) {
        var self = this;
        var params = self.getParams();
        var designFilePath = path.resolve(designBasePath, params.route + '_' + params.size);
        var asyncParams = [];
        asyncParams.push(function (asyncCallback) {
            generator.utility.processDesignHtml(designFilePath + '.html', designBasePath, function (err, result) {
                if (err) {
                    asyncCallback(err);
                    return;
                }
                self._set_data('designData', result.html);
                var hasHeader = result.body.indexOf('<header></header>') !== -1;
                var hasFooter = result.body.indexOf('<footer></footer>') !== -1;
                asyncCallback(null, { hasHeader: hasHeader, hasFooter: hasFooter });
            });
        });
        asyncParams.push(function (asyncCallback) {
            var layoutFilePath = designFilePath + '.json';
            if (params.refreshConfig) {
                var appendParams = { corpid: params.corp.id, route: params.route, size: params.size };
                if (params.version) appendParams.version = params.version;
                var getConfigUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + '/client/Template/getdata', appendParams);
                _cb.webserver.proxy.doRequestInner(getConfigUrl, 'GET', null, function (err, data) {
                    if (data.code && data.code !== 200) {
                        self.logError(JSON.stringify(data), 'processDesignFile');
                    } else {
                        params.para = data;
                    }
                    self.processDesignFileInner(layoutFilePath, asyncCallback);
                });
            } else {
                self.processDesignFileInner(layoutFilePath, asyncCallback);
            }
        });
        if (_cb.webserver.utility.isArray(params.fixed)) {
            params.fixed.forEach(function (item) {
                asyncParams.push(function (asyncCallback) {
                    generator.utility.processDesignHtml(designFilePath + '.' + item + '.html', designBasePath, function (err, result) {
                        if (err) {
                            asyncCallback(err);
                            return;
                        }
                        self._set_data(item + 'Data', result.body);
                        asyncCallback();
                    });
                });
            });
        }
        async.series(asyncParams, function (error, results) {
            if (error) {
                callback(error);
                return;
            }
            callback(null, results[0]);
        });
    };

    page.prototype.processDesignFileCallback = function (data, callback) {
        if (data.page.body == null) {
            callback();
            return;
        }
        this._set_data('layoutData', data.page.body[0]);
        callback();
    };

    page.prototype.processConfigFile = function (configBasePath, callback) {
        var params = this.getParams();
        var bodyDataPath = path.resolve(configBasePath, params.route + '_' + params.size);
        var asyncParams = [];
        asyncParams.push(function (asyncCallback) {
            var configFilePath = bodyDataPath + '.json';
            if (params.para && params.para.configData) {
                var configData = params.para.configData;
                generator.utility.processDataJson(configData, params.corpId, params.size, function (err, result) {
                    if (err) {
                        asyncCallback(err);
                        return;
                    }
                    if (params.overrideConfig === false) {
                        asyncCallback(null, result);
                    } else {
                        var stream = fs.createWriteStream(configFilePath);
                        stream.end(JSON.stringify(configData, null, '\t'), function (err1, result1) {
                            if (err1) {
                                asyncCallback(err1);
                                return;
                            }
                            asyncCallback(null, result);
                        });
                    }
                });
            } else {
                fs.exists(configFilePath, function (exists) {
                    generator.utility.processDataJson(exists ? configFilePath : null, params.corpId, params.size, asyncCallback);
                });
            }
        });
        if (_cb.webserver.utility.isArray(params.fixed)) {
            params.fixed.forEach(function (item) {
                asyncParams.push(function (asyncCallback) {
                    generator.utility.processDataJson(bodyDataPath + '.' + item + '.json', params.corpId, params.size, asyncCallback);
                });
            });
        }
        async.series(asyncParams, function (error, results) {
            if (error) {
                callback(error);
                return;
            }
            var configData = _cb.webserver.utility.extend(true, {}, results[0]);
            configData.widgets = {};
            results.forEach(function (item) {
                generator.utility.mergeWidgets(item.widgets, configData.widgets);
            });
            callback(null, configData);
        });
    };

    page.prototype.constructHtmlTpl = function (headerHtmlTpl, footerHtmlTpl, viewData) {
        var htmlTpl = this._get_data('designData');
        if (headerHtmlTpl)
            htmlTpl = htmlTpl.replace('<header></header>', headerHtmlTpl);
        htmlTpl = htmlTpl.replace('<content></content>', this.processPage(this._get_data('layoutData')));
        if (footerHtmlTpl)
            htmlTpl = htmlTpl.replace('<footer></footer>', footerHtmlTpl);
        return htmlTpl;
    };

    page.prototype.processCol = function (col) {
        var attributes = col.$;
        var colspan = attributes['colspan'];
        var widgetname = attributes['widgetname'];
        var fixed = attributes['fixed'];
        if (!colspan) return;
        var items = [];
        items.push('<div class="col-xs-' + colspan + '">');
        if (col.row)
            items.push(this.processPage(col));
        else if (fixed) {
            items.push(this._get_data((widgetname || 'content') + 'Data'));
        }
        else if (widgetname)
            items.push('<%=includeWidget(view.widgets["' + widgetname + '"]);%>');
        items.push('</div>');
        return items.join('\r\n');
    };

    return page;
});