var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var conf = require('../../common/conf');

var _cb = require('../../common/cube');

var generator = require('./common');

generator.register('HomePage', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.BasePage.call(this, req, params, callback);
    };
    page.prototype = new generator.BasePage();
    page.prototype.pageRoute = pageRoute;

    page.prototype.processDesignFile = function (designBasePath, callback) {
        var self = this;
        var params = self.getParams();
        var designFilePath = path.resolve(designBasePath, params.route + '_' + params.size + '.xml');
        fs.readFile(designFilePath, 'utf-8', function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            xml2js.parseString(data, function (err1, data1) {
                if (err1) {
                    callback(err1);
                    return;
                }
                if (data1.page.body == null) {
                    callback();
                    return;
                }
                self._set_data('designData', data1.page.body[0]);
                var hasHeader = data1.page.header != null;
                var hasFooter = data1.page.footer != null;
                callback(null, { hasHeader: hasHeader, hasFooter: hasFooter });
            });
        });
    };

    page.prototype.processDesignFile = function (designBasePath, callback) {
        var self = this;
        var params = self.getParams();
        var designFilePath = this.getDesignFilePath(designBasePath);
        if (params.refreshConfig) {
            var appendParams = { corpid: params.corp.id, route: params.route, size: params.size };
            if (params.subroute) appendParams.subroute = params.subroute;
            if (params.version) appendParams.version = params.version;
            var getConfigUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + '/client/Template/getdata', appendParams);
            _cb.webserver.proxy.doRequestInner(getConfigUrl, 'GET', null, function (err, data) {
                if (data.code && data.code !== 200) {
                    self.logError(JSON.stringify(data), 'processDesignFile');
                } else {
                    params.para = data;
                }
                self.processDesignFileInner(designFilePath, callback);
            });
        } else {
            self.processDesignFileInner(designFilePath, callback);
        }
    };

    page.prototype.getDesignFilePath = function (designBasePath) {
        var subFolderName = this.getSubFolderName ? this.getSubFolderName() : '';
        var params = this.getParams();
        var tplDir = subFolderName ? path.resolve(designBasePath, subFolderName) : designBasePath;
        this._set_data('tplDir', tplDir);
        var fileName = (subFolderName ? params.subroute : params.route) + '_' + params.size + '.json';
        return path.resolve(tplDir, fileName);
    };

    page.prototype.processDesignFileInner = function (designFilePath, callback) {
        var self = this;
        var params = self.getParams();
        if (params.para && params.para.designData) {
            var designData = params.para.designData;
            if (params.overrideConfig === false) {
                self.processDesignFileCallback(designData, callback);
            } else {
                mkdirp(path.dirname(designFilePath), function (err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    var stream = fs.createWriteStream(designFilePath);
                    stream.end(JSON.stringify(designData, null, '\t'), function (err1, result1) {
                        if (err1) {
                            callback(err1);
                            return;
                        }
                        self.processDesignFileCallback(designData, callback);
                    });
                });
            }
        } else {
            fs.readFile(designFilePath, 'utf-8', function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                self.processDesignFileCallback(JSON.parse(data), callback);
            });
        }
    };

    page.prototype.processDesignFileCallback = function (data, callback) {
        if (data.page.body == null) {
            callback();
            return;
        }
        this._set_data('designData', data.page.body[0]);
        var hasHeader = data.page.header != null;
        var hasFooter = data.page.footer != null;
        callback(null, { hasHeader: hasHeader, hasFooter: hasFooter });
    };

    page.prototype.constructHtmlTpl = function (headerHtmlTpl, footerHtmlTpl, viewData) {
        var tplDir = this._get_data('tplDir');
        viewData.tplDir = tplDir;
        var params = this.getParams();
        var designData = this._get_data('designData');
        var items = [];
        items.push('<!DOCTYPE html>');
        items.push('<html>');
        items.push('<head>');
        items.push('<meta charset="utf-8">');
        //items.push('<title><%=view.title%></title>');
        items.push(this.getMetaInfo());
        //items.push('<%=includeLinks(view, ["../css/' + params.route + '_' + params.size + '.css"]);%>');
        items.push('<%=includeLinks(view);%>');
        items.push('</head>');
        items.push('<body>');
        items.push('<div class="container" data-controller="<%=view.controller%>">');
        if (headerHtmlTpl)
            items.push(headerHtmlTpl);
        items.push(this.processPage(designData));
        if (footerHtmlTpl)
            items.push(footerHtmlTpl);
        items.push('</div>');
        items.push('<%=includeScripts(view, ["' + this.getIncludeScript() + '"]);%>');
        items.push('<script type="text/javascript">');
        items.push('cb.init();');
        items.push('</script>');
        items.push('</body>');
        items.push('</html>');
        return items.join('\r\n');
    };

    page.prototype.getMetaInfo = function () {
        return '<seo></seo>';
    };

    page.prototype.getIncludeScript = function () {
        var params = this.getParams();
        return '../js/' + params.route + '_' + params.size + '.js';
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
        items.push('<div class="row">');
        row.col.forEach(function (item) {
            items.push(this.processCol(item));
        }, this);
        items.push('</div>');
        return items.join('\r\n');
    };

    page.prototype.processCol = function (col) {
        var attributes = col.$;
        var colspan = attributes['colspan'];
        var widgetname = attributes['widgetname'];
        if (!colspan) return;
        var items = [];
        items.push('<div class="col-xs-' + colspan + '">');
        if (col.row)
            items.push(this.processPage(col));
        else if (widgetname)
            items.push('<%=includeWidget(view.widgets["' + widgetname + '"]);%>');
        items.push('</div>');
        return items.join('\r\n');
    };

    return page;
});