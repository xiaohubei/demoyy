var generator = require('./common');

generator.register('HomePageMobileDesign', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.HomePageMobile.call(this, req, params, callback);
    };
    page.prototype = new generator.HomePageMobile();
    page.prototype.pageRoute = pageRoute;

    page.prototype.constructHtmlTpl = function (headerHtmlTpl, footerHtmlTpl, viewData) {
        var params = this.getParams();
        var designData = this._get_data('designData');
        var items = [];
        items.push('<html>');
        items.push('<head>');
        items.push('<%=includeLinks(view, ["../css/index_M.css","../css/base.css","../css/icon.css","../css/index.css","../css/search.css"]);%>');
        items.push('</head>');
        items.push('<body>');
        items.push('<div>');
        items.push('<div class="views">');
        items.push('<div class="view view-main">');
        items.push('<div class="pages">');
        items.push('<div data-page="home" class="page" data-controller="<%=view.controller%>">');
        if (headerHtmlTpl)
            items.push(headerHtmlTpl);
        items.push('<div class="page-content">');
        items.push(this.processPage(designData));
        items.push('</div>');
        if (footerHtmlTpl)
            items.push(footerHtmlTpl);
        items.push('</div>');
        items.push('</div>');
        items.push('</div>');
        items.push('</div>');
        items.push('</div>');
        items.push('<%=includeScripts(view, ["../js/' + params.route + '_' + params.size + '.js"]);%>');
        items.push('</body>');
        items.push('</html>');
        return items.join('\r\n');
    };

    page.prototype.constructCommonRefs = function (viewData) {
        this.constructAllWidgetRefs(viewData);
        for (var attr in viewData.widgets) {
            var widgetData = viewData.widgets[attr];
            widgetData.configs['designer'] = true;
            widgetData.config = generator.utility.stringifyConfig(widgetData.configs);
        }
    };

    return page;
});