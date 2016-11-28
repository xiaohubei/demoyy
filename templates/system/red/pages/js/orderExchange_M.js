cb.views.register('ConfirmExchangeOrderController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function (views) {
        var self = this;
        var thisView = this.getView();
        var query = this.getViewData();
        var pageData = this.getView()[0].f7PageData.query;

        myApp.hideToolbar('.toolbar.homeNavBar');
        var orderProxy = cb.rest.DynamicProxy.create({
            getOrderMode: {
                url: 'client/Orders/getNewOrder', method: 'GET', options: { token: true, refresh: true, mask: true }
            },
            submitOrder: {
                url: 'client/Orders/submitOrder', method: 'POST', options: { token: true }
            }
        });
        orderProxy.getOrderMode({}, function (err, result) {
            if (err) {
                if (typeof err == 'string') JSON.parse(err);
                //myApp.toast(err.message, 'error').show(true);
                myApp.mainView.router.back();
                return;
            }
            var accountInfo = cb.util.localStorage.getItem('accountInfo');
            if (accountInfo && typeof accountInfo == 'string')
                accountInfo = JSON.parse(accountInfo);

            if (accountInfo.iTotalPoints < result.pointNum) {
                myApp.toast('您的积分不足，不能兑换', 'tips').show(true);
                myApp.mainView.router.back();
                return;
            }

            var isExchangePro = false;
            var jfProducts = result.oOrderDetails.filter(function (item) {
                return item.productAttribute && item.productAttribute == 2;
            });
            if (jfProducts.length > 0)
                isExchangePro = true;

            //提交订单数据
            var commitData = result;
            thisView.find('.totalPriceContainer').html(result.pointNum);

            //编译  渲染 模板
            //地址信息
            var addressdata = self.GetInitData(result, 'address');
            if (!cb.cache.get('address')) {
                if (addressdata) {
                    thisView.find('.confirmOrderContent .addressContent').html(self.render($$('#addrListTpl').html(), { address: addressdata }));
                    cb.cache.set('address', addressdata);
                }
                else
                    thisView.find('.confirmOrderContent .addressContent').html(self.render($$('#addrListTpl').html(), { address: null }));
            }
            else
                thisView.find('.confirmOrderContent .addressContent').html(self.render($$('#addrListTpl').html(), { address: cb.cache.get('address') }));

            //初始化清单
            var productDetailData = {
                detailData: result.oOrderDetails
            };

            var totaliQuantity = 0;
            for (var index = 0; index < result.oOrderDetails.length; index++) {
                totaliQuantity += result.oOrderDetails[index].iQuantity;
            }
            thisView.find('.productDetailContainer-title').html('商品清单（' + productDetailData.detailData.length + '）');
            thisView.find('.productDetailContainer').html(self.render($$('#productDetailTpl').html(), productDetailData));

            thisView.find('.input-orderMsg-container').on('keydown', function (e) {
                var code = e.keyCode;
                if (code != 8 && $$(this).val().length >= 50) {
                    myApp.toast('最多只能输入50个字', 'tips').show(true);
                    $$(this).val($$(this).val().substr(0, 50));
                }
            });
            cb.util.inputKeyboard(thisView);
            thisView.find('.confirmOrderSaveBtn').on('click', function () {
                commitData.iMemeberId = result.oMemeber.id;
                commitData.iSubmiterId = result.oMemeber.id;
                if (cb.cache.get('address')) {
                    commitData.iMemeberAddress = cb.cache.get('address').id;
                    commitData.cReceiveAddress = cb.cache.get('address').cAddress;
                    commitData.cReceiver = cb.cache.get('address').cReceiver;
                    commitData.cRegion = cb.cache.get('address').cRegion;
                    commitData.cReceiveMobile = cb.cache.get('address').cMobile;
                    commitData.cReceiveTelePhone = cb.cache.get('address').cTelePhone;
                    commitData.cReceiveZipCode = cb.cache.get('address').cZipCode;
                }
                else {
                    myApp.toast('请选择收货地址', 'tips').show(true);
                    return;
                }
                if (cb.cache.get('ExpressType')) {
                    commitData.cDeliverType = cb.cache.get('ExpressType').id;
                    if (commitData.cDeliverType == 'PICKUP')
                        commitData.storeId = cb.cache.get('ExpressType').storeId;
                }
                else
                    commitData.cDeliverType = 'EMS';

                commitData.cPayType = 'FIRSTPAY';
                commitData.cClientMemo = thisView.find('.input-orderMsg-container').val();
                commitData.promotionCode = cb.rest.AppContext.inviteCode;
                commitData.promoter = cb.rest.AppContext.promotCode;

                myApp.showPreloader('订单提交中，请稍后...');
                orderProxy.submitOrder({ neworder: commitData }, function (err, subResult) {
                    myApp.hidePreloader();
                    if (err) {
                        if (typeof err == 'string')
                            err = JSON.parse(err);
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    }
                    cb.cache.clear();
                    var modalText = '<div class="common-tips-content orderSuccess-tips">' +
                            '<div class="tips-content"><div>订单编号：<span>' + subResult.cOrderNo + '</span></div><div class="sp-money">应付积分：<span>' + commitData.pointNum + '</span></div><div class="">支付方式：<span>积分兑换</span></div></div>' +
                            '<div class="tips-manage"><span>您还可以</span></div><div class="button-row">';
                    modalText += '<span><i class="icon icon-forOrder"></i>查看订单</span><span><i class="icon icon-goon"></i>随便逛逛</span></div></div>';
                    myApp.modal({
                        title: '<div class="common-tips-title success-tips">' +
                            '<span>订单提交成功！</span>' +
                            '</div>',
                        text: modalText
                    });
                    $$('div.modal .common-tips-content.orderSuccess-tips').find('.button-row').children('span').on('click', function () {
                        myApp.closeModal();

                        var i = $$(this).find("i");
                        if (i.hasClass('icon-forOrder')) {
                            myApp.mainView.router.loadPage({
                                url: 'member/orderdetail?orderId=' + subResult.cOrderNo,
                                reload: true
                            });
                        }
                        else if (i.hasClass('icon-goon')) {
                            // 刷新购物车
                            //myApp.mainView.router.refreshPreviousPage();
                            // 刷新购物车数量
                            update.cartIcon();
                            myApp.mainView.router.loadPage({
                                url: './list',
                                reload: true
                            });
                        }
                    });
                });
            });
        });

        //选择项目点击事件
        thisView.find('.confirmOrderContent .addressContent').on('click', function () {
            var key = $$(this).attr('data-key');
            var data = cb.cache.get(key);
            var link = data ? $$(this).attr('data-link') : 'member/addr-new?newAddress=false';
            myApp.mainView.router.loadPage({
                url: link,
                query: data
            });
        });
    }

    view.prototype.GetInitData = function (val, type) {
        var o = {};
        switch (type) {
            case "address":
                if (!val.oMemeber.memberAddress)
                    return null;
                var defaultAddress = val.oMemeber.memberAddress.filter(function (item) {
                    return item.bDefault == true && item.isForbidden == false;
                });
                if (defaultAddress.length)
                    o = defaultAddress[0];
                else if (val.oMemeber.memberAddress.length > 0) {
                    o = val.oMemeber.memberAddress.filter(function (item) {
                        return item.isForbidden == false;
                    }).length ? val.oMemeber.memberAddress.filter(function (item) {
                        return item.isForbidden == false;
                    })[0] : null;
                }
                if (o)
                    o.select = true;
                break;
        }
        return o;
    };

    view.prototype.afterFromPageBack = function (page) {
        var self = this;
        var fromPageName = page.fromPage.name;
        var query = page.query;

        switch (fromPageName) {
            case "addrList"://监听 地址信息维护
                if (query && query.addressData) {
                    self.getView().find('.confirmOrderContent .addressContent').html(self.render($$('#addrListTpl').html(), { address: query.addressData }));
                    cb.cache.set('address', query.addressData);

                    if (!query.addressData.isCashOnDelivery) {
                        cb.cache.set('payType', { id: 'FIRSTPAY', name: '在线支付' });
                        self.getView().find('.confirmList-payType .choosePayType').html('在线支付');
                    }
                }
                break;
            case "distribution"://监听 配送方式信息维护
                if (false && query && query.selectValue) {
                    var expressTypeData = query.selectValue;
                    self.getView().find('.confirmList-payType .distributionContent').find('.chooseExpressType').html(expressTypeData.name);
                    cb.cache.set('ExpressType', expressTypeData);
                    cb.cache.set('storeDetail', null);
                    if (expressTypeData.id != "EMS")
                        self.getView().find('.confirmList-payType .storeContent').removeClass('hide').find('.storeNameContainer').html(expressTypeData.storeName);
                    else
                        self.getView().find('.confirmList-payType .storeContent').addClass('hide');

                    if (cb.cache.get('ExpressType') && cb.cache.get('ExpressType').id == 'PICKUP') {
                        self.getView().find('.confirmList-rabeta .item-after.expressContainer').html('包邮');
                        self.getView().find('.summaryContainer .sp-expressContainer').html('￥0.00');
                    }
                    self.getView().find('.confirmList-rabeta .item-after.expressContainer').trigger('valueChange');
                }
                break;
            case "chooseStore"://监听 自提点信息维护
                if (false && query && query.storeData) {
                    var storeInfo = query.storeData;
                    self.getView().find('.confirmList-payType .storeContent').find('.storeNameContainer').html(storeInfo.name);
                    var cb_store = cb.cache.get('ExpressType');
                    cb_store.storeId = storeInfo.id;
                    cb_store.storeName = storeInfo.name;
                    cb_store.storeAddress = {
                        province: storeInfo.province,
                        city: storeInfo.city,
                        area: storeInfo.area
                    };
                    cb.cache.set('ExpressType', cb_store);
                }
                break;
        }
    };
    return view;
});