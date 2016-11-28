var generator = require('./common');

generator.register('HomePageMobile', function (pageRoute) {
    var page = function (req, params, callback) {
        generator.HomePage.call(this, req, params, callback);
    };
    page.prototype = new generator.HomePage();
    page.prototype.pageRoute = pageRoute;

    page.prototype.constructHtmlTpl = function (headerHtmlTpl, footerHtmlTpl) {
        var params = this.getParams();
        var designData = this._get_data('designData');
        var items = [];
        items.push('<!DOCTYPE html>');
        items.push('<html>');
        items.push('<head>');
        items.push('<meta charset="utf-8">');
        items.push('<title><%=view.title%></title>');
        items.push('</head>');
        items.push('<body>');
        items.push('<div>');
        items.push('<div class="pages">');
        items.push('<div data-page="home" class="page navbar-fixed toolbar-fixed" data-controller="<%=view.controller%>">');
        if (headerHtmlTpl)
            items.push(headerHtmlTpl);
        items.push('<div class="page-content p-t-0">');
        items.push(this.processPage(designData));
        items.push('</div>');
        if (footerHtmlTpl)
            items.push(footerHtmlTpl);
        items.push('</div>');
        items.push('</div>');
        items.push('</div>');
        items.push('<%=includeScripts(view, ["../js/' + params.route + '_' + params.size + '.js"]);%>');
        items.push('</body>');
        items.push('</html>');
        return items.join('\r\n');
    };

    page.prototype.processCol = function (col) {
        var attributes = col.$;
        var colspan = attributes['colspan'];
        var widgetname = attributes['widgetname'];
        if (!colspan) return;
        var pixels = Math.round(100 * parseInt(colspan) / 12);
        var items = [];
        items.push('<div class="col-' + pixels + '">');
        if (widgetname)
            items.push('<%=includeWidget(view.widgets["' + widgetname + '"]);%>');
        items.push('</div>');
        return items.join('\r\n');
    };

    page.prototype.constructCommonRefs = function (viewData) {
        var params = this.getParams();
        if (params.mode === 'package') {
            this.constructAllWidgetRefs(viewData);
        } else {
            viewData.links = {};
            viewData.scripts = {};
        }
    };

    page.prototype.constructAllWidgetRefs = function (viewData) {
        var widgetTplDict = generator.utility.getWidgetTplDict(viewData.corpId, viewData.size);
        if (!widgetTplDict) return;
        viewData.links = {};
        viewData.scripts = {};
        for (var attr in widgetTplDict) {
            var widgetTpl = widgetTplDict[attr];
            if (!widgetTpl || !widgetTpl.head) continue;
            generator.utility.processRefsInner(widgetTpl.head.links, widgetTpl.head.scripts, viewData);
        }
    };

    return page;
});