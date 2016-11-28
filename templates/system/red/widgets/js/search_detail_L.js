cb.widgets.register('Search_detail', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;
    widget.prototype.getProxy = function () {
        return { url: 'client/Products/getProductFiltersByClassOrKeyword', method: 'GET' };
    }
    widget.prototype.runTemplate = function (error, result) {
        // if (error) return;
        var queryString = new cb.util.queryString();
        var html = this.render({ list: result, queryString: queryString.toStr() });

        this.getElement().children('.search-detail').html(html);
        this.getElement().children(".search-detail").find("a").on("click", function (e) {
            var type = $(this).attr("data-type");
            var value = $(this).attr("data-value");
            queryString.set(type, value);
            location.href = "list" + queryString.toStr();
        });
    };
    return widget;
});