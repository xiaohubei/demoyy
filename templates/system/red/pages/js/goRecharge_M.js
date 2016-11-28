cb.views.register('goRechargeController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        recharge: { url: 'member/StorageCard/recharge', method: 'get', options: { token: true, mask: true } },
        depositByGiftCard: { url: 'giftcard/ClientServer/depositByGiftCard', method: 'get', options: { token: true, mask: true } },
        bulidPaymentByCardDetailId: { url: 'client/Pay/bulidPaymentByCardDetailId', method: 'get', options: { token: true, mask: true } },
        checkGiftCard: { url: 'giftcard/ClientServer/checkGiftCard', method: 'get', options: { token: true, mask: true } },

        loopVirtualRequest: { url: 'client/Pay/loopVirtualRequest', method: 'GET', options: { token: true } }
    });
    view.prototype.init = function () {
        var queryString = this.getViewData().query;
        var passwordString = queryString["password"];
        this.device = this.getPhoneType();
        this._set_data("passwordString", passwordString);
        if (passwordString) {
            this.getView().find("#giftcardpassword input").each(function (index) {
                $$(this).val(passwordString.substring(index * 4, 4 * (index + 1)));
            });
        }

        this.InitPayType(queryString.type);

        //支付通道对象列表
        var pays = {};
        if (window.plus) {
            //请求支付通道
            plus.payment.getChannels(function (channels) {
                for (var i in channels) {
                    var channel = channels[i];
                    pays[channel.id] = channel;
                }
            }, function (e) {
                myApp.toast("获取支付通道失败：" + e.message, 'error').show(true);
            });
        }
        this.EventRegist(pays);

        if (queryString.type) {
            this.getView().find('.myreturn-form').children('.giftcardpassword').removeClass('hide');
            this.getView().find('.myreturn-form').children('.rechargeNumber').addClass('hide');

            this.getView().find('.rechargeTypeContent').children('div[data-type="giftCard"]').trigger('click');
        }
    };

    view.prototype.InitPayType = function (val) {
        var thisView = this.getView();

        if ((typeof WeixinJSBridge == "undefined")) {
            thisView.find('.rechargeTypeContent').children('div[data-type="wxpay"]').remove();
        }
        else if (!window.plus) {
            thisView.find('.rechargeTypeContent').children('div[data-type="alipay"]').remove();
        }
        if (!val)
            thisView.find('.rechargeTypeContent').children('div').eq(0).children('input').prop('checked', true);
        else
            thisView.find('.rechargeTypeContent').children('div[data-type="giftCard"]').children('input').prop('checked', true);
    };

    view.prototype.EventRegist = function (pays) {
        var self = this;
        var thisView = this.getView();

        thisView.find('input[name="rechargeNumber"]').on('keydown', function (e) {
            var code = e.keyCode;
            if ((code <= 57 && code >= 48) || (code <= 105 && code >= 96) || (code == 8)) {
                return true;
            } else {
                return false;
            }
        });

        thisView.find('input[name="rechargeNumber"]').on('change', function () {
            $$(this).val($$(this).val().replace(/[^\d.]/g, ''));
        });

        thisView.find('.rechargeTypeContent').children('div').on('click', function () {
            $$(this).find('input').prop('checked', true);
            if ($$(this).attr('data-type') == 'giftCard') {
                thisView.find('.myreturn-form').children('.giftcardpassword').removeClass('hide');
                thisView.find('.myreturn-form').children('.rechargeNumber').addClass('hide');
            }
            else {
                thisView.find('.myreturn-form').children('.rechargeNumber').removeClass('hide');
                thisView.find('.myreturn-form').children('.giftcardpassword').addClass('hide');
            }
        });

        thisView.find('.btn-confirmRecharage').on('click', function () {
            var payType = thisView.find('.rechargeTypeContent').find('input:checked').val();
            var recharageVal = thisView.find('input[name="rechargeNumber"]').val();

            switch (payType) {
                case "alipay":
                    self.alipayFunc(recharageVal, pays);
                    break;
                case "wxpay":
                    self.wxpayFunc(recharageVal, pays);
                    break;
                case "giftCard":
                    self.useGiftCard();
                    break;
            }
        });

        thisView.find("#giftcardpassword input").on('keyup', function () {
            $$(this).val($$(this).val().replace(/(^\s*)|(\s*$$)/g, ""));
            if ($$(this).val().length >= 4){
                if(isIos && cb.config && cb.config.fromWechat ){
                    if($$(this).val().length > 4){
                        $$(this).val($$(this).val().substring(0,4));
                    }
                }else{
                    $$(this).next().focus();
                }
            }
        });
    };
    view.prototype.getPhoneType = function (){
        var pattern_phone = new RegExp("iPhone","i");
        var pattern_android = new RegExp("android","i");
        var userAgent = navigator.userAgent.toLowerCase();
        var isAndroid = pattern_android.test(userAgent);
        var isIphone = pattern_phone.test(userAgent);
        var phoneType="ios";
        if(isAndroid){
            phoneType="android"
        }else if(isIphone){
            phoneType="ios"
        }
        return phoneType;
    }
    view.prototype.alipayFunc = function (val, pays) {
        var self = this;
        this.proxy.recharge({ iType: '102', fSum: val }, function (err, suc) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            var pData = {
                cardDetailId: suc.id,
                paytypecode: 'alipay',
                payBackUrl: '/member/mystoragecard?device='+self.device+'&size=M&view=memberView',
                iAmount: suc.fSum
            };
            if (window.plus) {
                pData.trade_type = 'ALIPAYMOBILE';
                self.proxy.bulidPaymentByCardDetailId(pData, function (err, suc) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    };
                    plus.payment.request(pays['alipay'], suc, function (result) {
                        myApp.toast('充值成功', 'success').show(true);
                        myApp.mainView.router.back();
                    }, function (e) {
                        console.log("----- 支付失败 -----");
                        console.log("[" + e.code + "]：" + e.message);
                        myApp.toast('支付失败', 'error').show(true);
                        switch (e.code) {
                            case '62000':
                                myApp.toast('客户端未安装支付通道依赖的服务', 'error').show(true);
                                break;
                            case '62001':
                                myApp.toast('用户取消支付操作', 'error').show(true);
                                break;
                            case '62002':
                                myApp.toast('此设备不支持支付', 'error').show(true);
                                break;
                            case '62003':
                                myApp.toast('数据格式错误', 'error').show(true);
                                break;
                            case '62004':
                                myApp.toast('支付账号状态错误', 'error').show(true);
                                break;
                            case '62005':
                                myApp.toast('订单信息错误', 'error').show(true);
                                break;
                            case '62006':
                                myApp.toast('支付操作内部错误', 'error').show(true);
                                break;
                            case '62007':
                                myApp.toast('支付服务器错误', 'error').show(true);
                                break;
                            case '62008':
                                myApp.toast('网络问题引起的错误', 'error').show(true);
                                break;
                            case '62009':
                                myApp.toast('网络问题引起的错误', 'error').show(true);
                                break;
                        }
                    })
                });
            }
            else {
                pData.trade_type = 'ALIPAYWAP';
                self.proxy.bulidPaymentByCardDetailId(pData, function (err, suc) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    };
                    myApp.hideIndicator();
                    var div = document.createElement('div');
                    div.setAttribute('style', 'display:none');
                    div.setAttribute('id', 'recharge-payment');

                    $$(document).find('body').append(div);
                    $$('#recharge-payment').append(suc).children('form').submit();
                });
            }
        });
    };

    view.prototype.wxpayFunc = function (val, pays) {
        var self = this;
        if (window.plus) {
            myApp.toast('微信App支付开发中', 'tips').show(true);
        }
        else if (typeof WeixinJSBridge != "undefined") {
            //myApp.toast('微信支付开发中', 'tips').show(true);
            //return;
            this.proxy.recharge({ iType: '104', fSum: val }, function (err, suc) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                    return;
                }
                var pData = {
                    cardDetailId: suc.id,
                    paytypecode: 'weixin',
                    trade_type: 'JSAPI',
                    payBackUrl: '/member/mystoragecard?device='+self.device+'&size=M&view=memberView',
                    iAmount: suc.fSum
                };
                self.proxy.bulidPaymentByCardDetailId(pData, function (err, suc) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    };
                    if (typeof suc == 'string') {
                        var paymentParam = JSON.parse(suc);
                        var callback = function () {
                            myApp.mainView.router.back();
                        };
                        self.wxpaymentFunc(paymentParam, callback);
                    }
                });
            });
        }
    };

    view.prototype.wxpaymentFunc = function (data, callback) {
        function onBridgeReady() {
            WeixinJSBridge.invoke(
                'getBrandWCPayRequest', data,
                function (res) {
                    if (res.err_msg == "get_brand_wcpay_request:ok") {
                        if (callback)
                            callback();
                    }
                }
            );
        }
        if (typeof WeixinJSBridge != "undefined") {
            onBridgeReady();
        }
    };

    view.prototype.checkServices = function (pm) {
        if (window.plus) {
            if (!pm.serviceReady) {
                var txt = null;
                switch (pm.id) {
                    case "alipay":
                        txt = "检测到系统未安装“支付宝快捷支付服务”，无法完成支付操作，是否立即安装？";
                        break;
                    case "wxpay":
                        txt = "系统未安装“" + pm.description + "”服务，无法完成支付，是否立即安装？";
                        break;
                }
                plus.nativeUI.confirm(txt, function (e) {
                    if (e.index == 0) {
                        pm.installService();
                    }
                }, pm.description);
            }
        }
    };

    view.prototype.useGiftCard = function () {
        var self = this;
        var giftpwdStr = '';
        self.getView().find("#giftcardpassword input").each(function (index) {
            giftpwdStr += $$(this).val().replace(/(^\s*)|(\s*$$)/g, "");
        });
        if (!giftpwdStr) {
            myApp.toast("礼品卡密码不能为空", 'tips').show(true);
            return;
        }
        else if (giftpwdStr.length < 16) {
            myApp.toast("礼品卡密码为16位字符", 'tips').show(true);
            return;
        }
        this.proxy.checkGiftCard({ password: giftpwdStr }, function (err, suc) {
            if (err) {
                myApp.toast(err.message, "error").show(true);
                return;
            };
            if (suc.result) {
                myApp.confirm(" 礼品卡可充值金额为 : " + suc.reduceAmount + " 元，是否确认充值？", "提示", function (e) {
                    self.proxy.depositByGiftCard({ password: giftpwdStr }, function (cerr, cresult) {
                        if (cerr) {
                            myApp.toast(cerr.message, "error").show(true);
                            return;
                        }
                        if (cresult.result) {
                            myApp.toast('充值成功', 'success').show(true);
                            myApp.mainView.router.back({ query: { refreshPage: true } });
                        }
                        else
                            myApp.toast('充值失败', 'error').show(true);
                    });
                });
            } else {
                myApp.toast("礼品卡密码无效", 'tips').show(true);
            };
        })
    };
    return view;
});