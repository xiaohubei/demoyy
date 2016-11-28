cb.views.register('CartAddedViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.getProxyData = function (widgetName) {
		
    };
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        var goods_id = queryString.get("goods_id");
	    $('.continueShopping').on('click', function () {
	        window.location.href = "detail?goods_id=" + goods_id;
	    });
	}
    return view;
});