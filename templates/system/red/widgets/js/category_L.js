cb.widgets.register('Category', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
        this.init();
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;

    widget.prototype.init = function () {
        //debugger;
        /*var $elem = this.getElement();
        var $ul = $elem.children('ul');*/
        /*var config = this.getConfig();
        if (config && config.show === 'true') {
            $ul.show();
            return;
        }
        $elem.children('div').hover(function () {
            $ul.show();
        }, function () {
            $ul.hide();
        });
        $ul.hover(function () {
            $(this).show();
        }, function () {
            $(this).hide();
        });*/
    };

    widget.prototype.getProxy = function () {
        return { url: 'client/ProductClasses/getClasses', method: 'GET' };
    };

    widget.prototype.runTemplate = function (error, result) {
        if (error || !result || !result.length) return;
        var obj = {};
        result.forEach(function (item) {
            item.hasChildren = item.lsChildClass.length ? true : false;
            obj[item.id] = item;
        });
        var $ul = this.getElement().children('ul');
        var html = this.render({ list: result });
        $ul.html(html);
        //this.execute('afterInit', $ul.height());
        $ul.children('li').hover(function () {
            var $this = $(this);
            if (!obj[$this.attr('data-id')].hasChildren) return;
            $this.children('div').show();
            /*$this.children("a").css({
                "background-color": "#fff",
                "border-right": "1px solid #ffffff"
            });*/
        }, function () {
            var $this = $(this);
            if (!obj[$this.attr('data-id')].hasChildren) return;
            $this.children('div').hide();
            /*$this.children("a").css({
                "background-color": "transparent",
                "border-right": "1px solid #ffffff"
            });*/
        });
    };

    return widget;
});