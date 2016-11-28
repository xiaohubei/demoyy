
var generator = require('./common');

generator.register('OtherPage', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.BasePage.call(this, req, params, callback);
    };
    page.prototype = new generator.BasePage();
    page.prototype.pageRoute = pageRoute;

    page.prototype.constructHtmlTpl = function (headerHtmlTpl, footerHtmlTpl) {
        var htmlTpl = this._get_data('designData');
        if (headerHtmlTpl)
            htmlTpl = htmlTpl.replace('<header></header>', headerHtmlTpl);
        if (footerHtmlTpl)
            htmlTpl = htmlTpl.replace('<footer></footer>', footerHtmlTpl);
        return htmlTpl;
    };

    return page;
});