cb.widgets.register('Navigation', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;
    widget.prototype.getProxy = function () {
        return { url: 'client/SiteMenus/getList', method: 'GET' };
    }
    widget.prototype.runTemplate = function (error, result) {
        if (error) return;
        var html = this.render(result);
        this.getElement().find('ul').html(html);
    };
    return widget;
});