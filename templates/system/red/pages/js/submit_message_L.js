
cb.views.register('SubmitMessageViewController', function (controllerName) {
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
        var $view = this.getView();
        var queryString = new cb.util.queryString();
        var cOrderNum = queryString.get("order_id");
        var _this = this;
        // 商品是否下架参数
        var shoppingCart = {};
        var itemsArray = new Array();
        var proxy = cb.rest.DynamicProxy.create({
            getOrderDetail: {
                url: 'client/Orders/getDetail', method: 'POST', options: { token: true }
            },
            getOrderDetail1: {
                url: 'client/Orders/getDetail', method: 'POST', options: { token: true }
            },
            getEnablePayTypeList: {
                url: 'client/Pays/getEnablePayTypeList', method: 'GET', options: { token: true }
            },
            buildPayment: {
                url: 'client/Pay/buildPayment', method: 'POST', options: { token: true,mask:true }
            },
            loopVirtualRequest: { url: 'client/Pay/loopVirtualRequest', method: 'GET' }
        });
        this._set_data('proxy', proxy);
        // 获得订单地址
        proxy.getOrderDetail({ cOrderNo: cOrderNum }, function (err, result) {
            if (err) {
                ModalTip({ message: "获取订单详情失败" + err.message }, _this);
            } else {
                for (var i = 0; i < result.oOrderDetails.length; i++) {
                    itemsArray.push({
                        id: result.oOrderDetails[i].iShoppingCartId,
                        iSKUId: result.oOrderDetails[i].iSKUId,
                        iQuantity: result.oOrderDetails[i].iQuantity,
                        iCorpId: result.oOrderDetails[i].iCorpId,
                        iProductId: result.oOrderDetails[i].iProductId
                    });
                    //itemsArray.push({
                    //    fSalePrice: "60.66",
                    //    iCorpId: "21",
                    //    iProductId: "306",
                    //    iQuantity: "1",
                    //    iSKUId: "722",
                    //id: "2030"})
                }
                shoppingCart.items = itemsArray;
                // 取两位小数
                result.fTotalMoney = parseFloat(result.fPayMoney).toFixed(2);
                var html = this.render($('#getOrderDetail').html(), { list: result });
                $("#showOrderDetail").empty().append(html);

                _this.orderDetail = result;
                if (_this.orderDetail.oOrderDetails[0].isGiftCard)
                    $(".bank-list").children('li[data-type="storagecard"]').remove();
            }
        }, this);

        proxy.getEnablePayTypeList({}, function (err, response) {
            if (err) {
                alert(err.message);
                return;
            }
            if (_this.orderDetail&&_this.orderDetail.oOrderDetails[0].isGiftCard) {
                for (var i = 0; i < response.length; i++) {
                    if (response[i].paytypecode == 'storagecard')
                        response[i].isenable = false;
                }
            }
            var html = this.render($('#bankListTpl').html(), { bankList: response });
            $(".bank-list").empty().append(html);
            var rObj = document.getElementsByName("paymentType");
            if (rObj.length > 0) {
                rObj[0].checked = 'checked';
            }
            //选择支付方式
            $('.bank-list li div input').on('click', function () {
                var weinXinPay = $('.weixin').parents('dd');
                clearInterval(_this.payInterval);
                if ($(this).attr('value') == "storagecard") {
                    if (weinXinPay.find('.weixin-pay').length > 0) {
                        weinXinPay.find('.weixin-sign').hide();
                        weinXinPay.find('.weixin-pay').hide();
                        weinXinPay.find('.weixin-div').hide();
                        var loopTimeout = _this._get_data('loopTimeout');
                        if (loopTimeout) clearTimeout(loopTimeout);
                    }
                    $('.btnPayment').attr('disabled', false);
                    proxy.getOrderDetail1({ cOrderNo: cOrderNum }, function (err, result) {
                        if (err) {
                            ModalTip({ message: "获取订单详情失败" + err.message }, _this);
                        } else {
                            //初始储值卡
                            if (result.oMP_StorageCards && result.oMP_StorageCards.hasOwnProperty('fBalance')) {
                                var tips = '<div class="valueCard">' + '储值卡余额：' + '<span class="valueCardSum">' + result.oMP_StorageCards.fBalance.toFixed(2) + '</span>' + '元' + '</div>';
                                $('.storagecard').parent('li').find('div.valueCard').show();
                                if (!($('.storagecard').parent('li').find('div.valueCard').length > 0)) {
                                    $('.storagecard').parent('li').append(tips);
                                }
                                if (result.oMP_StorageCards.fBalance.toFixed(2) < result.fPayMoney) {
                                    var spanTips = ' ' + '<span class="valueCardSpan">余额不足</span>';
                                    if (!($('.storagecard').parent('li').find('span.valueCardSpan').length > 0)) {
                                        $('.storagecard').parent('li').find('div.valueCard').append(" " + spanTips);
                                    }
                                    $('.btnPayment').attr('disabled', true);
                                }
                            }
                        }
                    }, this);
                } else if ($(this).attr('value') == "weixin") {
                    if ($('.storagecard').parent('li').find('div.valueCard').length > 0) {
                        $('.storagecard').parent('li').find('div.valueCard').hide();
                    }
                    $('.btnPayment').attr('disabled', true);
                    
                    var $payContainer = $('.weixin').parents('dd');
                    if (!$payContainer.children('.weixin-container').length) {
                        $('<div class="weixin-container"></div>').appendTo($payContainer);
                    } else {
                        $payContainer.children('.weixin-container').empty();
                    }
                    /*生成二维码*/
                    _this.buildPayment();
                    weinXinPay.find('.weixin-sign,.weixin-div,.weixin-pay').show();

                } else {
                    if ($('.storagecard').parent('li').find('div.valueCard').length > 0) {
                        $('.storagecard').parent('li').find('div.valueCard').hide();
                    }
                    if (weinXinPay.find('.weixin-pay').length > 0) {
                        weinXinPay.find('.weixin-sign').hide();
                        weinXinPay.find('.weixin-pay').hide();
                        weinXinPay.find('.weixin-div').hide();
                        var loopTimeout = _this._get_data('loopTimeout');
                        if (loopTimeout) clearTimeout(loopTimeout);
                    }
                    $('.btnPayment').attr('disabled', false);
                }
            });
            $('.bank-list li div input:eq(0)').trigger('click');
        }, this);
        // 确认付款按钮
        $('.btnPayment').dblclick(function () {
            cb.util.clickTimeout.clear();
            _this.pay();
        });
        $(".btnPayment").on("click", function () {
            cb.util.clickTimeout.set(function () {
                _this.pay();
            });
        });
        // 支付遇到问题
        $(".btnPaymentFailed").click(function () {
            $("#fullbg,#dialog").hide();
            window.location.href = "/submit_message?order_id=" + cOrderNum;
        });
        // 支付成功
        $(".btnPaymentSuccess").click(function () {
            $("#fullbg,#dialog").hide();
            location.href = "member/orderdetail?orderId=" + cOrderNum;
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

    view.prototype.pay = function () {
        // 获得支付方式
        var _this = this;
        var $view = this.getView();
        var cOrderNQqueryString = new cb.util.queryString();
        var cOrderNumber = cOrderNQqueryString.get("order_id")
        var payTypeValue = $('input[name="paymentType"]:checked').val();
        var payBackUrl = "/member/orderdetail?orderId=";
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
            notifyUrl: "",
            payBackUrl: payBackUrl,
            trade_type: tradeTypeObj[payTypeValue]
        };
        var proxy = this._get_data('proxy');
        // 调用支付接口
        proxy.buildPayment(payParams, function (err, response) {
            if (err) {
                ModalTip({ message: "支付失败" + err.message }, _this);
            } else {
                if (payTypeValue == 'storagecard') {
                    window.location.href = "member/orderdetail?orderId=" + cOrderNumber;
                    return;
                }
                // 显示灰色 jQuery 遮罩层
                showBg();
                var obj = document.createElement('div');
                obj.innerHTML = response;
                $view.append(obj.childNodes);
                var form = $view.find('form');
                form.submit();
                form.remove();
            }
        });
    };

    view.prototype.buildPayment = function () {
        var self = this;
        var proxy = self._get_data('proxy');
        var orderno = new cb.util.queryString().get('order_id');
        var payBackUrl = "/member/orderdetail?orderId=";
            proxy.buildPayment({
                cOrderNo: orderno,
                paytype: 1,
                remark: "微信支付",
                paytypecode: "weixin",
                payBackUrl: payBackUrl,
                trade_type: 'NATIVE'
            }, function (err, response) {
                if (err) {
                    alert(err.message)
                    return;
                }
                var url = response;
                //参数1表示图像大小，取值范围1-10；参数2表示质量，取值范围'L','M','Q','H'
                var qr = qrcode(10, 'M');
                qr.addData(url);
                qr.make();
                var dom = document.createElement('DIV');
                $(dom).addClass('weixin-pay');
                dom.innerHTML = qr.createImgTag();
                var $weinxin = $('.weixin').parents('dd').find('.weixin-pay');
                if ($weinxin.length) {
                    $weinxin.html(dom.innerHTML);
                }
                var timeSpan = 60;
                self.payInterval = setInterval(function () {
                    //计时器
                    if (timeSpan < 0) {
                        qr = qrcode(10, 'M');
                        qr.addData('weixin://wxpay/bizpayurl?pr=');
                        qr.make();
                        $('.weixin').parents('dd').find('.weixin-pay').html(qr.createImgTag());
                        var loopTimeout = self._get_data('loopTimeout');
                        if (loopTimeout) clearTimeout(loopTimeout);
                        clearInterval(self.payInterval);
                        var reminderNew = '<p class="weixin-sign-new" style="margin-left:183px;color:red;letterspace:2; font-size: 14px;">二维码已过期，<span class="refresh" style="color: #2ea7e7;">刷新</span>页面重新获取二维码</p>';
                        $('.weixin-sign').html(reminderNew);
                        $('.refresh').on('click', function () {
                            self.buildPayment();
                        });
                    } else {
                        var reminder;
                        var tips = '<p style="margin-left:235px;">距离二维码过期还剩<span class="remainSeconds">' + timeSpan + '</span>秒。</p>';
                        var html = '<div class="weixin-div">请使用微信扫一扫</br>扫描二维码支付</div>'
                        var weinXinPay = $('.weixin').parents('dd').children('.weixin-container');
                        if (!weinXinPay.find('.weixin-pay').length > 0) {
                            reminder = '<div class="weixin-sign">' + tips + '</div>';
                            weinXinPay.append(reminder);
                            weinXinPay.append(dom);
                            weinXinPay.append(html);
                        }
                        $('.weixin-sign').html(tips);
                        timeSpan--;
                    }
                }, 1000);
                self.processLoopVirtualRequest();
            });
            
    };
    view.prototype.processLoopVirtualRequest = function () {
        var self = this;
        var loopTimeout = self._get_data('loopTimeout');
        if (loopTimeout) clearTimeout(loopTimeout);
        loopTimeout = setTimeout(function () {
            var proxy = self._get_data('proxy');
            var orderId = new cb.util.queryString().get('order_id');
            proxy.loopVirtualRequest({ orderId: orderId }, function (err, result) {
                if (err) {
                    self.processLoopVirtualRequest();
                    return;
                }
                location.href = 'member/orderdetail?orderId=' + orderId;
            });
        }, 3000);
        self._set_data('loopTimeout', loopTimeout);
    };

    return view;
});