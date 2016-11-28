cb.views.register('orderdetailController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getOrderDetail: { url: 'client/orders/getDetail', method: 'POST', options: { token: true, mask: true } },
        getOrdersNum: { url: 'client/Orders/getOrderStyleCount', method: 'post', options: { token: true } },
        batchConfirmTake: { url: 'client/Orders/batchConfirmTake', method: 'POST', options: { token: true } },
        closeOrder: { url: 'client/Orders/closeOrder', method: 'POST', options: { token: true, mask: true } },
        orderMemo: { url: 'client/Orders/orderMemo', method: 'POST', options: { token: true } },
        getLogisticsCorp: { url: 'client/Orders/getLogisticsCorp', method: 'POST', options: { token: true } },
        returnGoods: { url: 'client/SaleReturns/returnGoods', method: 'POST', options: { token: true } },
        getReasonContentList: { url: 'client/OrderCancelReason/getReasonContentList', method: 'GET', options: { token: true } },
        lookExpress: { url: 'client/orders/lookExpress', method: 'GET', options: { token: true, mask: false } },
        getDetail: { url: 'client/Orders/getDetail', method: 'GET', options: { token: true, autoLogin: false, mask: true } }
    });
    view.prototype.getOrderDetail = function (postData, isAppend) {
        this.proxy.getOrderDetail(postData, function (err, result) {
            if (err) {
                myApp.toast("获取我的订单失败" + err.message, "提示").show(true)
                return;
            };
            $$("#orderDetail-container-header .header-ordernum").html(result.cOrderNo);
            $$("#orderDetail-container-header .header-orderdate").html(result.dOrderDate);
            if (result.dPayDate) {
                $$("#orderDetail-container-header .header-paydate").html('<p>支付时间：<span class="header-paydate">' + result.dPayDate + '</span></p>');
            };
            this._set_data("currentstatus", result.cNextStatus);
            clearInterval(myApp.orderDetailPayInterval);
            $$("#timeRemain").text("");
            if (result.cNextStatus == 'PAYMONEY') {
                this.countDownTime(result);
            } else {
                if(result.cDeliverType !=="PICKUP"){
                    if (!result.oOrderDetails[0].isGiftCard && result.cNextStatus == 'TAKEDELIVERY' || result.cNextStatus == 'ENDORDER') {
                        this.lookExpress(postData,result);
                    };
                }
            };
            if(result.cDeliverType && result.cDeliverType ==="PICKUP")this.createLadingQcode(result);
            this.dealWithOrderLists(result, isAppend);
        }, this);
    };
    view.prototype.lookExpress = function (postData,result){
        this.proxy.lookExpress(postData, function (err, result) {
            if (err) {
                if(err && err.code == 999){
                    result = err;
                }else{
                    console.log("物流信息加载失败"+err.message);
                    return;
                }
            };
            var txt = $$("#expressTpl").html();
            result.orderId = this._get_data("orderId");
            if (result && result.data) {
                result.time = result.data[result.data.length - 1 ].time;
                result.currentstatus = this._get_data("currentstatus") == "TAKEDELIVERY" ? "运输中" : "已签收";
            } else {
                result.corp_name =result.message;
            }
            var html = this.render(txt, { data: result});
            $$("#expressinfo").html("");
            $$("#expressinfo").append(html);
        }, this);
    }
    view.prototype.createLadingQcode = function (result){
        var qr = qrcode(8, 'H');
        qr.addData(result.ladingCode);
        qr.make();
        var ladingInterval = setInterval(function(){
            if($$("#ladingCodeQr").length){
                clearInterval(ladingInterval);
                var barcodeDom = new CreateBarcode(result.ladingCode, {width:2, format:"CODE128", height:50,});
                var qrcodeDom = qr.createImgTag();
                var codeDom = '\
                        <div>'+barcodeDom.outerHTML+'</div>\
                        <div>'+qrcodeDom+'</div>';
                $$("#ladingCodeQr").html( codeDom);
                $$("#ladingCodeQr").click(function(e){
                    myApp.alert(codeDom,"提货码")
                })
            };
        },300);
    };
    function CreateBarcode(text, options){
        var barcodeDom = document.createElement('img');
        try{
            JsBarcode(barcodeDom, text, options)
        }catch(e){
            throw e;
        }
        return barcodeDom;
    }
    view.prototype.orderStatusIconChange = function (status) {
        var className = "";
        switch (status) {
            case "PAYMONEY":
                className = "icon-pay";
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
        if (className) $$("#orderDetail-container").find("i.currentstatus").addClass(className);
    };
    view.prototype.dealWithOrderLists = function (result, isAppend) {
        $$('#orderDetail-container .infinite-scroll-preloader').remove();
        this.orderStatusIconChange(result.cNextStatus);
        var txt = result ? $$("#orderDetailTpl").html() : '<p class="noorder">暂无订单!</p>';
        //对每个订单退货，把cNextStatus放到每个商品里去,此处待优化？
        for (var i = 0; i < result.oOrderDetails.length; i++) {
            result.oOrderDetails[i].cNextStatus = result.cNextStatus;
            result.oOrderDetails[i].cOrderNo = result.cOrderNo;
            result.oOrderDetails[i].cOrderPayType = result.cOrderPayType;
        };
        result.isShowPayInfo = result.cNextStatus == 'PAYMONEY' ? false : true;
        result.isPickup = result.cDeliverType == "PICKUP" ? true : false;
        //result.isShowPayInfo = result.cOrderPayType == 'FIRSTDELIVER' ? false : true;
        switch (result.cInvoiceType) {
            case "NONE":
                result.cInvoiceType = "不开发票";
                break;
            case "PLAIN":
                result.cInvoiceType = "普通发票";
                break;
        };
        result.isGiftCard = result.oOrderDetails[0].isGiftCard;
        var html = this.render(txt, { order: result });
        $$("#orderDetail").html("");
        $$("#orderDetail").append(html);
        //this.proxyServiceStart = false;
        this.eventRegister();
    };
    view.prototype.countDownTime = function (data) {
        if (!data) return;
        var payCreateTime = new Date(data.dOrderDate.replace(/-/g, '/'));
        if (data.oOrderStatuses && data.oOrderStatuses.length > 0) {
            payCreateTime = new Date(data.oOrderStatuses[0].dCreated.replace(/-/g, '/'));
        };
        var payEndTime = payCreateTime.setDate(payCreateTime.getDate() + 1);
        var timeSpan = payEndTime - (new Date(data.dServerDate.replace(/-/g, '/'))).getTime();
        myApp.orderDetailPayInterval = setInterval(function () {
            if (timeSpan <= 0) {
                clearInterval(myApp.orderDetailPayInterval);
                $$("#timeRemain").text("订单已超时！");
                timeSpan = 0;
            }
            var leave1 = timeSpan % (24 * 3600 * 1000);    //计算天数后剩余的毫秒数
            var timeHours = Math.floor(leave1 / (3600 * 1000));//计算相差小时数
            var leave2 = leave1 % (3600 * 1000);        //计算小时数后剩余的毫秒数
            var timeMinutes = Math.floor(leave2 / (60 * 1000));//计算相差分钟数
            var leave3 = leave2 % (60 * 1000);      //计算分钟数后剩余的毫秒数
            var timeSeconds = Math.round(leave3 / 1000);//计算分钟数后相差的毫秒数
            timeSpan -= 1000;
            $$("#timeRemain").text(timeHours + "时 " + timeMinutes + " 分" + timeSeconds + " 秒" + "确认付款");
        }, 1000);
    };
    view.prototype.getCancelOrderReason = function(callback){
        var self = this;
        if(self.cancelOrderReason) return;
        this.proxy.getReasonContentList({type:"orderclose"},function(err, result){
            if(err){
                console.log(err.message);
                return;
            };
            self.cancelOrderReason = result;
            var s = '';
            for(var i=0; i<result.length; i++){
                s+= '<li>\
                        <label class="label-checkbox item-content">\
                            <div class="item-inner">\
                                <div class="item-title">'+result[i].reason+'</div>\
                            </div>\
                            <input type="radio" name="my-checkbox" value='+result[i].reason+'>\
                            <div class="item-media">\
                                <i class="icon icon-form-checkbox"></i>\
                            </div>\
                        </label>\
                    </li>';
            };
            var cancelPopup = $$(document.body).find('.popup-cancelreason');
            cancelPopup.find('ul').html(s);
            cancelPopup.find('.confirm-popup').on("click", function (e){
                var reason;
                var inputDom = cancelPopup.find("ul input");
                for(var i=0; i<inputDom.length ; i++){
                    if(inputDom[i].checked) reason = inputDom[i].value;
                };
                if(!reason) {
                    myApp.toast("请选择取消原因"," 提示").show(true);
                    return;
                }
                callback(reason);
                myApp.closeModal('.popup-cancelreason');
            });
            cancelPopup.find('.close-popup').on("click", function (e){
                self.operateEventStart = false;
                myApp.closeModal('.popup-cancelreason');
            });
        },this);
    };
    view.prototype.eventRegister = function () {
        var self = this;
        var returnGoodData = {};
        this.operateEvent($$('#orderDetail').find(".cancel"), "click", "closeOrder", "取消订单");
        this.operateEvent($$("#orderDetail").find(".confirm"), "click", "batchConfirmTake", "你确定要确认收货么？");
        this.getView().find(".returngood").click(function (e) {
            //获得退货状态 SUBMITSALERETURN 待审批 CONFIRMSALERETURNORDER 退货中 ENDSALERETURN 已完成 OPPOSESALERETURN 已驳回
            returnGoodData.detailId = $$(this).attr("data-detailid");
            returnGoodData.orderNo = $$(this).attr("data-corderno");
            self.proxy.getLogisticsCorp({}, function (err, result) {
                if (err) {
                    myApp.toast(err.message, "提示").show(true)
                    return;
                };
                self._set_data("logisticsCorp", result);
                self.returngood(result, returnGoodData);
            })
        });
        this.getView().find('#orderDetail').find(".payfor").click(function () {
            var cOrderNo = $$(this).parent().attr("data-corderno");
            self.proxy.getDetail({ cOrderNo: cOrderNo }, function (err, result) {
                if (err) {
                    myApp.toast(err.message, "提示").show(true)
                    return;
                }
                myApp.mainView.router.loadPage({
                    url: 'payment',
                    query: result
                });
            });
        });
    };
    view.prototype.operateEvent = function (lists, event, service, message) {
        var self = this;
        var clickHandler = function(){
            if(self.operateEventStart) return;
            self.operateEventStart = true;
            self.orderListOperatePostData = {cOrderNo:$$(this).parent().attr("data-cOrderNo")}
            self.orderListOperate(service, message, $$(this));
        };
        lists.each(function(index){
            //$$(this)[0].removeEventListener(event, clickHandler);
            $$(this)[0].addEventListener(event, clickHandler);
        });
    };
    view.prototype.orderListOperate = function (service, message, $$this) {
        var self = this;
        if(!self.orderListOperatePostData)return;
        var okCallback = function (data) {
            if(service == "batchConfirmTake") $$this.attr("disabled", true);
            if (service == "closeOrder") self.orderListOperatePostData.reason = data;
            self.proxy[service](self.orderListOperatePostData, function (err, success) {
                if (err) {
                    myApp.toast("操作失败" + err.message, "提示").show(true);
                    if(service == "batchConfirmTake") $$this.attr("disabled", false);
                    return;
                };
                var successcallBack = function (data) {
                    var currentstatus = self._get_data("currentstatus");
                    myApp.mainView.router.loadPage({ url: 'member/myorder?status=' + currentstatus + '' });
                }
                myApp.toast("操作成功！", "提示").show(true);
                setTimeout(successcallBack, 1000)
            });
        }
        var cancelCallback = function (){
            self.operateEventStart = false;
        };
        if (service == "closeOrder") {
            this.getCancelOrderReason(okCallback);
            myApp.popup('.popup-cancelreason');
        } else {
            myApp.confirm(message, "提示", okCallback, cancelCallback);
        }
    };
    view.prototype.util = {
        trimStr: function (str) { return str.replace(/(^\s*)|(\s*$$)/g, ""); },
        replaceBackslash: function (url) {
            if (!url) return;
            var re = /\\/g;
            url = url.replace(re, '/');
            return url;
        },
    };
    view.prototype.returngood = function (data, returnGoodData) {
        var self = this;
        var exprsstxt = '';
        for (var i = 0; i < data.length; i++) {
            exprsstxt += '<option data-id="' + data[i].id + '">' + data[i].name + '</option>';
        }
        var txt = '<div class="returngood-popup">'
                    +'<div class="list-block">'
                    + '<div class="item-content ">'
                        + '<div class="item-inner ">'
                            + '<div class="item-title label" for="expresscompany">物流公司</div>'
                            + '<div class="item-input">'
                              + '<select type="text" class="form-control" id="expresscompany">'
                              + exprsstxt
                              + '<select>'
                            + '</div>'
                        + '</div>'
                    + '</div>'
                    + '</div>'
                    + '<div class="list-block ">'
                    + '<div class="item-content ">'
                        + '<div class="item-inner ">'
                            + '<label class="item-title label" for="expressnum">快递单号</label>'
                            + '<div class="item-input">'
                              + '<input type="number" class="form-control" id="expressnum" placeholder="请输入快递单号">'
                            + '</div>'
                        + '</div>'
                    + '</div>'
                    + '</div>'
                + '</div>';
        var callback = function () {
            var findLogisticCorpId = function (name) {
                var logisticsCorp = self._get_data("logisticsCorp");
                for (var i = 0; i < logisticsCorp.length; i++) {
                    if (logisticsCorp[i].name == name) {
                        return logisticsCorp[i].id;
                    }
                }
            }
            returnGoodData.logisticCorpId = findLogisticCorpId($$("#expresscompany").val());
            returnGoodData.logisticsNo = $$("#expressnum").val();
            if (!returnGoodData.logisticCorpId || !returnGoodData.logisticsNo) {
                myApp.toast('请输入快递公司或者快递单号', "提示").show(true)
                return;
            };
            self.proxy.returnGoods(returnGoodData, function (err, result) {
                if (err) {
                    myApp.toast(err.message, "提示").show(true)
                    return;
                };
                myApp.toast("操作成功,请等待卖家确认!", "提示").show(true)
                setTimeout(function () {
                    myApp.mainView.router.refreshPage();
                }, 1000);
            });
        };
        myApp.confirm(txt, "提示", callback);
    };
    view.prototype.dealWithImgPath = function (data) {
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].oOrderDetails.length; j++) {
                var imageUrl = data[i].oOrderDetails[j].DefaultImage;
                if (!imageUrl) {
                    console.log("第" + i + "个订单的" + j + "商品没有图片");
                };
                data[i].oOrderDetails[j].ImgUrl = replaceBackslash(imageUrl)
            }
        }
        return data;
    };
    view.prototype.init = function () {
        var queryString = this.getViewData().query;
        var orderId = queryString["orderId"];
        this._set_data("closeOrderMsg", "你确认要取消订单吗？");
        this._set_data("orderId", orderId);
        if(!orderId){
            myApp.toast("cOrderNo为空了", "提示").show(true)
            return;
        };
        this.getOrderDetail({ cOrderNo: orderId });
        this.orderId = orderId;
    };
    view.prototype.afterFromPageBack = function(data){
        //if (data.fromPage.name  !== 'myreturn' && data.fromPage.name  !== 'evaluation' && data.fromPage.name  !== 'myorder') return;
        //if(data.query.refreshPage)
            this.getOrderDetail({ cOrderNo: this.orderId });
    };
    return view;
});