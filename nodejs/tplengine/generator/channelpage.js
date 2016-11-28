var fs = require('fs');
var path = require('path');

var conf = require('../../common/conf');

var _cb = require('../../common/cube');

var generator = require('./common');

generator.register('ChannelPage', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.HomePage.call(this, req, params, callback);
    };
    page.prototype = new generator.HomePage();
    page.prototype.pageRoute = pageRoute;

    page.prototype.getBodyDataPath = function (configBasePath) {
        var params = this.getParams();
        return path.resolve(configBasePath, this.getSubFolderName(), params.subroute + '_' + params.size + '.json');
    };

    page.prototype.getMetaInfo = function () {
        return '<title><%=view.corp.siteName%></title>';
    };

    page.prototype.getIncludeScript = function () {
        var params = this.getParams();
        return '../../js/' + params.route + '_' + params.size + '.js';
    };

    page.prototype.getSubFolderName = function () {
        return 'channel';
    };

    return page;
});