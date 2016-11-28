var path = require('path');

var _needCompress = require('../../common/conf').needCompress;

var generator = require('./common');

generator.register('HelpPage', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.BasePage.call(this, req, params, callback);
    };
    page.prototype = new generator.BasePage();
    page.prototype.pageRoute = pageRoute;

    page.prototype.constructHtmlTpl = function (headerHtmlTpl, footerHtmlTpl, viewData) {
        var tplDir = this._get_data('tplDir');
        viewData.tplDir = tplDir;
        var htmlTpl = this._get_data('designData');
        if (headerHtmlTpl)
            htmlTpl = htmlTpl.replace('<header></header>', headerHtmlTpl);
        if (footerHtmlTpl)
            htmlTpl = htmlTpl.replace('<footer></footer>', footerHtmlTpl);
        generator.utility.processWidget({ $: { name: 'helpcenter_nav', type: 'helpcenter_nav'} }, viewData);
        htmlTpl = htmlTpl.replace('<helpcenter_nav></helpcenter_nav>', '<%=includeWidget(view.widgets["helpcenter_nav"]);%>');
        return htmlTpl;
    };

    page.prototype.getSubFolderName = function () {
        return 'helpcenter';
    };

    return page;
});