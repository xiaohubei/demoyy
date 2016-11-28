cb.views.register('searchExpressController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        var cOrderNum = queryString.get("order_id")
        var proxy = cb.rest.DynamicProxy.create({
            lookExpress: { url: 'client/Orders/lookExpress', method: 'POST', options: { token: true } },
        });
        // 获得订单地址
        proxy.lookExpress({ cOrderNo: cOrderNum }, function (err, result) {
            var html;
            if (err) {
                html = '<div class="expresserrortip">'+err.message+'</div>';
                $("#expressinfo").empty().html(html);
                return;
            } else {
                if(result.status && result.status !=200){
                    html = '<div class="expresserrortip"> 物流公司: '+result.corp_name+"<br/>物流单号:"+ result.nu +"<br/>" + result.message+ ' </div>';
                    $("#expressinfo").empty().html(html);
                    return;
                }
                result.cOrderNum = cOrderNum;
                html = this.render($("#searchexpress").html(),{result:result});
                $("#expressinfo").empty().html(html);
            }

        },this);

    };
    return view;
});