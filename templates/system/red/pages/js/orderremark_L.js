cb.views.register('orderremarkController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var proxy = cb.rest.DynamicProxy.create({
            getOrderDetail: {
                url: 'client/orders/getDetail',
                method: 'POST',
                options: { token: true }
            },
            getOrderMemo: {
                url: 'client/Orders/orderMemo',
                method: 'POST',
                options: { token: true }
            }
        });
        var queryString = new cb.util.queryString();
        var cOrderNum = queryString.get("order_id");
        var _this = this;
        // 获得订单详情
        proxy.getOrderDetail({ cOrderNo: cOrderNum }, function (err, result) {
            debugger;
            if (err) {
                ModalTip({message:"获取订单详情失败" + err},_this);
                return;
            } else {
                var html = _this.render($("#orderremarkTpl").html(), { data: result });
                $("#orderremark").empty().append(html);
                //事件注册
                enventRegister()
            }

        });
        var enventRegister = function () {
            //提交订单备注
            $("#postremark").click(function () {
                if (getStringLength() > 255) {
                    ModalTip({message:"你提交的字符太多啦，请重新输入！"},_this)
                    return;
                }
                postData = {
                    cOrderNo: cOrderNum,
                    memo: $("#remarkinfo").val()
                };
                proxy.getOrderMemo(postData, function (err, result) {
                    if (err) {
                        ModalTip({message:"提交订单备注失败" + err.message},_this);
                        return;
                    };
                    var callback = function (){
                        location.href = 'myorder?' + cOrderNum;
                    }
                    ModalTip({message:"提交订单备注成功",cb:callback},_this);
                });
            });
            //校验备注长度
            $("#remarkinfo").blur(function () {
                debugger;
                if (getStringLength() > 255) {
                    $("#tipmessage").hide();
                    $("#warningmessage").show();
                } else {
                    $("#tipmessage").show();
                    $("#warningmessage").hide();
                }
            });
        }
        var getStringLength = function (){
            var str = $.trim($("#remarkinfo").val());
            return str.length;
        }


    }
    return view;
})