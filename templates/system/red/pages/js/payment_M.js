cb.views.register('paymentViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function (views) {
        var self = this;
        var thisView = this.getView();
        var query = this.getViewData().query;

        self.proxy = cb.rest.DynamicProxy.create({
            getDetail: { url: 'client/Orders/getDetail', method: 'GET', options: { token: true, mask: true } },
            buildPayment: { url: 'client/Pay/buildPayment', method: 'POST', options: { token: true, mask: true } },
            loopVirtualRequest: { url: 'client/Pay/loopVirtualRequest', method: 'GET' },
            getoStorageCards: { url: 'client/orders/getStorageCards', method: 'GET', options: { token: true, mask: true } },
            getEnablePayType: { url: 'client/Pays/getEnablePayTypeList', method: 'GET', options: { token: true, mask: true } }
        });

        self.proxy.getEnablePayType(function (err, data) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            for (var i = 0; i < data.length; i++) {
                if (data[i].isenable) {
                    if (typeof WeixinJSBridge == "undefined") {
                        if (data[i].paytypecode == 'weixin' && !window.plus)
                            data[i].isenable = false;
                    }
                    else if (typeof WeixinJSBridge != "undefined") {
                        if (data[i].paytypecode == 'alipay')
                            data[i].isenable = false;
                    }
                    if (data[i].paytypecode == 'chanpay')
                        data[i].isenable = false;
                }
            }
            thisView.find('.payment-list').children('ul').html(self.render($$('#payTypeTpl').html(), { data: data }));
        });

        if (query.cOrderNo) {
            //支付通道对象列表
            var pays = {};
            if (window.plus) {
                //检查支付通道
                var checkServices = function (pm) {
                    if (pm && !pm.serviceReady) {
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
            self.proxy.getDetail({ cOrderNo: query.cOrderNo }, function (oerr, pageData) {
                if (oerr) {
                    myApp.toast(oerr.message, 'error').show(true);
                    return;
                }
                thisView.find('.payment-top.order-desc-container').html('<p>订单编号：' + pageData.cOrderNo + '</p><p class="hide">订单总金额：￥' + pageData.fTotalMoney + '</p><p>支付方式：在线支付</p><p>应付金额：<span class="col-orange">￥' + parseFloat(pageData.fPayMoney).toFixed(2) + '</span></p>');
                if (pageData.oOrderDetails[0].isGiftCard)
                    thisView.find('.payment-list').children('ul').find('li[data-type="storagecard"]').remove();

                thisView.find('.button.btn-order-payment').on('click', function () {
                    var payType = thisView.find('.payment-list').find('input:checked').val();
                    if (!payType) {
                        myApp.toast('请选择付款方式', 'tips').show(true);
                        return;
                    }
                    switch (payType) {
                        case "alipay":
                            if (window.plus) {
                                checkServices(pays[payType]);
                                if (pays[payType].serviceReady)
                                    self.appaymentFunc(pays, payType, pageData, self.proxy);
                            }
                            else {
                                var payParams = {
                                    cOrderNo: pageData.cOrderNo,
                                    paytype: 1,
                                    remark: "支付宝手机支付",
                                    paytypecode: 'alipay',
                                    payBackUrl: '/member/orderdetail?orderId=',//必传  订单详细地址
                                    trade_type: "ALIPAYWAP"//必传 
                                };
                                self.proxy.buildPayment(payParams, function (perr, response) {
                                    myApp.hidePreloader();
                                    if (perr) {
                                        myApp.toast(perr.message, 'error').show(true);
                                        return;
                                    }
                                    var div = document.createElement('div');
                                    div.setAttribute('style', 'display:none');
                                    div.setAttribute('id', 'form-payment');

                                    $$(document).find('body').append(div);
                                    $$('#form-payment').append(response).children('form').submit();
                                });
                            }
                            break;
                        case "weixin":
                            if (window.plus) {
                                checkServices(pays['wxpay']);
                                if (pays['wxpay'].serviceReady)
                                    self.appaymentFunc(pays, 'wxpay', pageData, self.proxy);
                            }
                            else
                                self.wxpaymentCenterFunc(pageData);
                            break;
                        case "storagecard":
                            self.proxy.getoStorageCards(function (err, data) {
                                if (err) {
                                    myApp.toast('获取储值卡信息失败', 'error').show(true);
                                    return;
                                }
                                if (parseFloat(pageData.fPayMoney) <= parseFloat(data.fBalance)) {
                                    myApp.confirm('是否确定使用储值卡余额支付' + pageData.fPayMoney.toFixed(2) + '元？', '提示信息', function () {
                                        var payParams = {
                                            cOrderNo: pageData.cOrderNo,
                                            paytype: 1,
                                            remark: "订单支付",
                                            paytypecode: 'storagecard',
                                            trade_type: 'STORAGE'
                                        };
                                        self.proxy.buildPayment(payParams, function (perr, response) {
                                            if (perr) {
                                                myApp.toast(perr.message, 'error').show(true);
                                                return;
                                            }
                                            myApp.modal({
                                                title: '<div class="common-tips-title success-tips">' +
                                                    '<span>订单支付成功！</span>' +
                                                    '</div>',
                                                text: '<div class="common-tips-content paySuccess-tips">' +
                                                    '<div class="tips-content"><div>订单编号：<span>' + pageData.cOrderNo + '</span></div><div class="sp-money">已付金额：<span>￥' + pageData.fPayMoney + '</span></div></div>' +
                                                    '<div class="tips-manage"><span>您还可以</span></div><div class="button-row">' +
                                                    '<span><i class="icon icon-forOrder"></i>查看订单</span><span><i class="icon icon-goon"></i>随便逛逛</span></div></div>'
                                            });
                                            $$('div.modal .common-tips-content.paySuccess-tips').find('.button-row').children('span').on('click', function () {
                                                myApp.closeModal();
                                                var i = $$(this).find("i");
                                                if (i.hasClass('icon-forOrder')) {
                                                    myApp.mainView.router.loadPage({
                                                        url: 'member/orderdetail?orderId=' + pageData.cOrderNo
                                                    });
                                                }
                                                else if (i.hasClass('icon-goon')) {
                                                    //$$('#homeView').trigger('show');
                                                    //myApp.showToolbar('.homeNavBar');
                                                    myApp.mainView.router.loadPage({
                                                        url: './list',
                                                        reload: true
                                                    });
                                                }
                                            });
                                        });
                                    });
                                }
                                else
                                    myApp.toast('储值卡余额不足', 'tips').show(true);
                            });
                            break;
                    }
                });
            });
        }
    };

    view.prototype.wxpaymentCenterFunc = function (pageData) {
        var self = this;
        var payParams = {
            cOrderNo: pageData.cOrderNo,
            paytype: 1,
            remark: "微信支付",
            paytypecode: 'weixin',
            trade_type: 'NATIVE'
        };
        if (typeof WeixinJSBridge == "undefined") {
            myApp.showPreloader('支付加载中...');
            payParams.payBackUrl = "www.baidu.com";
            self.proxy.buildPayment(payParams, function (err, response) {
                myApp.hidePreloader();
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                    return;
                }
                var url = response;
                //参数1表示图像大小，取值范围1-10；参数2表示质量，取值范围'L','M','Q','H'
                var qr = qrcode(10, 'M');
                qr.addData(url);
                qr.make();
                var dom = document.createElement('DIV');
                $$(dom).addClass('weixin-pay');
                dom.innerHTML = qr.createImgTag();

                myApp.modal({
                    title: '扫码支付',
                    text: '<div class="payment-tips">距离二维码过期还有<span style="color:red;">60</span>秒</div>',
                    afterText: '<div class="swiper-container" style="width: auto; margin:5px -15px -15px">' + dom.innerHTML + '</div>',
                    buttons: [
                      {
                          text: '关闭',
                          bold: true
                      },
                      {
                          text: '刷新',
                          bold: true,
                          onClick: function () {
                              thisView.find('.button.btn-order-payment').trigger('click');
                          }
                      }
                    ]
                });

                var timeSpan = 59;
                var tipsContainer = $$('.modal.modal-in .modal-text').children('.payment-tips');
                if (self.payInterval)
                    clearInterval(self.payInterval);
                self.payInterval = setInterval(function () {
                    if (timeSpan >= 0) {
                        tipsContainer.html('距离二维码过期还有<span style="color:red;">' + timeSpan + '</span>秒');
                        timeSpan--;
                    }
                    else {
                        clearInterval(self.payInterval);
                        myApp.closeModal();
                        myApp.toast('支付二维码已过期', 'tips').show(true);
                    }
                }, 1000);
            });
            self.processLoopVirtualRequest(self.proxy, pageData.cOrderNo);
        } else {
            payParams.trade_type = 'JSAPI';
            self.proxy.buildPayment(payParams, function (err, response) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                    return;
                }
                if (typeof response == 'string') {
                    var paymentParam = JSON.parse(response);
                    self.wxpaymentFunc(paymentParam, function () {
                        myApp.modal({
                            title: '<div class="common-tips-title success-tips">' +
                                '<span>订单支付成功！</span>' +
                                '</div>',
                            text: '<div class="common-tips-content wxpaySuccess-tips">' +
                                '<div class="tips-content"><div>订单编号：<span>' + pageData.cOrderNo + '</span></div><div class="sp-money">已付金额：<span>￥' + pageData.fPayMoney + '</span></div></div>' +
                                '<div class="tips-manage"><span>您还可以</span></div><div class="button-row">' +
                                '<span><i class="icon icon-forOrder"></i>查看订单</span><span><i class="icon icon-goon"></i>随便逛逛</span></div></div>'
                        });
                        $$('div.modal .common-tips-content.wxpaySuccess-tips').find('.button-row').children('span').on('click', function () {
                            myApp.closeModal();
                            var i = $$(this).find("i");
                            if (i.hasClass('icon-forOrder')) {
                                myApp.mainView.router.loadPage({
                                    url: 'member/orderdetail?orderId=' + pageData.cOrderNo
                                });
                            }
                            else if (i.hasClass('icon-goon')) {
                                $$('#homeView').trigger('show');
                                myApp.showToolbar('.homeNavBar');
                            }
                        });
                    });
                }
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

    view.prototype.processLoopVirtualRequest = function (proxy, cOrderNo) {
        var self = this;
        var loopTimeout = self._get_data('loopTimeout');
        if (loopTimeout) clearTimeout(loopTimeout);
        loopTimeout = setTimeout(function () {
            proxy.loopVirtualRequest({ orderId: cOrderNo }, function (err, result) {
                if (err) {
                    self.processLoopVirtualRequest(proxy, cOrderNo);
                    return;
                }
                myApp.closeModal();
                myApp.mainView.router.loadPage({
                    url: 'member/orderdetail?orderId=' + cOrderNo
                });
            });
        }, 3000);
        self._set_data('loopTimeout', loopTimeout);
    };

    view.prototype.appaymentFunc = function (pays, payType, orderData, proxy) {
        if (window.plus) {
            var payFunc = function (type) {
                var w = plus.nativeUI.showWaiting();
                var payParams = {
                    cOrderNo: orderData.cOrderNo,
                    paytype:1,
                    payBackUrl: ''//必传  订单详细地址
                };
                if (type == 'wxpay') {
                    payParams.remark = '微信app支付';
                    payParams.paytypecode = 'weixin';
                    payParams.trade_type = "APP";//必传
                }
                else if (type == 'alipay') {
                    payParams.remark = '支付宝App支付';
                    payParams.paytypecode = 'alipay';
                    payParams.trade_type = "ALIPAYMOBILE";//必传
                }
                proxy.buildPayment(payParams, function (err, data) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    }
                    w.close();
                    console.log(data);
                    var order = data;
                    plus.payment.request(pays[type], order, function (result) {
                        myApp.modal({
                            title: '<div class="common-tips-title success-tips">' +
                                '<span>订单支付成功！</span>' +
                                '</div>',
                            text: '<div class="common-tips-content paySuccess-tips">' +
                                '<div class="tips-content"><div>订单编号：<span>' + orderData.cOrderNo + '</span></div><div class="sp-money">已付金额：<span>￥' + orderData.fPayMoney + '</span></div></div>' +
                                '<div class="tips-manage"><span>您还可以</span></div><div class="button-row">' +
                                '<span><i class="icon icon-forOrder"></i>查看订单</span><span><i class="icon icon-goon"></i>随便逛逛</span></div></div>'
                        });
                        $$('div.modal .common-tips-content.paySuccess-tips').find('.button-row').children('span').on('click', function () {
                            myApp.closeModal();
                            var i = $$(this).find("i");
                            if (i.hasClass('icon-forOrder')) {
                                myApp.mainView.router.loadPage({
                                    url: 'member/orderdetail?orderId=' + orderData.cOrderNo
                                });
                            }
                            else if (i.hasClass('icon-goon')) {
                                $$('#homeView').trigger('show');
                                myApp.showToolbar('.homeNavBar');
                            }
                        });
                    }, function (e) {
                        console.log("----- 支付失败 -----");
                        console.log("[" + e.code + "]：" + e.message);
                        myApp.toast('支付失败', 'error').show(true);
                        if (type == 'alipay') {
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
                        }
                        else if (type == 'wxpay') {
                            switch (e.code) {
                                case '-1':
                                    myApp.toast('一般错误', 'error').show(true);
                                    break;
                                case '-2':
                                    myApp.toast('用户取消支付操作', 'error').show(true);
                                    break;
                                case '-3':
                                    myApp.toast('发送失败', 'error').show(true);
                                    break;
                                case '-4':
                                    myApp.toast('认证被否决', 'error').show(true);
                                    break;
                                case '-5':
                                    myApp.toast('不支持的错误', 'error').show(true);
                                    break;
                            }
                        }
                    });
                });
            };
            if (pays[payType])
                payFunc(payType);
        }
        else
            myApp.toast('支付初始化失败', 'tips').show(true);
    };
    return view;
});