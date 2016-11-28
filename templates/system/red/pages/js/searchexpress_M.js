cb.views.register('searchExpressController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        lookExpress: { url: 'client/Orders/lookExpress', method: 'GET', options: { token: true ,mask:true} },
    });
    view.prototype.lookExpress = function (callback) {
        //debugger;
        var queryString = this.getQuery();
        var cOrderNum = queryString["oid"];
        this.proxy.lookExpress({ cOrderNo: cOrderNum }, function (err, result) {
            $$('#searchexpress-container .infinite-scroll-preloader').remove();
            if (err) {
                if (typeof (err) == 'object') {
                    var result = {};
                    result.data = [{ context: err.message }];
                    
                };
            } else {
                if (result.status && result.status != 200) {
                    result.data = [{ context: result.message }];
                };
            };
            result.cOrderNum = cOrderNum;
            result.data[result.data.length - 1].last = true;
            result.data[0].first = true;
            var html = this.render($$("#searchexpressTpl").html(), { data: result });
            $$("#searchexpressinfo").html("").html(html);
            this.statusIconChange();
            if (callback) callback();
        }, this);
    };
    view.prototype.statusIconChange = function () {
        var className = "";
        switch (this.cNextStatus) {
            case "PAYMONEY":
                className = "";
                break;
            case "DELIVERGOODS":
                className = "icon-wait";
                break;
            case "TAKEDELIVERY":
                className = "icon-shipped";
                break;
            case "UNREMARK":
                className = "icon-received";
                break;
            case "ENDORDER":
                className = "icon-received";
                break;
        };
        if (className) $$("#searchexpress-container").find("i.currentstatus").addClass(className);
    };
    view.prototype.init = function () {
        var queryString = this.getViewData().query;
        this.cNextStatus = queryString["cNextStatus"];
        this.lookExpress();
        var self = this;
        $$('#searchexpress-container').on('refresh', function (e) {
            var callback = function () {
                myApp.pullToRefreshDone();
            };
            self.lookExpress(callback);
        });
    };

    return view;
});