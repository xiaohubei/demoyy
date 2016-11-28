cb.views.register('paymentViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.getProxyData = function (widgetName) {
        var queryString = new cb.util.queryString();
        if (widgetName == "detail_box") {
            return { id: queryString.get("goods_id") };
        }
    };
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        debugger;
        var cOrderNum = queryString.get("order_id")
        var proxy = cb.rest.DynamicProxy.create({ getOrderDetail: { url: 'client/Orders/getDetail', method: 'POST', options: { token: true } } });
        // 获得订单地址
        proxy.getOrderDetail({ cOrderNo: cOrderNum }, function (err, result) {
            if (err) {
                alert("获取订单详情失败" + err);
            } else {
                var tplstring = document.getElementById("getOrderDetail");
                var da = result;
                var html = this.render(tplstring.innerText, { list: result })
               // var html = this.render(tplstring.innerText, { list: result})
                $("#showOrderDetail").empty().append(html);
            }

        },this);
        // 确认付款按钮
        $(".btnPayment").click(function () {
            // 显示灰色 jQuery 遮罩层
             showBg();
            // 获得支付方式
             debugger;
            var cOrderNQqueryString = new cb.util.queryString();
            var cOrderNumber = cOrderNQqueryString.get("order_id")
            var payTypeValue = $('input[name="paymentType"]:checked').val();
            var tradeTypeObj = {
                storagecard: 'STORAGE',
                chanpay: 'CHANPAY',
                weixin: 'NATIVE',
                alipay: 'ALIPAY'
            };
            var payParams = {
                cOrderNo: cOrderNumber,
                paytype: 1,
                remark: "订单支付",
                paytypecode: payTypeValue,
                trade_type: tradeTypeObj[payTypeValue]
            };
            // 调用支付接口
            var proxy = cb.rest.DynamicProxy.create({ buildPayment: { url: 'client/Pay/buildPayment', method: 'POST', options: { token: true } } });
            proxy.buildPayment(payParams, function (err, response) {
                if (err) {
                    debugger;
                    alert("支付失败");
                } else {
                   debugger;
                    var form = $(response);
                    form.appendTo("body");
                    form.css('display', 'none');
                    //form.target="_blank";
                    form.submit();

                }

            });
        });
        // 支付遇到问题
        $(".btnPaymentFailed").click(function () {
            $("#fullbg,#dialog").hide();
        });
        // 支付成功
        $(".btnPaymentSuccess").click(function () {
            $("#fullbg,#dialog").hide();
        });
        // 关闭灰色 jQuery 遮罩
        $(".close_mayer").click(function () {
            $("#fullbg,#dialog").hide();
        });
    };
    //显示灰色 jQuery 遮罩层
    var showBg = function () {
        var bh = $("body").height();
        var bw = $("body").width();
        $("#fullbg").css({
            height: bh,
            width: bw,
            display: "block"
        });
        $("#dialog").show();
    }
    return view;
});