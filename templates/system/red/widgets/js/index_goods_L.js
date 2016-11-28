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
        var cols = parseInt(config.cols) || 4;
        config.colspan = Math.round(12 / cols);
        var rows = parseInt(config.rows) || 2;
        config.limit = cols * rows;
        var params = {};
        params.pagesize = config.limit;
        params.pageindex = 1;
        params.where = config.filter || [];
        var productAttribute = { 'fieldname': 'productAttribute', 'valuefrom': '1' };
        if (config.goodClass && config.goodClass !== 'general')
            productAttribute.valuefrom = '2';
        params.where.push(productAttribute);
        if (config.isCurrentClass === 'true') {
            var productId = new cb.util.queryString().get('goods_id');
            if (productId)
                params.where.push({ 'fieldname': 'productId', 'valuefrom': productId });
        }
        params.order = config.order;
        return { queryCondition: params };
    };

    widget.prototype.getTemplate = function () {
        var config = this.getConfig();
        if (config.displayMode !== 'rank') {
            return this.getElement().find('#landscape').html();
        } else {
            return this.getElement().find('#portrait').html();
        }
    };

    widget.prototype.runTemplate = function (error, result) {
        debugger;
        if (error) return;
        var config = this.getConfig();
        for (var i = 0; i < result.data.length; i++) {
            if (result.data[i].fSalePrice) {
                result.data[i].fSalePrice = parseFloat(result.data[i].fSalePrice).toFixed(2);
            }
        };
        result.colspan = config.colspan;
        var html = this.render(result);
        this.getElement().find('ul').html(html);
    };

    return widget;
});