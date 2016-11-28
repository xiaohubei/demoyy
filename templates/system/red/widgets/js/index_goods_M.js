cb.widgets.register('IndexGoods', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;

    widget.prototype.getProxy = function () {
        return { url: 'client/Orders/getProductMainTopList', method: 'POST', options: { token: true} };
    };

    widget.prototype.getProxyData = function () {
        var config = this.getConfig();
        var cols = parseInt(config.cols) || 3;
        config.pixels = Math.round(100 / cols);
        var rows = parseInt(config.rows) || 2;
        config.limit = cols * rows;
        var params = {};
        params.pagesize = config.limit;
        params.pageindex = 1;
        params.where = config.filter || [];
        var productAttribute = { 'fieldname': 'productAttribute', 'valuefrom': '1' };
        if (config.goodclass && config.goodclass !== 'general')
            productAttribute.valuefrom = '2';
        params.where.push(productAttribute);
        params.order = config.order;
        return { queryCondition: params };
    };

    widget.prototype.runTemplate = function (error, result) {
        if (error) return;
        var config = this.getConfig();  
        result.pixels = config.pixels;
        result.preview = cb.rest.AppContext.preview;
        for (var i = 0; i < result.data.length; i++) {
            result.data[i].displayMode = config.displayMode ? config.displayMode : 'smallphoto';
            result.data[i].showname = config.showname ? config.showname : "initial";
            result.data[i].showsale = config.showsale ? config.showsale : "hidden";
            result.data[i].showprice = config.showprice ? config.showprice : "initial";
            if (config.goodclass != undefined && config.goodclass != "") {
                if (config.goodclass == "general") {
                    result.data[i].productAttribute = false;
                    result.data[i].fSalePrice = parseFloat(result.data[i].fSalePrice).toFixed(2);
                } else {
                    result.data[i].productAttribute = true;                  
                }
            } else {
                result.data[i].productAttribute = false;
            }
            
        };
        var html = this.render(result);
        this.getElement().find('ul').html(html);
        switch (config.displayMode) {
            case "bigphotolist":
                this.getElement().find('ul li').addClass('col-100 bigphotolist');
                break;
            case "smallphotolist":
                this.getElement().find('ul li').addClass('col-100 smallphotolist');
                break;
            case "smallphoto":
                this.getElement().find('ul li').addClass('col-50');
                break;
            case "bigphoto":
                this.getElement().find('ul li').addClass('col-100');
                break;
            default:
                this.getElement().find('ul li').addClass('col-50');
                break;
        }
        myApp.initImagesLazyLoad(this.getParent().getView());
    };

    return widget;
});