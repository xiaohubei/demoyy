cb.widgets.register('search', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;

    widget.prototype.getProxy = function () {
        if (isAndroid)
            this.getElement().find('input.search').removeClass('ios-search');

        if (isIos)
            this.getElement().find('input.search').addClass('ios-search');
    };

    widget.prototype.runTemplate = function (err, result) {
    	
    }
    return widget;
});