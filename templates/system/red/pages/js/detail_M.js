cb.views.register('DetailViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.isable = true;
    view.prototype.isGeneralProduct = true;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getData: {
            url: 'client/Products/index',
            method: 'GET',
            options: {
                token: true,
                mask: true
            }
        },
        getEvaluation: {
            url: 'member/Comments/query',
            method: 'get',
            options: {
                token: true
            }
        },
        //获取商品信息
        getProductsByIds: {
            url: 'client/Products/getProductsByIds',
            method: 'POST'
        },
        getProductEvaluate: {
            url: 'member/Comments/getProductEvaluate',
            method: 'get',
            options: {
                token: true
            }
        },
        //添加购物车
        addcart: {
            //url: 'client/shoppingcarts/add',
            url: 'client/ShoppingCarts/addCarts',
            method: 'post',
            options: {
                token: true,
                mask: true,
                autoLogin: false
            }
        },
        addProductFavorite: {
            url: 'client/ProductFavorites/addProductFavorite',
            method: 'POST',
            options: {
                token: true
            }
        },
        getProductFavorites: {
            url: 'client/ProductFavorites/getProductFavorites',
            method: 'POST',
            options: {
                token: true
            }
        },
        //获取组合销售数据
        getCombinSaleList: {
            url: 'promotion/CombinationSalesService/getCombinSaleList',
            method: 'POST',
            options: {
                token: true,
                autoLogin: false
            }
        },
        getPrice: {
            url: 'promotion/ProductPreferentialService/getProductNewPrice',
            method: 'POST',
            options: {
                token: true
            }
        },
        nowToOrder: {
            url: 'client/ShoppingCarts/orderNow',
            method: 'post',
            options: {
                token: true,
                autoLogin: false
            }
        },
        goTOSettle: {
            url: 'client/Orders/GenerateOrderByShoppingCart',
            method: 'POST',
            options: {
                token: true
            }
        },
        getProductsByIds: {
            url: 'client/Products/getProductsByIds',
            method: 'POST'
        },
        addProductFavorite: {
            url: 'client/ProductFavorites/addProductFavorite',
            method: 'POST',
            options: {
                token: true,
                autoLogin: false
            }
        }
    });
    view.prototype.once = function () {
        var self = this;
        var thisView = this.getView();
        thisView.find('.icon.icon-cart').on('click', function () {
            myApp.mainView.router.load({
                url: 'member/cart'
            })
        });
        thisView.find('.toolbar .producttoolbar .go-cart,.toolbar .producttoolbar .now-buy').on('click', function () {
            var data = self._get_data('choseItems');
            var product = self.productInfo;
            var sku = product.lsProductSkus[0];
            if (product.lsSpecs.length == 0) {
                if (sku.lInventoryCount > 0) {
                    //加入购物车
                    if (product.canPurchaseCount != 0) {
                        self._set_data('choseItems', {
                            skuid: sku.id,
                            quantity: 1
                        });
                        self.dealAddCart(thisView, $$(this), product);
                    } else {
                        myApp.toast('限购数量为0 无法购买', 'tips').show(true);
                    }
                } else {
                    myApp.toast('库存为0 无法购买', 'tips').show(true);
                }
            } else {
                if (data.choseItem && data.choseItem.length) {
                    var speciId = "";
                    for (var i = 0; i < data.choseItem.length; i++) {
                        if (i == 0) {
                            speciId = data.choseItem[i].id
                        } else {
                            speciId = speciId + ";" + data.choseItem[i].id
                        }
                    }
                    for (var j = 0; j < product.lsProductSkus.length; j++) {
                        if (speciId == product.lsProductSkus[j].cSpecIds) {
                            sku = product.lsProductSkus[j];
                        }
                    }
                    if (sku.lInventoryCount > 0) {
                        if (product.canPurchaseCount != 0) {
                            self.dealAddCart(thisView, $$(this), product);
                        } else {
                            myApp.toast('限购数量为0 无法购买', 'tips').show(true);
                        }
                    } else {
                        myApp.toast('库存为0 无法购买', 'tips').show(true);
                    }

                } else {
                    if (sku.lInventoryCount > 0) {
                        if (product.canPurchaseCount != 0) {
                            self.dealAddCart(thisView, $$(this), product);
                        } else {
                            myApp.toast('限购数量为0 无法购买', 'tips').show(true);
                        }
                    } else {
                        myApp.toast('库存为0 无法购买', 'tips').show(true);
                    }

                }

            }
        });
        thisView.find('.toolbar .icon-collection').parent('div').click(function () {        
            if (thisView.find('.toolbar .icon-collection').hasClass('active')) {
                myApp.toast('该商品已经收藏', 'error').show(true);
                return;
            }
            if (!view.prototype.isable) {
                myApp.toast('收藏失败，您查看的宝贝不存在', 'error').show(true);
            } else {
                var id = self.getQuery().goods_id;
                self.proxy.addProductFavorite({
                    ids: [id]
                }, function (err, result) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                    } else {
                        thisView.find('.toolbar .icon-collection').addClass('active');
                        thisView.find('p.collectionName').text("已收藏");
                        myApp.toast('收藏成功', 'success').show(true);
                    }
                });
            }

        });
    };
    view.prototype.dealAddCart = function (thisView, target, product) {
        var self = this;
        var data = this._get_data('choseItems');
        if (data.skuid) { //加入购物车
            var item = {
                iSKUId: data.skuid,
                iQuantity: data.quantity || 1,
                iProductId: this.getQuery().goods_id
            };
            if (target.hasClass('go-cart') || target.hasClass('join-cart')) {
                this.proxy.addcart({
                    items: cb.data.JsonSerializer.serialize([item])
                }, function (err, result) {
                    if (err && err.code === 900) {
                        cb.route.redirectLoginPage(function () {
                            if ($$('.popup-prodSUK').hasClass('modal-in'))
                                myApp.closeModal('.popup-prodSUK');
                            $$('.popup-overlay').removeClass('modal-overlay-visible');
                            myApp.mainView.router.refreshPage();
                            $$('.popup-prodSUK .content-block').remove();
                        });
                        return;
                    }
                    if (result) {
                        update.cartIcon();
                        if ($$('.popup-prodSUK').hasClass('modal-in'))
                            myApp.closeModal('.popup-prodSUK');
                        $$('.popup-overlay').removeClass('modal-overlay-visible');
                        myApp.toast('加入购物车成功', 'success').show(true);
                        $$('.popup-prodSUK .content-block').remove();
                        var skuResul = self._get_data('skuResult');
                        var maxCount = self._get_data('maxCount');
                        if (self.productInfo.canPurchaseCount) {
                            self.productInfo.canPurchaseCount = self.productInfo.canPurchaseCount - item.iQuantity;
                        }
                    } else {
                        myApp.toast(err.message, 'error').show(true);
                    }
                });
            } else { //立即订购
                this.proxy.nowToOrder({
                    item: item
                }, function (err, result) {
                    if (err && err.code === 900) {
                        cb.route.redirectLoginPage(function () {
                            if ($$('.popup-prodSUK').hasClass('modal-in'))
                                myApp.closeModal('.popup-prodSUK');
                            $$('.popup-overlay').removeClass('modal-overlay-visible');
                            myApp.mainView.router.refreshPage();
                            $$('.popup-prodSUK .content-block').remove();
                        });
                        return;
                    }
                    if (result) {
                        var shopping = {
                            items: [{
                                iProductId: item.iProductId,
                                iQuantity: item.iQuantity || 1,
                                iSKUId: item.iSKUId,
                                id: result
                            }]
                        }
                        self.proxy.goTOSettle(shopping, function (err, result) {
                            if (err) {
                                myApp.toast(err.message, 'error').show(true);
                                return;
                            } else {
                                update.cartIcon();
                                if ($$('.popup-prodSUK').hasClass('modal-in'))
                                    myApp.closeModal('.popup-prodSUK');
                                $$('.popup-overlay').removeClass('modal-overlay-visible');
                                if (self.isGeneralProduct) {
                                    myApp.mainView.loadPage("order");
                                } else {
                                    var iTotalPoints = JSON.parse(cb.util.localStorage.getItem('accountInfo')).iTotalPoints;
                                    if (product.salePoints > iTotalPoints) {
                                        myApp.toast('积分不足，无法进行兑换', 'tips').show(true);
                                        return
                                    } else {
                                        myApp.mainView.loadPage("orderExchange");
                                    }

                                }
                            }
                        });
                    } else {
                        myApp.toast(err.message, 'error').show(true);
                    }
                });
            }
        } else {
            this.showSku(thisView, target);
        }
    }
    view.prototype.getMenuShareContent = function (result) {
        var appContext = cb.rest.AppContext;
        var link = cb.rest.AppContext.serviceUrl + '/detail?wid=' + appContext.wid;
        if (appContext.shareparentid)
            link += '&shareparentid=' + appContext.shareparentid;
        var query = this.getQuery();
        for (var attr in query) {
            if (attr === 'size' || attr === 'device' || attr === 'token' || attr === 'view' || attr === 'wid') continue;
            link += '&' + attr + '=' + query[attr];
        }
        var items = [];
        items.push(result.cName);
        if (result.productAttribute === 2) {
            items.push(result.salePoints + '积分');
        } else {
            items.push('￥' + result.fSalePrice);
        }
        var desc = items.join('\r\n');
        var imgUrl = cb.util.adjustImgSrc(result.lsAlbums && result.lsAlbums.length && result.lsAlbums[0].imgUrl);
        return {
            title: result.cName,
            desc: desc,
            link: link,
            imgUrl: imgUrl
        };
    };
    view.prototype.onMenuShare = function (result) {
        var content = this.getMenuShareContent(result);
        wx.onMenuShareTimeline(content);
        wx.onMenuShareAppMessage(content);
    };
    view.prototype.init = function () {
        var that = this;
        var query = this.getQuery();
        var thisView = this.getView();
        // 获得我的收藏
        var myCollectionParams = { currentPage: 1, pagesize: "", productName: "", classId: "", tagId: "" };
        var proxy = cb.rest.DynamicProxy.create({ getProductFavorite: { url: 'client/ProductFavorites/getProductFavorites', method: 'POST', options: { token: true, mask: true, autoLogin: false}} });
        proxy.getProductFavorite(myCollectionParams, function (err, result) {
            if (err) {

            } else {
                for (var i = 0; i < result.pager.data.length; i++) {
                    if (result.pager.data[i].pid == query.goods_id) {
                        thisView.find('.toolbar .icon-collection').addClass('active');
                        thisView.find('p.collectionName').text("已收藏");
                    }
                }
            }
        });        
        this._set_data('choseItems', {});
        update.cartIcon();
        $$('.popup-prodSUK').find('.content-block').remove();
        var this_data = this._get_data('choseItems');
        thisView.find('.toolbar').removeClass('.toolbar-hidden').show();
        var self = this;
        self.proxy.getData({
            id: query.goods_id
        }, function (err, result) {
            if (result) {
                if (cb.config && cb.config.fromWechat)
                    self.onMenuShare(result);
                self.productInfo = result;
                if (result.iStatus == 0) {
                    // self.deal404(thisView);
                    view.prototype.isable = false;
                    return;
                } else {
                    view.prototype.isable = true;
                }
                if (result.canPurchaseCount <= 0) {
                    result.canPurchaseCount = 0;
                }
                if (result.productAttribute == 1) {
                    result.productAttribute = true;
                } else if (result.productAttribute == 2) {
                    result.productAttribute = false;
                    thisView.find('.now-buy').html('立即兑换');
                    that.isGeneralProduct = false;
                }
                var html = self.render(thisView.find('script').html(), {
                    productInfo: result
                });
                thisView.find('.page-content').html(html);
                thisView.find('div.toolbar').removeClass('toolbar-hidden');
                if (parseInt(result.fSalePrice) > parseInt(result.fMarkPrice)) {
                    $$('#spanPrice del').hide();
                }
                self.getProductEvaluate(query.goods_id, thisView);
                if (isAndroid) {
                    myApp.refreshScroller();
                }
                if (result.iStatus == 1) { //商品如果下架就不要显示组合销售  没有任何意义
                    this.dealCombineSale(result, query.goods_id);
                }
                thisView.find('div.toolbar').show();
                if (isIos)
                    thisView.find('.pricePreferentialName').children('.promo-type').addClass('ios-promo-type');
                if (thisView.find('p.pricePreferentialName').length > 0) {
                    thisView.find('p.pricePreferentialName').eq(0).removeClass('pricePreferentialName');
                };
                $$('.share').on('click',function(){
                    myApp.popup('.popupShare');
                    $$(".bdsharebuttonbox").removeClass("bdshare-button-style0-24");
                });
                $$('.cancelShare').on('click',function(){
                	myApp.closeModal('.popupShare');
                });
                // 删除商品详情的超链接
                //thisView.find('.productDetailMContent a').removeAttr('href');
                //thisView.find('.productDetailMContent a').removeAttr('target');
                // 阻止商品详情下的超链接触发
                thisView.find('.productDetailMContent a').click(function (e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return;
                });
                //初始化轮播图参数
                new Swiper(thisView.find('.swiper-container'), {
                    pagination: thisView.find('.swiper-container').children('.swiper-pagination'),
                    speed: 600,
                    autoplay: 2000,
                    autoplayDisableOnInteraction: false,
                    loop: thisView.find('.swiper-slide.u-slide').length > 1 ? true : false,
                    grabCursor: true,
                    paginationClickable: true
                });
                self.register(thisView, query.goods_id);
            } else if (err === null) {
                self.deal404(thisView);
            } else {
                view.prototype.isable = true;
                myApp.toast(err.message, 'error').show(true);
            }
        }, this);

        // 监测确认订单页面返回  清除缓存数据
        $$(document).on('pageAfterBack', '.page[data-page="confirmOrder"]', function (e) {
            cb.cache.clear();
        });
    };
    view.prototype.getProductEvaluate = function (id, thisView) {
        var self = this;
        var params = {
            type: 2,
            productID: self.getQuery().goods_id,
            commentStatus: 0,
            pageIndex: 1,
            pageSize: 2
        };
        this.proxy.getEvaluation(params, function (err, result) {
            if (result) {
                if (result.models.length > 0) {
                    result.models.forEach(function (item) {
                        if (item.dTime) {
                            item.dTime = item.dTime.split('.')[0];
                        }
                        if (item.dTimeReply) {
                            item.dTimeReply = item.dTimeReply.split('.')[0];
                        }
                        var arr = [];
                        var length = parseInt(item.iStars);
                        for (var i = 0; i < 5; i++) {
                            if (i < length) {
                                arr.push(true)
                            } else {
                                arr.push(false)
                            }
                        }
                        item.iStars = arr;
                    });
                    var html = self.render(thisView.find('#productEvaluate').html(), {
                        data: result.models
                    });
                    thisView.find('.preEvaluation').html(html);
                    thisView.find('li.evaluation .evaluationQuantity').removeClass('hide');
                    thisView.find('li.evaluation .evaluationQuantity span').html(result.modelsCount)
                } else {
                    thisView.find('li.evaluation .evaluationQuantity').removeClass('hide');
                    var $dom = '<div class="no-evluation">暂无评论</div>'
                    thisView.find('li.evaluation .preEvaluation').html($dom)
                }
            } else {
                myApp.toast(err.message, 'tips').show(true);
            }
        });
    }
    view.prototype.deal404 = function (thisView) {
        // 下架的标志
        view.prototype.isable = false;
        var div = '<div class="status404"></div><p class="tip404">很抱歉，您查看的宝贝不存在，可能已下架或被转移</p>';
        thisView.find('.page-content').html(div);
        thisView.find('.go-home').on('click', function () {
            myApp.mainView.router.loadPage('/home');
        });
    }
    view.prototype.dealCombineSale = function (data, id) {
        var thisView = this.getView();
        var combileLi = thisView.find('li.combileSale');
        //组合销售逻辑部分
        this.proxy.getCombinSaleList({
            param: {
                productId: id
            }
        }, function (err, result) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            if (result.combinSales.length == 0) {
                return;
            }
            //渲染
            combileLi.show();
            combileLi.on('click', function () {
                myApp.mainView.loadPage({
                    url: 'combileSale',
                    query: {
                        combile: result.combinSales[0],
                        mainPro: data
                    }
                });
            });
        });
    }
    view.prototype.register = function (thisView, id) {
        var self = this;
        //注册选择sku弹出事件
        thisView.find('li[data-property="property"]').on('click', function () {
            self.showSku(thisView, $$(this));
        });
    }
    view.prototype.showSku = function (thisView, target) {
        var popupSku = $$('.popup-prodSUK');
        if (popupSku.find('.content-block').length > 0) {
            if (target.hasClass('go-cart') || target.hasClass('now-buy')) { //根据target不同 判断显示 确定 还是 btn-groups 
                popupSku.find('.popup-bottom').show();
                popupSku.find('.popup-bottom.btn-groups').hide();
                if (target.hasClass('go-cart')) {
                    popupSku.find('.btn-update-sku').addClass('go-cart');
                    popupSku.find('.btn-update-sku').removeClass('now-buy');
                    target.removeClass('now-buy');
                } else {
                    target.removeClass('go-cart');
                    popupSku.find('.btn-update-sku').removeClass('go-cart');
                    popupSku.find('.btn-update-sku').addClass('now-buy');
                }
                popupSku.find('.btn-update-sku').removeClass('clickSelectSku');
            } else {
                popupSku.find('.popup-bottom').show();
                popupSku.find('.popup-bottom.btn-groups').hide();
                popupSku.find('.btn-update-sku').addClass('clickSelectSku');
                //popupSku.find('.popup-bottom').hide();
                //popupSku.find('.popup-bottom.btn-groups').css('display', 'flex');
            }
            myApp.popup('.popup-prodSUK');
        } else {
            var html = this.render(thisView.find('#productDealSku').html(), {
                data: [this.productInfo]
            });
            $$('.popup-prodSUK').html(html);
            if (target.hasClass('go-cart') || target.hasClass('now-buy')) { //根据target不同 判断显示 确定 还是 btn-groups 
                popupSku.find('.popup-bottom').show();
                popupSku.find('.popup-bottom.btn-groups').hide();
                if (target.hasClass('go-cart')) {
                    popupSku.find('.btn-update-sku').addClass('go-cart');
                    popupSku.find('.btn-update-sku').removeClass('now-buy');
                    target.removeClass('now-buy')

                } else {
                    target.removeClass('go-cart');
                    popupSku.find('.btn-update-sku').removeClass('go-cart');
                    popupSku.find('.btn-update-sku').addClass('now-buy');
                }

                popupSku.find('.btn-update-sku').removeClass('clickSelectSku');
            } else {
                popupSku.find('.popup-bottom').show();
                popupSku.find('.popup-bottom.btn-groups').hide();
                popupSku.find('.btn-update-sku').addClass('clickSelectSku');
            }
            this.setPopupContentHeight(popupSku)
            var skus = this.productInfo.lsProductSkus;
            var skuResult = this.initSKU(skus);
            this._set_data('skuResult', skuResult);
            this.initializeHasSku(skuResult, $$('.popup-prodSUK'));
            this.registerPopupBtn();
        }
        if (isIos)
            $$('.popup-prodSUK').find('#txtProSpecsCount').addClass('ios-editControl');
    }
    view.prototype.registerPopupBtn = function () {
        var self = this;
        var thisView = this.getView();
        $$('.popup-prodSUK').find('.btn-update-sku,.btn-groups div').on('click', function () {
            if ($$(this).hasClass('clickSelectSku')) {
                myApp.closeModal('.popup-prodSUK');
            } else {
                self.dealAddCart(thisView, $$(this));
            }

        });
        $$('.popup-prodSUK .numberManage i').on('click', function () {
            var quantity = parseInt($$('.popup #txtProSpecsCount').val());
            var sku = self._get_data('sku');
            var maxCount = self._get_data('maxCount');
            if (sku) {
                if ($$(this).hasClass('icon-cart-add')) { //数量加
                    $$(this).prevAll('.icon-cart-less').removeClass('disabled');
                    if (quantity == maxCount - 1) {
                        $$(this).addClass('disabled');
                    }
                    var nowQunatity = quantity + 1;
                    $$('.popup #txtProSpecsCount').val(nowQunatity)
                } else { //数量减
                    $$(this).nextAll('.icon-cart-add').removeClass('disabled');
                    if (quantity == 2) {
                        $$(this).addClass('disabled');
                    }
                    var nowQunatity = quantity - 1;
                    $$('.popup #txtProSpecsCount').val(nowQunatity)
                }
                var data = self._get_data('choseItems');
                data.quantity = nowQunatity;
                if ($$('.popup-prodSUK .popup-attrs .lsSpecItem').length == 0) {
                    thisView.find('li[data-property="property"] .item-title').html('已选择' + data.quantity + '件');
                    $$('.popup-prodSUK').find('.tip-chose').html('已选择' + data.quantity + '件');
                }
            }
        });
        $$('.popup-prodSUK .numberManage input').on('change', function () {
            var nowValue = $$(this).val();
            var sku = self._get_data('sku');
            var maxCount = self._get_data('maxCount');
            var reg = new RegExp('^[0-9]*[1-9][0-9]*$'); //正则表达式  用来判断正整数。。。
            if (reg.test(nowValue)) {
                if (parseInt(nowValue) > maxCount) {
                    myApp.toast('数量大于可购数量', 'tips').show(true);
                    $$(this).val(maxCount);
                    if (maxCount > 1) {
                        $$(this).prev('i').removeClass('disabled');
                    }
                    $$(this).next('i').addClass('disabled');
                } else if (parseInt(nowValue) == maxCount) {
                    $$(this).next('i').addClass('disabled');
                    $$(this).prev('i').removeClass('disabled');
                }
            } else {
                myApp.toast('输入值不符合要求 ', 'tips').show(true);
                $$(this).val(1);
                $$(this).prev('i').addClass('disabled');
                if (maxCount > 1) {
                    $$(this).next('i').removeClass('disabled');
                }
            }
            var data = self._get_data('choseItems');
            data.quantity = $$(this).val();
        });
    }
    view.prototype.initializeHasSku = function (skuResult, popup) {
        $$('.popup-prodSUK .numberManage').children().addClass('disabled');
        $$('.popup-prodSUK .btn-update-sku,.btn-groups div').addClass('disabled');
        this.clickItems(skuResult);
        var data = this._get_data('choseItems');
        if (!data.choseItem || (data.choseItem && data.choseItem.length == 0)) {
            this.setTipsAboutChose(popup);
        }
        myApp.popup('.popup-prodSUK');
    }
    view.prototype.setPopupContentHeight = function (popupSku) {
        //使用脚本控制sku popup 中内容去的高度 
        //49是最后btn高度  25是距离上面的padding值
        var others = popupSku.find('.p-close').outerHeight() +
			popupSku.find('.popup-top').outerHeight() +
			popupSku.find('.popup-bottom').outerHeight() + 49 + 20
        var popupHeight = popupSku.outerHeight();
        popupSku.find('.popup-content').css('height', popupHeight - others + 'px');
    }
    view.prototype.clickItems = function (skuResult) {
        var that = this;
        var data = this._get_data('choseItems');
        var popup = $$('.popup-prodSUK');
        var items = popup.find('.popup-attrs div.attrItem');
        items.each(function () {
            var self = $$(this);
            var specid = self.attr('data-id');
            if (!skuResult[specid])
                self.attr('disabled', 'disabled');
        }).click(function (e) {
            var self = $$(this);
            if (self.attr('disabled') == 'disabled') return;
            self.nextAll().removeClass('active');
            self.prevAll().removeClass('active');
            self.toggleClass('active');
            var selectedspecs = popup.find('.popup-attrs div.attrItem.active');
            var selectedids = [];
            selectedspecs.each(function () {
                selectedids.push($$(this).attr('data-id'));
            });
            selectedids.sort(function (val1, val2) {
                return parseInt(val1) - parseInt(val2);
            });
            var len = selectedids.length;
            var sku = skuResult[selectedids.join(';')];
            that.resetProp(sku, popup, len, that);
            //处理当前选中项无法匹配的其他规格项
            otherNopick = items.filter(function (index, el) {
                return !($$(this).hasClass('active'));
            });
            otherNopick.each(function () {
                $$(this).addClass('special-attrItem');
                var siblingsselectedspec = $$(this).parent().children('div.attrItem').filter(function (idnex, el) {
                    return !($$(this).hasClass('special-attrItem')) && $$(this).hasClass('active');
                });
                $$(this).removeClass('special-attrItem');
                var testspecids = [];
                if (siblingsselectedspec.length) {
                    var siblingsselectedid = siblingsselectedspec.attr('data-id');
                    for (var i = 0; i < len; i++) {
                        (selectedids[i] != siblingsselectedid) && testspecids.push(selectedids[i]);
                    }
                } else {
                    testspecids = selectedids.concat();
                }
                testspecids = testspecids.concat($$(this).attr('data-id'));
                testspecids.sort(function (val1, val2) {
                    return parseInt(val1) - parseInt(val2);
                });
                if (!skuResult[testspecids.join(';')]) {
                    $$(this).attr('disabled', 'disabled').removeClass('active');
                } else {
                    $$(this).removeAttr('disabled');
                }
            });
        });
    }
    view.prototype.resetProp = function (sku, popup, len, that) {
        var data = this._get_data('choseItems');
        popup.find('.numberManage input').val(1);
        var disabledDom = popup.find('.btn-update-sku,.numberManage i,.numberManage input,.popup-bottom.btn-groups div');
        var showPriceBox = popup.find('.popup-top .price');
        var salePrice = showPriceBox.find('span');
        var markPrice = showPriceBox.find('del');
        var kucun = popup.find('.popup-top .kucun');
        if (sku) {
            if (len == that.productInfo.lsSpecs.length) {
                disabledDom.removeClass('disabled');
                if (!this.isGeneralProduct) {
                    salePrice.html(sku.prices[0] + '积分');
                } else {
                    salePrice.html('￥' + sku.prices[0]);
                }
                markPrice.html('￥' + sku.markPrices[0]);
                kucun.html('库存：' + sku.count);
                // 库存为0加入购物车和立即购买按钮不可用
                if (sku.count > 0) {

                } else {
                    $$('.updateDetailSku').addClass('disabled');
                }
                data.skuid = sku.ids[0];
                this._set_data('sku', sku);
                var xiangou = this.productInfo.canPurchaseCount;
                if (xiangou || xiangou == 0) {
                    var maxCount = xiangou < sku.count ? xiangou : sku.count
                } else {
                    var maxCount = sku.count;
                }
                if (maxCount <= 0) {
                    disabledDom.addClass('disabled');
                }
                if (maxCount == 1) {
                    popup.find('.numberManage i').addClass('disabled');
                }
                if (popup.find('.numberManage input').val() == 1) {
                    popup.find('.numberManage .icon-cart-less').addClass('disabled');
                }
                this._set_data('maxCount', maxCount);
            } else {
                disabledDom.addClass('disabled');
            }
        } else { //这种情况就是规格一个都没选中 数量无法加减 确认失效 价格显示商品价格
            disabledDom.addClass('disabled');
        }
        this.setTipsAboutChose(popup);
    }
    view.prototype.setTipsAboutChose = function (popup) {
        var thisView = this.getView();
        var data = this._get_data('choseItems');
        data.noChoseItem = [];
        data.choseItem = [];
        var itemsAlbum = [];
        var self = this;
        var items = popup.find('.popup-content .popup-attrs div.lsSpecItem');
        for (var i = 0; i < items.length; i++) {
            if (items.eq(i).find('.attrItem.active').length == 0) {
                data.noChoseItem.push(items.eq(i).prev('p').html());
            } else {
                var json = {
                    id: items.eq(i).find('.attrItem.active').attr('data-id'),
                    name: items.eq(i).find('.attrItem.active').html()
                };
                itemsAlbum.push(items.eq(i).find('.attrItem.active').attr('data-id'));
                data.choseItem.push(json);
            }
        }
        if (data.noChoseItem.length > 0) {
            popup.find('.tip-chose').html('请选择 ' + data.noChoseItem.join(' '));
            thisView.find('li[data-property="property"] .item-title').html('请选择 ' + data.noChoseItem.join(' '));
        } else {
            var tips = '';
            data.choseItem.forEach(function (item, arr, index) {
                tips += item.name
            })
            popup.find('.tip-chose').html('已选择 ' + tips);
            thisView.find('li[data-property="property"] .item-title').html('已选择 ' + tips);
        };
        var showPic = [];
        itemsAlbum.forEach(function (item, arr, index) {
            self.productInfo.lsSpecItemAlbums.forEach(function (item1, arr1, idnex1) {
                if (item == item1.iSpecItemId) {
                    var json = {
                        imgUrl: item1.imgUrl
                    }
                    showPic.push(json);
                    return;
                }
            })
        });
        if (showPic.length == 0) {
            var src = self.productInfo.oDefaultAlbum ? self.productInfo.oDefaultAlbum.imgUrl : './img/nopic.jpg';
            popup.find('.popup-top .popup-img img').attr('src', src);
        } else {
            var src = showPic[0].imgUrl ? showPic[0].imgUrl : "./img/nopic.jpg";
            popup.find('.popup-top .popup-img img').attr('src', src);
        }
    }
    view.prototype.initSKU = function (data) {
        var SKUResult = {};
        if (data.length === 1 && data[0].cSpecIds === '') {
            this.constructSKU(SKUResult, "", data[0]);
            return SKUResult;
        }
        data.forEach(function (sku) {
            var skuKey = sku.cSpecIds;
            var skuKeyAttrs = skuKey.split(';');
            skuKeyAttrs.sort(function (val1, val2) {
                return parseInt(val1) - parseInt(val2);
            });
            // 对每个SKU信息key属性值进行拆分组合
            var combArr = this.arrayCombine(skuKeyAttrs);
            combArr.forEach(function (item) {
                var key = item.join(';');
                this.constructSKU(SKUResult, key, sku);
            }, this);
            this.constructSKU(SKUResult, skuKeyAttrs.join(';'), sku);
        }, this);
        return SKUResult;
    };
    view.prototype.constructSKU = function (SKUResult, key, sku) {
        if (!this.isGeneralProduct) {
            sku.fSalePrice = sku.salePoints;
        }
        if (SKUResult[key]) {
            SKUResult[key].count += sku.lInventoryCount;
            SKUResult[key].prices.push(sku.fSalePrice);
            SKUResult[key].codes.push(sku.cCode);
            SKUResult[key].ids.push(sku.id);
            SKUResult[key].markPrices.push(sku.fMarkPrice);
            SKUResult[key].promptMsgs.push(sku.promptMsg);
        } else {
            SKUResult[key] = {
                count: sku.lInventoryCount,
                prices: [sku.fSalePrice],
                codes: [sku.cCode],
                ids: [sku.id],
                markPrices: [sku.fMarkPrice],
                promptMsgs: [sku.promptMsg]
            };
        }
    };
    view.prototype.arrayCombine = function (targetArr) {
        if (!targetArr || !targetArr.length) return [];
        var len = targetArr.length;
        var resultArrs = [];
        for (var n = 1; n < len; n++) {
            var flagArrs = this.getFlagArrs(len, n);
            while (flagArrs.length) {
                var flagArr = flagArrs.shift();
                var combArr = [];
                for (var i = 0; i < len; i++) {
                    flagArr[i] && combArr.push(targetArr[i]);
                }
                resultArrs.push(combArr);
            }
        }
        return resultArrs;
    };
    view.prototype.getFlagArrs = function (m, n) { // 获得从m中取n的所有组合
        if (!n || n < 1) return [];
        var resultArrs = [],
			flagArr = [],
			isEnd = false,
			i, j, leftCnt;
        for (i = 0; i < m; i++) {
            flagArr[i] = i < n ? 1 : 0;
        }
        resultArrs.push(flagArr.concat());
        while (!isEnd) {
            leftCnt = 0;
            for (i = 0; i < m - 1; i++) {
                if (flagArr[i] == 1 && flagArr[i + 1] == 0) {
                    for (j = 0; j < i; j++) {
                        flagArr[j] = j < leftCnt ? 1 : 0;
                    }
                    flagArr[i] = 0;
                    flagArr[i + 1] = 1;
                    var aTmp = flagArr.concat();
                    resultArrs.push(aTmp);
                    if (aTmp.slice(-n).join('').indexOf('0') == -1) {
                        isEnd = true;
                    }
                    break;
                }
                flagArr[i] == 1 && leftCnt++;
            }
        }
        return resultArrs;
    };
    view.prototype.dealCommentSpec = function (result) {
        //通过skuid获取到对应的规格名称 规格项名称
        var mainPro = this.productInfo;
        for (var i = 0; i < result.models.length; i++) {
            result.models[i].specs = [];
            result.models[i].dTime = result.models[i].dTime.split(' ')[0];
            var productSkus = mainPro.lsProductSkus;
            for (var j = 0; j < productSkus.length; j++) {
                if (productSkus[j].id == result.models[i].iProductSKU_Id) {
                    var specs = productSkus[j].cSpecIds.split(';');
                    for (var m = 0; m < specs.length; m++) {
                        for (var n = 0; n < mainPro.lsSpecs.length; n++) {
                            for (var z = 0; z < mainPro.lsSpecs[n].lsSpecItem.length; z++) {
                                if (specs[m] == mainPro.lsSpecs[n].lsSpecItem[z].id) {
                                    result.models[i].specs.push({
                                        spec: mainPro.lsSpecs[n].cName,
                                        itemName: mainPro.lsSpecs[n].lsSpecItem[z].cSpecItemName
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    view.prototype.afterFromPageBack = function (data) {
        if (data.fromPage.name !== 'cart') return;
        this.init();
    };
    return view;
});