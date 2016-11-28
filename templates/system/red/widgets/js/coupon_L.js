cb.widgets.register('Category', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;
    widget.prototype.getProxy = function () {
        return { url: 'client/ProductClasses/getClasses', method: 'GET' };
    }
    widget.prototype.runTemplate = function (error, result) {
        if (error) return;
        var html = this.render({ list: result });
        var that = this;
        that.getElement().children('ul.classify').html(html);
        var items = that.getElement().children('ul').children('li')
        items.on("mouseover", function (e) {
            if ($(this).index() > 0) {
                $(items[$(this).index() - 1]).css("border-bottom", "none");
            }
            $(this).css("border-bottom", "1px solid #ff7400");
            $(this).children("div").show();
            $(this).children("a").css({ "z-index": "3", "background": "#fff" });
        });
        this.getElement().children('ul').children('li').on("mouseout", function (e) {
            $(this).children("div").hide();
            if ($(this).index() > 0) {
                $(items[$(this).index() - 1]).css("border-bottom", "1px solid #cdcdcd");
            }
            $(this).css("border-bottom", "1px solid #cdcdcd");
            $(this).children("a").css({ "z-index": "3", "background": "none" });
        });
    };
    return widget;
});