cb.views.register('CartViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.addOrLessClick = false;
    view.prototype.obj = {};
    // 是否礼品卡或计次卡
    view.prototype.isGiftOrCountCard = false;
    // 是否普通商品
    view.prototype.isRealProduct = false;
    // 是否虚拟商品
    view.prototype.isVirtualProduct = false;
    // 现金购买
    view.prototype.cashPay = false;
    // 积分购买
    view.prototype.pointsPay = false;
    // 虚拟商品属性
    // 储值卡
    view.prototype.isVirtualStorageCard = false;
    // 礼品卡
    view.prototype.isVirtualGiftCard = false;
    // 计次卡
    view.prototype.isVirtualCountCard = false;
    // 其它虚拟商品
    view.prototype.isOtherVirtualProduct = false;


    // 购物车中的数量
    view.prototype.cartTotalNum = 0;
    // 满赠活动子id
    view.prototype.activityItemId;
    // 满赠活动id
    view.prototype.giftPromotionId;
    // 商品iproductid
    view.prototype.iProductId;
    // 满A送A商品购物车id
    view.prototype.cartId;
    // 满赠类型
    view.prototype.iGiftType;
    // 是否显示编辑
    view.prototype.isShowEditor = true;
    // 加载购物车数组的起始位置
    //view.prototype.startIndex = 0;
    // 初始化
    view.prototype.init = function () {
        var self = this;
        self.userPoints = 0;
        if (myApp.mainView.container.id !== "cartView") {
            myApp.hideToolbar('.homeNavBar');
            self.getView().find('a.cartBack').removeClass('hide');
            self.getView().find('.bottom-bar').css('bottom', '0px');
        } else {
            myApp.showToolbar('.homeNavBar');
            self.getView().find('a.cartBack').addClass('hide');
            self.getView().find('.bottom-bar').css('bottom', '49px');
        }
        // 全选按钮默认不选中
        self.getView().find('input[type="checkbox"][name="cartCheckAll"]').prop('checked', false);
        var thisView = this.getView().find('.cartNew-list');
        // 加载购物车列表
        var proxy = cb.rest.DynamicProxy.create({ getCartLists: { url: 'client/ShoppingCarts/getCartList', method: 'GET', options: { token: true, mask: true } } });
        proxy.getCartLists(function (err, result) {
            if (err) return;
            var transferData = self.transferServerData(result);
            view.prototype.obj = transferData.obj;
            var $cartList = self.getView().find('.cartNew-list');
            var cartListHtml = self.render(self.getView().find('#cartItemTpl').html(), { cartList: { list: transferData.list, allProductGiftPreferDetail: transferData.allProductGiftPreferDetail } });
            if (result.lsCart.length){
            	self.getView().find('.bottom-bar.cart-btn-row').removeClass('hide');
            	self.getView().find('.btn-editStatue').show();
            }else{
            	self.getView().find('.bottom-bar.cart-btn-row').addClass('hide');
            	self.getView().find('.btn-editStatue').hide();
            }                
            // 将每行的信息存储
            self.rawData = transferData.list;
            //view.prototype.startIndex = 6;
            self.getView().find('.cartItemContainer').html(cartListHtml);
            if (isIos)
                self.getView().find('.numberManage').find('input').addClass('ios-editControl');
            self.RegeistEvent();
            // 全部商品的数量
            self.getView().find('.allCartProductCount').text(transferData.amount);
            // 底部导航栏目购物车的数量图标
            $$('.shoppingCartCount').text(transferData.amount);
            view.prototype.cartTotalNum = transferData.amount;
            $$('.shoppingCartCount').show();
            view.prototype.isShowEditor = true;
            self.getView().find('div[data-page="cart"] .btn-editStatue').attr('data-Type', 'edit').html('编辑');
            // 底部菜单的显示和隐藏
            self.getView().find('.cart-balance-container').removeClass('hide');
            self.getView().find('.cart-btn-submit').removeClass('hide');
            self.getView().find('.cart-btn-collection').addClass('hide');
            self.getView().find('.cart-btn-delete').addClass('hide');
            self.getView().find('.infinite-scroll-preloader').hide();
            //下拉刷新
            self.getView().find('.page-content.pull-to-refresh-content').on('refresh', function (e) {
                self.productCheckboxSelectFunc(false, false);
            });

            //var accountInfo = cb.util.localStorage.getItem('accountInfo');
            //if (accountInfo && typeof accountInfo == 'string')
            //    accountInfo = JSON.parse(accountInfo);

            //self.userPoints = accountInfo.iPoints ? accountInfo.iPoints : 0;
            // 获得该用户积分
            var proxy = cb.rest.DynamicProxy.create({ getMemberPoints: { url: 'member/Members/getMemberByToken', method: 'POST', options: { token: true } } });
            proxy.getMemberPoints({}, function (getMemberPointsErr, getMemberPointsResult) {
                if (getMemberPointsErr) {
                    self.userPoints = 0;
                } else {
                    // 我的积分
                    if (!getMemberPointsResult.iPoints) {
                        getMemberPointsResult.iPoints = 0;
                    }
                    self.userPoints = getMemberPointsResult.iPoints;
                }
            });
        });
    };
    view.prototype.once = function () {
        var self = this;
        var thisView = this.getView().find('.cartNew-list');
        // 全选按钮功能
        self.getView().find('.ck-allSelect').on('click', function (e) {
            e.stopPropagation();
            if (e.handled !== true) {
                e.handled = true;
                var isCheck = $$(this).parent('.bottom-bar').find('input[type="checkbox"][name="cartCheckAll"]').prop('checked');
                // 找到所有商品对应的checkBox
                var selectChildItem = self.getView().find('input[type="checkbox"][name="cartItemCheckbox"]');
                if (!isCheck) {
                    selectChildItem.each(function () {
                        // 全部赋值1
                        $$(this).attr('datachecked', "1");
                        $$(this).prop('checked', true);

                    });
                } else {
                    selectChildItem.each(function () {
                        // 全部赋值0
                        $$(this).attr('datachecked', "0");
                        $$(this).prop('checked', false);
                    });
                }
                self.getView().find('input[type="checkbox"][name="common-checkbox"]').prop('checked', true);
                // 只有在浏览状态下判定限购，编辑状态下不判定限购
                if (view.prototype.isShowEditor) {
                    // 不同类型商品不能一起结算处理
                    if (!self.readlVirtualProductDeal()) {
                        selectChildItem.each(function () {
                            // 全部赋值0
                            $$(this).attr('datachecked', "0");
                            $$(this).prop('checked', false);
                        });
                        //this.checked = false;
                        self.getView().find('input[type="checkbox"][name="cartCheckAll"]').prop('checked', true);
                        self.getView().find('input[type="checkbox"][name="common-checkbox"]').prop('checked', false);
                        return;
                    }
                    var isSuccess = self.amountControlFunc(view.prototype.obj);
                    if (!isSuccess) {
                        selectChildItem.each(function () {
                            // 全部赋值0
                            $$(this).attr('datachecked', "0");
                            $$(this).prop('checked', false);
                        });
                        self.getView().find('input[type="checkbox"][name="cartCheckAll"]').prop('checked', true);
                        self.getView().find('input[type="checkbox"][name="common-checkbox"]').prop('checked', false);
                        return;
                    }
                    self.productCheckboxSelectFunc(true, !isCheck);
                }
            }

        });
        // 全选按钮限制f7自动触发checkbox方法
        //self.getView().find('.ck-allSelect').on('click', function (e) {
        //    debugger;
        //    if ($$(e.target).attr('class') !== "icon icon-form-checkbox") {
        //        debugger;
        //        var isCheck = $$(this).find('input[type="checkbox"][name="cartCheckAll"]').prop('checked');
        //        $$(this).find('input[type="checkbox"][name="cartCheckAll"]').prop('checked', !isCheck);
        //    }

        //});
        // 编辑按钮功能
        self.getView().find('.btn-editStatue').on('click', function (e) {
            var _this = this;
            var val = $$(this).attr('data-Type');
            var singleCartItemCheckBoxDiv = self.getView().find('.singleCartItemCheckBox');
            if (val == 'edit') {
                view.prototype.isShowEditor = false;
                $$(this).attr('data-Type', 'submit').html('完成');
                // 将失效的商品checkbox变成可用
                $$.each(singleCartItemCheckBoxDiv, function (index, value) {
                    // 商品失效
                    if ($$(singleCartItemCheckBoxDiv[index]).hasClass('disabled')) {
                        // 让checkbox可选
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).removeClass('disabled');
                        // 添加失效标志
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).attr('cartEnable', "1");
                    }
                    // 显示组合的商品chencbox对其进行编辑
                    if ($$(singleCartItemCheckBoxDiv[index]).hasClass('cartCheckHide')) {
                        // 显示组合商品的checkbox
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).removeClass('cartCheckHide');
                        // 添加组合商品的标志
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).attr('commonProduct', "1")
                    }
                });
                // 底部菜单的显示和隐藏
                self.getView().find('.cart-balance-container').addClass('hide');
                self.getView().find('.cart-btn-submit').addClass('hide');
                self.getView().find('.cart-btn-collection').removeClass('hide');
                self.getView().find('.cart-btn-delete').removeClass('hide');
                //self.getView().find('.icon-singleProject-del').css('display', 'block');
                self.getView().find('.icon-common-del').css('display', 'block');
            } else {
                // 点击完成保存数量
                var shoppingCart = {};
                var itemsArray = [];
                var singleProductQuantityContainer = self.getView().find(".singleProductQuantity");
                singleProductQuantityContainer.each(function () {
                    var dataset = $$(this).dataset();
                    itemsArray.push(dataset)
                });
                shoppingCart.items = itemsArray;
                self.updatesCart(shoppingCart, function (err, result) {
                    if (err) {
                        return;
                    } else {
                        view.prototype.isShowEditor = true;
                        $$(_this).attr('data-Type', 'edit').html('编辑');
                        // 将失效的商品checkbox变成可用
                        $$.each(singleCartItemCheckBoxDiv, function (index, value) {
                            // 失效商品checkbox不可选
                            if ($$(singleCartItemCheckBoxDiv[index]).attr('cartEnable') == "1") {
                                $$(self.getView().find('.singleCartItemCheckBox')[index]).addClass('disabled')
                            }
                            // 组合商品checkbox隐藏
                            if ($$(singleCartItemCheckBoxDiv[index]).attr('commonProduct') == "1") {
                                $$(self.getView().find('.singleCartItemCheckBox')[index]).addClass('cartCheckHide')
                            }
                        });
                        var selectChildItem = self.getView().find('input[type="checkbox"][name="cartItemCheckbox"]');
                        var isCheck = $$(this).parent('.bottom-bar').find('input[type="checkbox"][name="cartCheckAll"]').prop('checked');
                        selectChildItem.each(function () {
                            // 全部赋值0
                            $$(this).attr('datachecked', "0");
                            $$(this).prop('checked', false);
                        });
                        self.getView().find('input[type="checkbox"][name="cartCheckAll"]').prop('checked', false);
                        self.getView().find('input[type="checkbox"][name="common-checkbox"]').prop('checked', false);
                        // 底部菜单的显示和隐藏
                        self.getView().find('.cart-balance-container').removeClass('hide');
                        self.getView().find('.cart-btn-submit').removeClass('hide');
                        self.getView().find('.cart-btn-collection').addClass('hide');
                        self.getView().find('.cart-btn-delete').addClass('hide');
                        //self.getView().find('.icon-singleProject-del').css('display', 'none');
                        self.getView().find('.icon-common-del').css('display', 'none');
                        self.productCheckboxSelectFunc(false, false);
                    }

                });

            }
        });
        // 立即结算按钮功能
        self.getView().find('.button.cart-btn-submit').on('click', function (e) {
            e.stopPropagation();
            // 商品失效标志
            var productEnable = true;
            // 选中的商品
            var selectedItem = thisView.find('input[type=checkbox][name=cartItemCheckbox]:checked');
            if (selectedItem.length == 0) {
                myApp.toast('请选择要结算的项', 'tips').show(true);
                return;
            };
            if (!self.readlVirtualProductDeal()) {
                return;
            }
            if (view.prototype.isGiftOrCountCard) {
                var selectGiftItems = self.getView().find('div.selectedGiftList');
                if (selectGiftItems && selectGiftItems.length) {
                    myApp.toast('礼品卡不能与赠品一起结算', 'tips').show(true);
                    return;
                }
            }
            // 限购校验
            if (!self.amountControlFunc(view.prototype.obj)) {
                productEnable = false;
                return;
            }
            // 获得商品参数
            var shoppingCart = {};
            var itemsArray = new Array();
            // 是否积分商品
            var integralProduct = false;
            selectedItem.each(function () {
                var dataset = $$(this).parents('li.singleProductList').find(".singleProductQuantity").dataset();
                if (dataset.lPackageId && !dataset.packageValid) {
                    myApp.toast('组合商品' + dataset.name + '失效', 'tips').show(true);
                    productEnable = false;
                    return;
                }
                itemsArray.push({ iSKUId: dataset.iSKUId, iCorpId: dataset.iCorpId, iQuantity: dataset.iQuantity, fSalePrice: dataset.singleprice, iProductId: dataset.iProductId, id: dataset.id, productAttribute: dataset.productAttribute });
                if (dataset.productAttribute == 2) {
                    integralProduct = true;
                }
            });
            // 判断积分商品总价格与会员总积分
            if (integralProduct) {
                var totalPoints = self.getView().find('div[data-page="cart"] .cartTotalPrice').text();
                totalPoints = parseFloat(totalPoints.substr(0, totalPoints.length - 2));
                if (totalPoints > parseFloat(self.userPoints)) {
                    myApp.toast('您的积分不足，请重新选择商品', 'tips').show(true);
                    return;
                }
            }

            shoppingCart.items = itemsArray;
            if (productEnable) {
                // 检查商品是否下架
                var proxy = cb.rest.DynamicProxy.create({ checkiQuantity: { url: 'client/ShoppingCarts/checkiQuantity', method: 'POST', options: { token: true } } });
                proxy.checkiQuantity(shoppingCart, function (err1, result1) {
                    if (err1) {
                        myApp.toast(err1.message, 'error').show(true);
                        return;
                    } else {
                        // 赠品集合
                        var selectGiftContainer = thisView.find('div.selectedGiftList');
                        selectGiftContainer.each(function () {
                            var dataset = $$(this).dataset();
                            itemsArray.push({ iSKUId: dataset.iSKUId, iCorpId: dataset.iCorpId, iQuantity: dataset.iQuantity, fSalePrice: 0, iProductId: dataset.iProductId, id: dataset.id });
                        });
                        shoppingCart.items = itemsArray;
                        // 新添加参数 不是送商品的全部商品满赠活动，满赠条件，获得该活动子活动的id
                        var childActiveIdContainer = self.getView().find(".childActivityId");
                        var childActiveIdsArray = [];
                        childActiveIdContainer.each(function () {
                            childActiveIdsArray.push($$(this).data("childactivityid"));
                        });
                        // 新添加参数 是送商品的全部商品满赠活动，满赠条件并且选了赠品，获得该活动子活动的id
                        var productGiftChildActivityIdContainer = self.getView().find(".productGiftChildActivityId");
                        productGiftChildActivityIdContainer.each(function () {
                            childActiveIdsArray.push($$(this).data("childactivityid"));
                        });
                        var activityIds = childActiveIdsArray.join(",");
                        shoppingCart.activityIds = activityIds;
                        var proxy = cb.rest.DynamicProxy.create({ generateOrderByShoppingCart: { url: 'client/Orders/GenerateOrderByShoppingCart', method: 'POST', options: { token: true } } });
                        proxy.generateOrderByShoppingCart(shoppingCart, function (err, result) {
                            if (err) {
                                myApp.toast(err.message, 'error').show(true);
                                return;
                            } else {
                                if (integralProduct) {
                                    myApp.mainView.router.loadPage({
                                        url: 'orderExchange'
                                    });
                                } else {
                                    myApp.mainView.router.loadPage({
                                        url: 'order'
                                    });
                                }

                            }
                        });
                    }
                });
            }
        });
        // 删除按钮功能
        self.getView().find('.button.cart-btn-delete').on('click', function (e) {
            var selectedItem = thisView.find('input[type=checkbox][name=cartItemCheckbox]:checked');
            if (selectedItem.length == 0) {
                myApp.toast('请选择要删除的项目', 'tips').show(true);
                return;
            }
            myApp.confirm('您确定要删除吗?', '提示信息', function () {
                // 获得参数
                var shoppingCart = {};
                var itemsArray = new Array();
                selectedItem.each(function () {
                    var dataset = $$(this).parents('li.singleProductList').find(".singleProductQuantity").dataset();
                    itemsArray.push({ id: dataset.id, bIsMain: dataset.bIsMain });
                });
                shoppingCart.items = itemsArray;
                var proxy = cb.rest.DynamicProxy.create({ del: { url: 'client/ShoppingCarts/del', method: 'POST', options: { token: true } } });
                proxy.del(shoppingCart, function (err, result) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    } else {
                        myApp.toast('删除成功', 'success').show(true);
                        self.productCheckboxSelectFunc(false, false);
                        //myApp.mainView.router.refreshPage();
                    }
                });
            });


        });
        // 收藏按钮功能
        self.getView().find('.button.cart-btn-collection').on('click', function (e) {
            //var selectedItem = thisView.find('input[type=checkbox][name=cartItemCheckbox]:checked');
            var selectedItem = thisView.find("input[type=checkbox][name=cartItemCheckbox][datachecked='1']");
            if (selectedItem.length == 0) {
                myApp.toast('请选择要收藏的商品', 'tips').show(true);
                return;
            }
            myApp.confirm('你确定要收藏吗？', '提示信息', function () {
                var collectionParams = {};
                var itemsArray = new Array();
                selectedItem.each(function () {
                    var dataset = $$(this).parents('li.singleProductList').find(".singleProductQuantity").dataset();
                    itemsArray.push(dataset.iProductId);
                });
                collectionParams.ids = itemsArray;
                var proxy = cb.rest.DynamicProxy.create({ addProductFavorite: { url: 'client/ProductFavorites/addProductFavorite', method: 'POST', options: { token: true } } });
                proxy.addProductFavorite(collectionParams, function (err, result) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    }
                    myApp.toast('收藏商品成功', 'tips').show(true);
                    myApp.mainView.router.refreshPage();
                });
            });
        });
        // 回退
        self.getView().find('.cartBack').on('click', function (e) {
            myApp.showToolbar('.homeNavBar');
            self.getView().find('a.icon-only').removeClass('hide');
            self.getView().find('.bottom-bar').css('bottom', '49px');
        });
    };
    // 从服务中得到的数据转换为前端展示的格式
    view.prototype.transferServerData = function (serverData) {
        var _self = this;
        var map = {};
        var obj = { map: {}, sku: {}, product: {} };
        //var allProductGiftPreferTemp = [];
        //var allProductGiftInviteCode = [];
        // 所有商品的满赠活动以及推广码满赠活动开始
        // 截获所有满赠活动类型为全部商品及推广码的赠品开始
        for (var allGiftTitleIndex = 0; allGiftTitleIndex < serverData.allProductGiftPreferDetail.length; allGiftTitleIndex++) {
            // 判断子活动中是否有送赠品活动
            serverData.allProductGiftPreferDetail[allGiftTitleIndex].item.isShowGiftBtn = 0;
            for (var itemsIndex = 0; itemsIndex < serverData.allProductGiftPreferDetail[allGiftTitleIndex].items.length; itemsIndex++) {

                if (serverData.allProductGiftPreferDetail[allGiftTitleIndex].items[itemsIndex].iGiftItemType == 1) {
                    serverData.allProductGiftPreferDetail[allGiftTitleIndex].item.isShowGiftBtn = 1;
                    serverData.allProductGiftPreferDetail[allGiftTitleIndex].item.ids = serverData.allProductGiftPreferDetail[allGiftTitleIndex].items[itemsIndex].id;
                }
            }
            var allGiftProjectList = [];
            for (var allGiftListIndex = 0; allGiftListIndex < serverData.lsCart.length; allGiftListIndex++) {
                if (serverData.allProductGiftPreferDetail[allGiftTitleIndex].item.iGiftPreId == serverData.lsCart[allGiftListIndex].activityId && serverData.lsCart[allGiftListIndex].isGiftProduct) {
                    allGiftProjectList.push(serverData.lsCart[allGiftListIndex]);
                    serverData.lsCart.splice(allGiftListIndex, 1);
                    allGiftListIndex--;
                }
            }
            serverData.allProductGiftPreferDetail[allGiftTitleIndex].allGiftProjectList = allGiftProjectList;
            // 排序，将推广码满赠放到上面
            //if (serverData.allProductGiftPreferDetail[allGiftTitleIndex].prefer.isSpreadCode != 0) {
            //    allProductGiftPreferTemp.push(serverData.allProductGiftPreferDetail[allGiftTitleIndex]);
            //} else {
            //    allProductGiftInviteCode.push(serverData.allProductGiftPreferDetail[allGiftTitleIndex]);
            //}
        }
        // 排序，将推广码满赠放到上面
        //for (var giftInviteCodeIndex = 0; giftInviteCodeIndex < allProductGiftInviteCode.length; giftInviteCodeIndex++) {
        //    allProductGiftPreferTemp.push(allProductGiftInviteCode[giftInviteCodeIndex]);
        //}
        //serverData.allProductGiftPreferDetail = allProductGiftPreferTemp;
        // 所有商品的满赠活动以及推广码满赠活动结束
        // 截获所有满赠活动类型为全部商品及推广码的赠品结束
        serverData.lsCart.forEach(function (item) {
            var skuid = item.iSKUId;
            if (!skuid) return;
            var uuid = item.sPackageUUID;
            if (uuid) {
                var key = 'key' + uuid;
                if (map[key]) {
                    map[key].push(item);
                    if (item.canPurchaseCount != null) {
                        item.canPerPurchaseCount = item.canPurchaseCount;
                        item.canPurchaseCount = item.canPerPurchaseCount * map[key][0].iQuantity;
                    }
                } else {
                    map[key] = [item];
                }
                obj.map[uuid + '|' + skuid] = item;
            } else {
                var skuGuid = _self.guidFunc();
                map['key' + skuGuid] = [item];
                obj.map[skuid] = item;
            }
            obj.sku[skuid] = item.oSKU.lInventoryCount;
            if (item.bIsMain !== false && item.canPurchaseCount != null)
                obj.product[item.iProductId] = item.canPurchaseCount;
        });
        var list = [];
        for (var key in map) {
            var val = map[key];
            if (val.length) {
                var singleTotalPrice = 0;
                var newSingleTotalPrice = 0;
                var index = 0;
                val.forEach(function (item) {
                    if (item.productAttribute == 1) {// 普通商品
                        singleTotalPrice += item.fNewSalePrice * item.iQuantity;
                        newSingleTotalPrice = item.fNewSalePrice * item.iQuantity;
                    } else if (item.productAttribute == 2) {// 其它商品
                        singleTotalPrice += item.salePoints * item.iQuantity;
                        if (item.oSKU) {
                            newSingleTotalPrice = item.oSKU.salePoints * item.iQuantity;
                        } else {
                            newSingleTotalPrice = item.salePoints * item.iQuantity;
                        }
                        
                    }

                    val[index].newSingleTotalPrice = parseFloat(newSingleTotalPrice).toFixed(2);
                    val[index].fNewSalePrice = parseFloat(item.fNewSalePrice).toFixed(2);
                    val[index].fSalePrice = parseFloat(item.fSalePrice).toFixed(2);
                    // 之前价格和最新价格的大小标志 降价为true
                    val[index].priceFlag = val[index].fSalePrice - val[index].fNewSalePrice > 0 ? true : false;
                    //<#if((svalue.lPackageId&&svalue.bIsMain=="0") &&(svalue.fNewSalePrice!=svalue.fSalePrice)){#>
                    if ((val[index].lPackageId && !val[index].bIsMain) && (val[index].fNewSalePrice != val[index].fSalePrice)) {
                        val[index].secondCompareFlag = true;
                    } else {
                        val[index].secondCompareFlag = false;
                    }
                    //<#if(!(svalue.lPackageId&&svalue.bIsMain=="0" )&&svalue.isLogin===1&&svalue.fNewSalePrice!=svalue.fSalePrice){#>
                    if (!(val[index].lPackageId && !val[index].bIsMain) && (val[index].fNewSalePrice != val[index].fSalePrice)) {
                        val[index].thirdCompareFlag = true;
                    } else {
                        val[index].thirdCompareFlag = false;
                    }
                    // 满赠活动领取活动礼品的ID
                    item.giftActiveId = "";
                    // 满赠活动id
                    item.giftPromotionId = "";
                    index++;
                });
                val[0].singleTotalPrice = singleTotalPrice;
                list.push(val);
            } else {
                if (val.productAttribute == 1) {// 普通商品
                    val.singleTotalPrice = val.fNewSalePrice * val.iQuantity;
                    val.isVirtualProduct = false;
                    val.newSingleTotalPrice = parseFloat(val.fNewSalePrice * val.iQuantity).toFixed(2);
                } else if (val.productAttribute == 2) { // 积分商品
                    val.singleTotalPrice = val.salePoints * val.iQuantity;
                    val.isVirtualProduct = true;
                    if (val.oSKU) {
                        val.newSingleTotalPrice = parseFloat(val.oSKU.salePoints * val.iQuantity).toFixed(2);
                    } else {
                        val.newSingleTotalPrice = parseFloat(val.salePoints * val.iQuantity).toFixed(2);
                    }
                    
                }

                val.fNewSalePrice = parseFloat(val.fNewSalePrice).toFixed(2);
                val.fSalePrice = parseFloat(val.fSalePrice).toFixed(2);
                // 之前价格和最新价格的大小标志 降价为true
                val.priceFlag = val.fSalePrice - val.fNewSalePrice > 0 ? true : false;
                // 满赠活动领取活动礼品的ID
                val.giftActiveId = "";
                // 满赠活动id
                item.giftPromotionId = "";
                list.push([val]);
            }
        }
        // 组合主商品失效或下架的标志
        for (var j = 0; j < list.length; j++) {
            if (list[j].length > 1 || list[j][0].lPackageId) {
                var commonProductAllChecked = true;
                // 套餐总价格
                var commonProductTotalPrice = 0;
                for (var k = 0; k < list[j].length; k++) {
                    if ((list[j][0].oSKU.iStatus == 0) || (!list[j][0].packageValid)) {
                        list[j][k].isCommonAble = false;
                    } else {
                        if ((list[j][k].oSKU.iStatus == 0) || (!list[j][k].packageValid)) {
                            list[j][k].isCommonAble = false;
                        } else {

                            list[j][k].isCommonAble = true;
                        }

                    }
                    // 组合商品是否全部被选中的标志
                    if (!list[j][k].isChecked) {
                        commonProductAllChecked = false;
                    }
                    list[j][k].commonProductAllChecked = commonProductAllChecked;
                    commonProductTotalPrice += list[j][k].fNewSalePrice * list[j][k].iQuantity;
                    // 限购提示
                    if (list[j][k].lPackageId && !list[j][k].bIsMain) {
                        if (list[j][k].canPurchaseCount || list[j][k].canPurchaseCount == 0) {
                            var canBuynumber = list[j][k].canPurchaseCount > list[j][k].oSKU.lInventoryCount ? list[j][k].oSKU.lInventoryCount : list[j][k].canPurchaseCount;
                            list[j][k].canPurchaseTip = "可购买" + canBuynumber + "件";
                            list[j][k].limitCountTip = "限购" + list[j][k].canPerPurchaseCount + "件";
                        } else {
                            if (list[j][k].tipMessage) {
                                if (list[j][k].tipMessage.indexOf("-1") > 0) {
                                    list[j][k].canPurchaseTip = "";
                                    list[j][k].limitCountTip = "不限购";
                                } else if (list[j][k].tipMessage.indexOf("0") > 0) {
                                    list[j][k].canPurchaseTip = "";
                                    list[j][k].limitCountTip = "首件优惠";
                                }
                            }

                        }

                    } else {
                        if (list[j][k].promotion) {
                            if (list[j][k].promotion.lType == -1) {
                                list[j][k].canPurchaseTip = "";
                                list[j][k].limitCountTip = "不限购";
                            } else if (list[j][k].promotion.lType == 0) {
                                list[j][k].canPurchaseTip = "";
                                list[j][k].limitCountTip = "首件优惠";
                            } else {
                                if (list[j][k].canPurchaseCount || list[j][k].canPurchaseCount == 0) {
                                    var canBuynumber = list[j][k].canPurchaseCount > list[j][k].oSKU.lInventoryCount ? list[j][k].oSKU.lInventoryCount : list[j][k].canPurchaseCount;
                                    list[j][k].canPurchaseTip = "可购买" + canBuynumber + "件";
                                    if (list[j][k].promotion.lType == 4) {
                                        list[j][k].limitCountTip = "限购" + list[j][k].promotion.lTypeNum + "件";
                                    } else {
                                        list[j][k].limitCountTip = "限购" + list[j][k].promotion.lType + "件";
                                    }

                                } else {
                                    var canBuynumber = list[j][k].promotion.lTypeNum > list[j][k].oSKU.lInventoryCount ? list[j][k].oSKU.lInventoryCount : list[j][k].promotion.lType;
                                    if (list[j][k].promotion.lType == 4) {
                                        canBuynumber = list[j][k].promotion.lTypeNum > list[j][k].oSKU.lInventoryCount ? list[j][k].oSKU.lInventoryCount : list[j][k].promotion.lTypeNum;
                                    }
                                    list[j][k].canPurchaseTip = "可购买" + canBuynumber + "件";
                                    if (list[j][k].promotion.lType == 4) {
                                        list[j][k].limitCountTip = "限购" + list[j][k].promotion.lTypeNum + "件";
                                    } else {
                                        list[j][k].limitCountTip = "限购" + list[j][k].promotion.lType + "件";
                                    }
                                }

                            }
                        }
                    }
                }
                // 套餐总价格
                list[j][0].commonProductTotalPrice = parseFloat(commonProductTotalPrice).toFixed(2);


            } else {
                list[j][0].isCommonAble = true;
                // 限购提示
                if (list[j][0].promotion) {
                    if (list[j][0].promotion.lType == -1) {
                        list[j][0].canPurchaseTip = "";
                        list[j][0].limitCountTip = "不限购";
                    } else if (list[j][0].promotion.lType == 0) {
                        list[j][0].canPurchaseTip = "";
                        list[j][0].limitCountTip = "首件优惠";
                    } else {
                        if (list[j][0].canPurchaseCount || list[j][0].canPurchaseCount == 0) {
                            var canBuynumber = list[j][0].canPurchaseCount > list[j][0].oSKU.lInventoryCount ? list[j][0].oSKU.lInventoryCount : list[j][0].canPurchaseCount;
                            list[j][0].canPurchaseTip = "可购买" + canBuynumber + "件";
                            if (list[j][0].promotion.lType == 4) {
                                list[j][0].limitCountTip = "限购" + list[j][0].promotion.lTypeNum + "件";
                            } else {
                                list[j][0].limitCountTip = "限购" + list[j][0].promotion.lType + "件";
                            }

                        } else {
                            var canBuynumber = list[j][0].promotion.lTypeNum > list[j][0].oSKU.lInventoryCount ? list[j][0].oSKU.lInventoryCount : list[j][0].promotion.lType;
                            if (list[j][0].promotion.lType == 4) {
                                canBuynumber = list[j][0].promotion.lTypeNum > list[j][0].oSKU.lInventoryCount ? list[j][0].oSKU.lInventoryCount : list[j][0].promotion.lTypeNum;
                            }
                            list[j][0].canPurchaseTip = "可购买" + canBuynumber + "件";
                            if (list[j][0].promotion.lType == 4) {
                                list[j][0].limitCountTip = "限购" + list[j][0].promotion.lTypeNum + "件";
                            } else {
                                list[j][0].limitCountTip = "限购" + list[j][0].promotion.lType + "件";
                            }

                        }

                    }
                }
            }
        }
        // 对满赠进行处理
        list = _self.handleCartGiftData(list);
        for (var i = 0; i < list.length; i++) {
            var isCheckedFlag = false;
            for (var k = 0; k < list[i].length; k++) {
                // 满赠促销处理开始
                // 不是组合商品
                if (!list[i][k].lPackageId) {
                    // 存在满赠活动
                    if (list[i][k].activityId && list[i][k].giftPreferDetail) {

                        list[i][k].isValid = list[i][k].giftPreferDetail.isValid;
                        // 满赠子活动id
                        list[i][k].giftActiveId = list[i][k].giftPreferDetail.item.id;
                        // 满赠活动id
                        list[i][k].giftPromotionId = list[i][k].activityId;
                        if (list[i][k].isChecked) {
                            isCheckedFlag = true;
                        }
                    }
                }
            }
            list[i][0].isCheckedFlag = isCheckedFlag;
        }
        return { list: list, allProductGiftPreferDetail: serverData.allProductGiftPreferDetail, amount: serverData.lsCart.length, obj: obj };
        //return { list: list, amount: serverData.length, obj: obj };
    };
    // 修改购物车中商品数量方法
    view.prototype.updatesCart = function (shoppingCart, callback) {
        var proxy = cb.rest.DynamicProxy.create({ updateCart: { url: 'client/ShoppingCarts/update', method: 'POST', options: { token: true } } });
        proxy.updateCart(shoppingCart, function (err, result) {
            callback(err, result);
        });
    }
    // 注册动态内容事件
    view.prototype.RegeistEvent = function () {
        var self = this;
        var thisView = this.getView().find('.cartNew-list');
        // 组合促销功能注释，后期开发放开
        //// 组合套餐数量增加
        //thisView.find('.commonAdd').on('click', function () {
        //    var _self = this;
        //    // 套餐的数量
        //    var commonProductQuantity = $$(_self).parents('.commonManager').find(".commonQuantityInput").val();
        //    // 套餐下每个商品数量
        //    var singleProductQuantity = $$(_self).parents('.productItemContent').find(".singleProductQuantity");
        //    // 套餐下每个商品的价格
        //    var singleProductPriceList = $$(_self).parents('.productItemContent').find(".newSinglePrice");
        //    var shoppingCart = {};
        //    var itemsArray = new Array();
        //    $$.each(singleProductQuantity, function (index, value) {
        //        // 获得更新购物车的dataset参数
        //        var dataset = $$(singleProductQuantity[index]).dataset();
        //        // 套餐的数量
        //        dataset.iPackageNum = parseInt(commonProductQuantity) + 1;
        //        // 商品的数量
        //        dataset.iQuantity = parseInt(commonProductQuantity) + 1;
        //        itemsArray.push(dataset);
        //    });
        //    // 只有在浏览状态下才实时更新商品数量，编辑状态下点击完成进行更新
        //    if (view.prototype.isShowEditor) {
        //        shoppingCart.items = itemsArray;
        //        self.updatesCart(shoppingCart, function (err, result) {
        //            if (err) {
        //                return;
        //            } else {
        //                commonProductQuantity++;
        //                $$(_self).parents('.commonManager').find(".commonQuantityInput").val(commonProductQuantity);
        //                self.changeCommnoNumFunc(commonProductQuantity, singleProductQuantity, singleProductPriceList, result);
        //                self.calcTotalPrice();
        //            }
        //        });
        //    } else {
        //        // 编辑状态下
        //        commonProductQuantity++;
        //        $$(_self).parents('.commonManager').find(".commonQuantityInput").val(commonProductQuantity);
        //        self.changeCommnoNumFunc(commonProductQuantity, singleProductQuantity, singleProductPriceList, "");
        //    }


        //});
        //// 组合套餐数量减少
        //thisView.find('.commonLess').on('click', function () {
        //    var _self = this;
        //    var commonProductQuantity = $$(_self).parents('.commonManager').find(".commonQuantityInput").val();
        //    if (parseInt(commonProductQuantity) > 1) {
        //        // 套餐下每个商品的数量
        //        var singleProductQuantity = $$(this).parents('.productItemContent').find(".singleProductQuantity");
        //        // 套餐下每个商品的价格
        //        var singleProductPriceList = $$(_self).parents('.productItemContent').find(".newSinglePrice");
        //        var shoppingCart = {};
        //        var itemsArray = new Array();
        //        $$.each(singleProductQuantity, function (index, value) {
        //            // 获得更新购物车的dataset参数
        //            var dataset = $$(singleProductQuantity[index]).dataset();
        //            dataset.iPackageNum = parseInt(commonProductQuantity) - 1;
        //            dataset.iQuantity = dataset.iPackageNum;
        //            itemsArray.push(dataset)
        //        });
        //        // 只有在浏览状态下才实时更新商品数量，编辑状态下点击完成进行更新
        //        if (view.prototype.isShowEditor) {
        //            shoppingCart.items = itemsArray;
        //            self.updatesCart(shoppingCart, function (err, result) {
        //                if (err) {
        //                    return;
        //                } else {
        //                    commonProductQuantity--;
        //                    $$(_self).parents('.commonManager').find(".commonQuantityInput").val(commonProductQuantity);
        //                    self.changeCommnoNumFunc(commonProductQuantity, singleProductQuantity, singleProductPriceList, result);
        //                    self.calcTotalPrice();
        //                }

        //            });
        //        } else {
        //            // 编辑状态下
        //            commonProductQuantity--;
        //            $$(_self).parents('.commonManager').find(".commonQuantityInput").val(commonProductQuantity);
        //            self.changeCommnoNumFunc(commonProductQuantity, singleProductQuantity, singleProductPriceList, "");
        //        }

        //    }

        //});
        // 单个商品数量增加
        thisView.find('.singleProductAdd').on('click', function () {
            var _self = this;
            self.addOrLessClick = true;
            var productQuantity = $$(this).parent('.numberManage').find(".singleProductQuantity").val();
            // 获得更新购物车的dataset参数
            var dataset = $$(this).parent('.numberManage').find(".singleProductQuantity").dataset();
            if (dataset.canPurchaseCount) {
                dataset.lInventoryCount = dataset.lInventoryCount > dataset.canPurchaseCount ? dataset.canPurchaseCount : dataset.lInventoryCount
            }
            // 将组合商品操作封上，后续开发放开
            if (!dataset.lPackageId) {
                dataset.iQuantity = parseInt(dataset.iQuantity) + 1;
                // 根据库存与购买数量比较
                if (dataset.iQuantity > dataset.lInventoryCount) {
                    $$(this).addClass("disabled");
                    return;
                } else {
                    $$(this).parent('.numberManage').find(".singleProductLess").removeClass("disabled");
                }
                // 只有在浏览状态下才实时更新商品数量，编辑状态下点击完成进行更新
                if (view.prototype.isShowEditor) {
                    // 更新购物车数量
                    var shoppingCart = {};
                    shoppingCart.items = [dataset];
                    self.updatesCart(shoppingCart, function (err, result) {
                        if (err) {
                            return;
                        } else {
                            // 最新单价
                            $$(_self).parents('.cartSkuAndPrice').find(".newSinglePrice").text(parseFloat(result[0].fNewSalePrice).toFixed(2));
                            $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice", parseFloat(result[0].fNewSalePrice).toFixed(2));
                            // 单价
                            var singleProductPrice = $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice");
                            // 数量加1
                            $$(_self).parent('.numberManage').find(".singleProductQuantity").val(parseInt(productQuantity) + 1);
                            // 改变dataset里面的数量
                            $$(_self).parent('.numberManage').find(".singleProductQuantity").attr('data-i-Quantity', parseInt(productQuantity) + 1);
                            // 单个商品的总价格
                            $$(_self).parent().prev('.price.newSingleTotalPrice').text("￥" + parseFloat(singleProductPrice * (parseInt(productQuantity) + 1)).toFixed(2));
                            self.productCheckboxSelectFunc(false, false);
                        }

                    });
                } else {
                    // 编辑状态下
                    // 单价
                    var singleProductPrice = $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice");
                    // 数量加1
                    $$(_self).parent('.numberManage').find(".singleProductQuantity").val(parseInt(productQuantity) + 1);
                    // 改变dataset里面的数量
                    $$(_self).parent('.numberManage').find(".singleProductQuantity").attr('data-i-Quantity', parseInt(productQuantity) + 1);
                    // 单个商品的总价格
                    $$(_self).parent().prev('.price.newSingleTotalPrice').text("￥" + parseFloat(singleProductPrice * (parseInt(productQuantity) + 1)).toFixed(2));
                }
            }


        });
        // 单个商品数量减少
        thisView.find('.singleProductLess').on('click', function () {
            self.addOrLessClick = true;
            var productQuantity = $$(this).parent('.numberManage').find(".singleProductQuantity").val();
            var _self = this;
            if (parseInt(productQuantity) > 1) {
                // 获得更新购物车的dataset参数
                var dataset = $$(this).parent('.numberManage').find(".singleProductQuantity").dataset();
                // 将组合商品操作封上，后续开发放开
                if (!dataset.lPackageId) {
                    dataset.iQuantity = parseInt(dataset.iQuantity) - 1;
                    // 根据库存与购买数量比较
                    if (dataset.iQuantity > dataset.lInventoryCount || dataset.iQuantity == dataset.lInventoryCount) {
                        $$(this).parent('.numberManage').find(".singleProductAdd").addClass("disabled");
                    } else {
                        $$(this).parent('.numberManage').find(".singleProductAdd").removeClass("disabled")
                    }
                    // 只有在浏览状态下才实时更新商品数量，编辑状态下点击完成进行更新
                    if (view.prototype.isShowEditor) {
                        // 更新购物车数量
                        var shoppingCart = {};
                        shoppingCart.items = [dataset];
                        self.updatesCart(shoppingCart, function (err, result) {
                            if (err) {
                                return;
                            } else {
                                // 数量减一
                                $$(_self).parent('.numberManage').find(".singleProductQuantity").val(parseInt(productQuantity) - 1);
                                // 最新单价
                                $$(_self).parents('.cartSkuAndPrice').find(".newSinglePrice").text(parseFloat(result[0].fNewSalePrice).toFixed(2));
                                $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice", parseFloat(result[0].fNewSalePrice).toFixed(2));
                                // 获得单价
                                var singleProductPrice = $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice");
                                $$(_self).parent('.numberManage').find(".singleProductQuantity").attr('data-i-Quantity', parseInt(productQuantity) - 1);
                                // 单个商品的总价格
                                $$(_self).parent().prev('.price.newSingleTotalPrice').text("￥" + parseFloat(singleProductPrice * (parseInt(productQuantity) - 1)).toFixed(2));
                                self.productCheckboxSelectFunc(false, false);
                            }

                        });
                    } else {
                        // 编辑状态下
                        // 数量减一
                        $$(_self).parent('.numberManage').find(".singleProductQuantity").val(parseInt(productQuantity) - 1);
                        // 获得单价
                        var singleProductPrice = $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice");
                        $$(_self).parent('.numberManage').find(".singleProductQuantity").attr('data-i-Quantity', parseInt(productQuantity) - 1);
                        // 单个商品的总价格
                        $$(_self).parent().prev('.price.newSingleTotalPrice').text("￥" + parseFloat(singleProductPrice * (parseInt(productQuantity) - 1)).toFixed(2));
                    }
                }

            } else {
                $$(this).addClass("disabled");
            }
        });
        // 商品数量输入框改动
        self.getView('.numberManage').find('input').blur(function (e) {
            var _self = this;
            var productQuantity = $$(this).val();
            // 获得更新购物车的dataset参数
            var dataset = $$(this).dataset();
            // 将组合商品操作封上，后续开发放开
            if (!dataset.lPackageId) {
                if (!$$(this).val()) {
                    myApp.toast('不能为空', 'tips').show(true);
                    $$(this).val(dataset.iQuantity);
                    return;
                }
                if (isNaN($$(this).val())) {
                    myApp.toast('请输入数字', 'tips').show(true);
                    $$(this).val(dataset.iQuantity);
                    return;
                }
                if ($$(this).val() == "0") {
                    myApp.toast('至少买1件', 'tips').show(true);
                    $$(this).val(dataset.iQuantity);
                    return;
                }
                // 根据库存与购买数量比较
                if (dataset.canPurchaseCount) {
                    dataset.lInventoryCount = dataset.lInventoryCount > dataset.canPurchaseCount ? dataset.canPurchaseCount : dataset.lInventoryCount
                }
                if (parseInt($$(this).val()) > parseInt(dataset.lInventoryCount)) {
                    myApp.toast('库存不足', 'tips').show(true);
                    $$(this).val(dataset.iQuantity);
                    return;
                } else if (parseInt($$(this).val()) == parseInt(dataset.lInventoryCount)) {
                    $$(this).parent('.numberManage').find(".singleProductAdd").addClass("disabled");
                    if (parseInt($$(this).val()) > 1) {
                        $$(this).parent('.numberManage').find(".singleProductLess").removeClass("disabled");
                    } else {
                        $$(this).parent('.numberManage').find(".singleProductLess").addClass("disabled");
                    }
                    return;
                } else {
                    dataset.iQuantity = $$(this).val();
                    $$(this).parent('.numberManage').find(".singleProductAdd").removeClass("disabled");
                    if (parseInt($$(this).val()) > 1) {
                        $$(this).parent('.numberManage').find(".singleProductLess").removeClass("disabled");
                    } else {
                        $$(this).parent('.numberManage').find(".singleProductLess").addClass("disabled");
                    }
                }
                // 只有在浏览状态下才实时更新商品数量，编辑状态下点击完成进行更新
                if (view.prototype.isShowEditor) {
                    // 更新购物车数量
                    var shoppingCart = {};
                    shoppingCart.items = [dataset];
                    self.updatesCart(shoppingCart, function (err, result) {
                        if (err) {
                            return;
                        } else {
                            $$(_self).parent().find('i').addClass('hide');
                            // 最新单价
                            $$(_self).parents('.cartSkuAndPrice').find(".newSinglePrice").text(parseFloat(result[0].fNewSalePrice).toFixed(2));
                            $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice", parseFloat(result[0].fNewSalePrice).toFixed(2));
                            // 单价
                            var singleProductPrice = $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice");
                            // 数量加1
                            $$(_self).parent('.numberManage').find(".singleProductQuantity").val(dataset.iQuantity);
                            // 改变dataset里面的数量
                            $$(_self).parent('.numberManage').find(".singleProductQuantity").attr('data-i-Quantity', dataset.iQuantity);
                            // 单个商品的总价格
                            $$(_self).parent().prev('.price.newSingleTotalPrice').text("￥" + parseFloat(singleProductPrice * (parseInt(dataset.iQuantity))).toFixed(2));
                            self.productCheckboxSelectFunc(false, false);
                        }

                    });
                } else {
                    // 编辑状态下
                    $$(_self).parent().find('i').addClass('hide');
                    // 单价
                    var singleProductPrice = $$(_self).parent('.numberManage').find(".singleProductQuantity").data("singlePrice");
                    // 数量加
                    $$(_self).parent('.numberManage').find(".singleProductQuantity").val(dataset.iQuantity);
                    // 改变dataset里面的数量
                    $$(_self).parent('.numberManage').find(".singleProductQuantity").attr('data-i-Quantity', dataset.iQuantity);
                    // 单个商品的总价格
                    $$(_self).parent().prev('.price.newSingleTotalPrice').text("￥" + parseFloat(singleProductPrice * (parseInt(dataset.iQuantity))).toFixed(2));
                }
            }
        });
        // 输入框点击显示加减
        //self.getView('.numberManage').find('input').click(function (e) {
        //    $$(this).parent().find('i').removeClass('hide');
        //});
        // 套餐全选按钮功能
        self.getView().find('.commonCheckboxDiv').on('click', function (e) {
            if (e.handled !== true) {
                e.handled = true;
                var isCheck = $$(this).parents('.common-allSelect').find('input[type="checkbox"][name="common-checkbox"]').prop('checked');
                // 找到当前组合下的索引商品对应的checkBox
                var selectChildItem = $$(this).parents('.productItemContent').find('input[type="checkbox"][name="cartItemCheckbox"]');
                if (!isCheck) {
                    selectChildItem.each(function () {
                        // 全部赋值1
                        $$(this).attr('datachecked', "1");
                    });
                } else {
                    selectChildItem.each(function () {
                        // 全部赋值0
                        $$(this).attr('datachecked', "0");
                    });
                }
                // 浏览状态下进行检验限购
                if (view.prototype.isShowEditor) {
                    // 礼品卡处理
                    if (!self.readlVirtualProductDeal()) {
                        selectChildItem.each(function () {
                            // 全部赋值0
                            $$(this).attr('datachecked', "0");
                            $$(this).prop('checked', false);
                        });
                        $$(this).parents('.common-allSelect').find('input[type="checkbox"][name="common-checkbox"]').prop('checked', true);
                    }
                    
                    // 限购校验
                    var isSuccess = self.amountControlFunc(view.prototype.obj);
                    if (!isSuccess) {
                        selectChildItem.each(function () {
                            // 全部赋值0
                            $$(this).attr('datachecked', "0");
                            $$(this).prop('checked', false);
                        });
                        $$(this).parents('.common-allSelect').find('input[type="checkbox"][name="common-checkbox"]').prop('checked', true);
                        return;
                    }
                }

                // 判断是否商品全部选中，全部选中的话全选按钮勾上
                var selectChildItem = $$("input[type=checkbox][name=cartItemCheckbox][datachecked='1']");
                if (selectChildItem.length == view.prototype.cartTotalNum) {
                    self.getView().find('.cartCheckAll').prop('checked', true);
                } else {
                    self.getView().find('.cartCheckAll').prop('checked', false);
                }
                self.productCheckboxSelectFunc(false, false);
            }

        });
        // 单个商品check触发
        self.getView().find('.singleCartItemCheckBox').on('click', function (e) {
            e.stopPropagation();
            var isCheck = $$(this).parent('.cartItemCheckboxLabel').find('input[type="checkbox"][name="cartItemCheckbox"]').prop('checked');
            if (isCheck) {
                $$(this).parent('.cartItemCheckboxLabel').find('input[type="checkbox"][name="cartItemCheckbox"]').attr('datachecked', "0");
            } else {
                $$(this).parent('.cartItemCheckboxLabel').find('input[type="checkbox"][name="cartItemCheckbox"]').attr('datachecked', "1");
            }
            // 只有在浏览状态下判定限购，编辑状态下不判定限购
            if (view.prototype.isShowEditor) {
                // 不同类型商品不能一起选择处理
                if (!self.readlVirtualProductDeal()) {
                    $$(this).parent('.cartItemCheckboxLabel').find('input[type="checkbox"][name="cartItemCheckbox"]').attr('datachecked', "0");
                    $$(this).parent('.cartItemCheckboxLabel').find('input[type="checkbox"][name="cartItemCheckbox"]').prop('checked', true);
                    
                }
               
                // 限购判断
                var isSuccess = self.amountControlFunc(view.prototype.obj);
                if (!isSuccess) {
                    $$(this).parent('.cartItemCheckboxLabel').find('input[type="checkbox"][name="cartItemCheckbox"]').attr('datachecked', "0");
                    $$(this).parent('.cartItemCheckboxLabel').find('input[type="checkbox"][name="cartItemCheckbox"]').prop('checked', true);
                    return;
                }
            }
            // 判断是否商品全部选中，全部选中的话全选按钮勾上
            var selectChildItem = self.getView().find("input[type=checkbox][name=cartItemCheckbox][datachecked='1']");
            if (selectChildItem.length == view.prototype.cartTotalNum) {
                self.getView().find('.cartCheckAll').prop('checked', true);
                self.getView().find('input[type="checkbox"][name="common-checkbox"]').prop('checked', true);
            } else {
                self.getView().find('.cartCheckAll').prop('checked', false);
            }
            if (view.prototype.isShowEditor) {
                self.productCheckboxSelectFunc(false, false);
            }

        });
        // 监测确认订单页面返回  清除缓存数据
        $$(document).on('pageAfterBack', '.page[data-page="confirmOrder"],.page[data-page="confirmExchangeOrder"]', function (e) {
            cb.cache.clear();
            if (self.getView().find('.icon-only.cartBack').hasClass('hide'))
                myApp.showToolbar('.toolbar.homeNavBar');
            else
                myApp.hideToolbar('.toolbar.homeNavBar');
        });
        // 单个商品选择按钮限制f7自动触发checkbox方法
        thisView.find('.cartItemCheckboxLabel').on('click', function (e) {
            if ($$(e.target).attr('class') !== "icon icon-form-checkbox" && $$(e.target).attr('class') !== "productImage" && $$(e.target).attr('class') !== "item-text productName" && $$(e.target).attr('class') !== "editControl singleProductQuantity") {
                var isCheck = $$(this).find('input[type="checkbox"][name="cartItemCheckbox"]').prop('checked');
                $$(this).find('input[type="checkbox"][name="cartItemCheckbox"]').prop('checked', !isCheck);
            }
        });
        // 组合按钮限制f7自动触发checkbox方法
        thisView.find('.common-allSelect').on('click', function (e) {
            if ($$(e.target).attr('class') !== "icon icon-form-checkbox" && $$(e.target).attr('class') !== "editControl commonQuantityInput") {
                var isCheck = $$(this).find('input[type="checkbox"][name="common-checkbox"]').prop('checked');
                $$(this).find('input[type="checkbox"][name="common-checkbox"]').prop('checked', !isCheck);
            }

        });
        // 图片单个商品删除按钮
        self.getView().find('.icon-singleProject-del').click(function (e) {
            var dataset = $$(this).dataset();
            myApp.confirm('您确定要删除吗?', '提示信息', function () {
                // 获得参数
                var shoppingCart = {};
                var itemsArray = new Array();
                itemsArray.push({ id: dataset.id, bIsMain: dataset.bIsMain });
                shoppingCart.items = itemsArray;
                var proxy = cb.rest.DynamicProxy.create({ del: { url: 'client/ShoppingCarts/del', method: 'POST', options: { token: true } } });
                proxy.del(shoppingCart, function (err, result) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    }
                    myApp.toast('删除成功', 'success').show(true);
                    myApp.mainView.router.refreshPage();
                });
            });

        });
        // 图片套餐删除按钮
        self.getView().find('.icon-common-del').click(function (e) {
            var selectedItem = $$(this).parents('.productItemContent').find('input[type=checkbox][name=cartItemCheckbox]');
            myApp.confirm('您确定要删除吗?', '提示信息', function () {
                // 获得参数
                var shoppingCart = {};
                var itemsArray = new Array();
                selectedItem.each(function () {
                    var dataset = $$(this).parents('li.singleProductList').find(".singleProductQuantity").dataset();
                    itemsArray.push({ id: dataset.id, bIsMain: dataset.bIsMain });
                });
                shoppingCart.items = itemsArray;
                var proxy = cb.rest.DynamicProxy.create({ del: { url: 'client/ShoppingCarts/del', method: 'POST', options: { token: true } } });
                proxy.del(shoppingCart, function (err, result) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                        return;
                    }
                    myApp.toast('删除成功', 'success').show(true);
                    myApp.mainView.router.refreshPage();
                });
            });
        });
        // 去逛逛
        self.getView().find('.goView').on('click', function (e) {
            $$('#homeView').trigger('show');
            myApp.showToolbar('.homeNavBar');
            //myApp.mainView.router.back();
        });
        // 满赠功能模块开始
        // 点击查看赠品或领取赠品按钮
        self.getView().find('.viewGiftBtn').on('click', function (e) {
            var _this = this;
            // 选中赠品的数据
            var selecetedGiftItems = [];
            var allType = $$(this).data('type');
            // 赠品集合(子活动)Id
            var giftPreItemId = $$(this).data('giftactiveid');
            view.prototype.activityItemId = $$(this).data('giftactiveid');
            // 满赠活动id
            view.prototype.giftPromotionId = $$(this).data('giftpromotionid');
            // 商品iproductid
            view.prototype.iProductId = $$(this).data('iproductid');
            // 满A送A商品购物车id
            view.prototype.cartId = $$(this).data('cartid');
            // 最多领取赠品的数量
            _this.giftNum = parseInt($$(this).data('giftnum'));
            var params = {};
            // 调用获取相应赠品服务
            // 满赠类型
            view.prototype.iGiftType = $$(this).data('igifttype');
            if (view.prototype.iGiftType == 4) {
                params = {
                    'giftPreItemId': giftPreItemId,
                    'parentId': view.prototype.cartId,
                    'productId': view.prototype.iProductId
                }
            } else {
                params = {
                    'giftPreItemId': giftPreItemId
                }
            }
            if ($$(_this).text().trim() == "查看赠品") {
                // 全部赠品
                params.isDisplayAllPreItems = true;
                selecetedGiftItems = [];

            } else {
                params.isDisplayAllPreItems = false;
                // 获得选中赠品的信息
                if (allType) {
                    var selecetedGiftItemsContainer = $$(this).parents('.allGiftItemList').find('div.selectedGiftList');
                    selecetedGiftItemsContainer.each(function () {
                        var tempData = $$(this).dataset();
                        selecetedGiftItems.push({
                            "iSKUId": tempData.iSKUId,
                            "iQuantity": tempData.iQuantity,
                            "isGiftProduct": true,
                            "isChecked": true,
                            "iProductId": tempData.iProductId
                        });
                    });
                } else {
                    var selecetedGiftItemsContainer = $$(this).parents('.productItemContent').find('div.selectedGiftList');
                    selecetedGiftItemsContainer.each(function () {
                        var tempData = $$(this).dataset();
                        selecetedGiftItems.push({
                            "iSKUId": tempData.iSKUId,
                            "iQuantity": tempData.iQuantity,
                            "isGiftProduct": true,
                            "isChecked": true,
                            "iProductId": tempData.iProductId
                        });
                    });
                }

            }
            var proxy = cb.rest.DynamicProxy.create({ getGiftProductList: { url: 'client/ShoppingCarts/getGiftProductList', method: 'POST', options: { token: true } } });
            proxy.getGiftProductList(params, function (err, data) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                    return;
                } else {
                    if (!data) {
                        data = [];
                    }
                    // 设置标志是查看赠品还是领取赠品
                    if ($$(_this).text().trim() == "查看赠品") {
                        // 全部赠品区别页面显示，如果是查看赠品不显示checkBox、确定和取消按钮，如果是领取赠品则显示
                        data[0].isGetGiftProduct = false;

                    } else {
                        data[0].isGetGiftProduct = true;
                    }
                    var giftData = self.formGiftDataFunc(data, selecetedGiftItems);
                    var giftListHtml = self.render(self.getView().find('#getGiftLists').html(), { giftList: giftData });
                    $$('.popup.popup-prodSUK').html(giftListHtml);
                    if (isIos)
                        $$('.popup.popup-prodSUK').find('.cartGiftQuantityManage').children('input').addClass('ios-editControl');
                    // 最多领取赠品数量
                    $$('.maxGiftNum').text(_this.giftNum);
                    $$('.selectGiftNum').text(selecetedGiftItems.length);
                    myApp.popup('.popup.popup-prodSUK');
                    // 赠品数量减
                    $$('.cartGiftQuantityManage').find('.cartGiftReduce').on('click', function (e) {
                        if (e.handled !== true) // This will prevent event triggering more then once 
                        {
                            e.handled = true;
                            var giftNumber = $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').val();
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftAdd').removeClass("disabled");
                            if (giftNumber < 2 || giftNumber == 2) {
                                $$(this).addClass('disabled');
                                if (giftNumber > 0) {
                                    if (giftNumber == 2) {
                                        giftNumber--;
                                        $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').val(giftNumber);
                                        if (self.selectGiftLimitNumFunc(_this.giftNum)) {
                                            giftNumber++;
                                        }
                                    } else {
                                        self.selectGiftLimitNumFunc(_this.giftNum);
                                    }
                                }

                            } else {
                                giftNumber--;
                                $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').val(giftNumber);
                                if (self.selectGiftLimitNumFunc(_this.giftNum)) {
                                    giftNumber++;
                                }
                            }
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').val(giftNumber);
                        }
                    });
                    // 赠品数量加
                    $$('.cartGiftQuantityManage').find('.cartGiftAdd').on('click', function (e) {
                        if (e.handled !== true) // This will prevent event triggering more then once 
                        {
                            e.handled = true;
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftReduce').removeClass("disabled");
                            var giftNumber = $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').val();
                            // 库存
                            var lInventoryCount = $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').data('inventorycount');
                            if (lInventoryCount) {
                                lInventoryCount = parseInt(lInventoryCount) > parseInt(_this.giftNum) ? parseInt(_this.giftNum) : parseInt(lInventoryCount);
                            }
                            if (giftNumber > lInventoryCount || giftNumber == lInventoryCount) {
                                // 库存不足加号失效
                                $$(this).addClass('disabled');
                                return;
                            } else {
                                giftNumber++;
                                $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').val(giftNumber);
                                if (self.selectGiftLimitNumFunc(_this.giftNum)) {
                                    giftNumber--;
                                    $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').val(giftNumber);
                                    self.selectGiftLimitNumFunc(_this.giftNum);
                                } else {
                                    $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').val(giftNumber);
                                }
                            }

                        }
                    });
                    // 赠品数量输入框改动
                    $$('.cartGiftQuantityManage').find('.cartGiftQuantity').blur(function (e) {
                        if (isNaN($$(this).val())) {
                            myApp.toast('请输入数字', 'tips').show(true);
                            $$(this).val(1)
                            return;
                        }
                        if ($$(this).val() < 0 || $$(this).val() == 0) {
                            $$(this).val(1);
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftReduce').addClass("disabled");
                        } else {
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftReduce').removeClass("disabled");
                        }
                        // 库存
                        var lInventoryCount = $$(this).parent('.cartGiftQuantityManage').find('.cartGiftQuantity').data('inventorycount');
                        if ($$(this).val() > lInventoryCount) {
                            myApp.toast('商品库存不足', 'tips').show(true);
                            $$(this).val(lInventoryCount > 0 ? lInventoryCount : 0);
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftAdd').addClass("disabled");
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftReduce').removeClass("disabled");
                        } else if ($$(this).val() == lInventoryCount) {
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftAdd').addClass("disabled");
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftReduce').removeClass("disabled");
                        } else {
                            $$(this).parent('.cartGiftQuantityManage').find('.cartGiftAdd').removeClass("disabled");
                            if ($$(this).val() > 1) {
                                $$(this).parent('.cartGiftQuantityManage').find('.cartGiftReduce').removeClass("disabled");
                            }
                        }
                        self.selectGiftLimitNumFunc(_this.giftNum);
                    });
                    // 选择赠品checkBox点击事件
                    $$('.giftCheckboxDiv').on('click', function (e) {
                        var giftNum = _this.giftNum;
                        // 赠品数量
                        var cartGiftQuantity = $$(this).parents('.giftListContent').find('.cartGiftQuantity').val();
                        if (isNaN(cartGiftQuantity)) {
                            myApp.toast('请输入数字', 'tips').show(true);
                            return;
                        }
                        // 库存
                        var currentinventorycount = $$(this).parents('.giftListContent').find('.cartGiftQuantity').data('inventorycount');
                        var isCheck = $$(this).parent('.giftListContent').find('input[type="checkbox"][name="giftCheckboxInput"]').prop('checked');
                        if (!isCheck) {
                            if (parseInt(cartGiftQuantity) > parseInt(currentinventorycount)) {
                                $$(this).parent('.giftListContent').find('input[type="checkbox"][name="giftCheckboxInput"]').prop('checked', true);
                                myApp.toast('商品库存不足', 'tips').show(true);
                                return;
                            }
                        }
                        if (isCheck) {
                            $$(this).parent('.giftListContent').find('input[type="checkbox"][name="giftCheckboxInput"]').attr('datachecked', "0");
                        } else {
                            $$(this).parent('.giftListContent').find('input[type="checkbox"][name="giftCheckboxInput"]').attr('datachecked', "1");
                        }
                        if (self.selectGiftLimitNumFunc(giftNum)) {
                            $$(this).parent('.giftListContent').find('input[type="checkbox"][name="giftCheckboxInput"]').attr('datachecked', "0");
                            $$(this).parent('.giftListContent').find('input[type="checkbox"][name="giftCheckboxInput"]').prop('checked', true);
                            self.selectGiftLimitNumFunc(giftNum);
                        }

                    });
                    // 赠品弹出层确定按钮
                    $$('.toolbar').find('.giftOkBtn').on('click', function (e) {
                        if (e.handled !== true) {
                            if (self.selectGiftLimitNumFunc(_this.giftNum)) {
                                e.handled = true;
                                return;
                            } else {
                                e.handled = true;
                                var items = [];
                                // 获得选中的checkbox集合
                                var selectChks = $$(".giftListContent").find("input[type=checkbox][name=giftCheckboxInput]");
                                selectChks.each(function () {
                                    // 每个商品属性种类集合
                                    var iSKUId = $$(this).parents('.giftListContent').find('div.giftSkuid').data('skuid');
                                    // 保证数量必须有值并且为不为0的整数
                                    var iQuantity = $$(this).parents('.giftListContent').find('.cartGiftQuantity').val();
                                    var iProductId = $$(this).parents('.giftListContent').find('.cartGiftQuantity').data('productid');
                                    var isChecked = false;
                                    if ($$(this).attr("datachecked") == "1") {
                                        isChecked = true;
                                    } else {
                                        isChecked = false;
                                    }
                                    if (isNaN(iQuantity) || !iQuantity) {
                                        iQuantity = 1;
                                    }
                                    if (view.prototype.iGiftType == 4) {
                                        items.push({
                                            "iSKUId": iSKUId,
                                            "iQuantity": parseInt(iQuantity),
                                            "isGiftProduct": true,
                                            "activityId": view.prototype.giftPromotionId,
                                            "isChecked": isChecked,
                                            "parentId": view.prototype.cartId,
                                            "activityItemId": view.prototype.activityItemId,
                                            "iProductId": iProductId
                                        });
                                    } else {
                                        items.push({
                                            "iSKUId": iSKUId,
                                            "iQuantity": parseInt(iQuantity),
                                            "isGiftProduct": true,
                                            "activityId": view.prototype.giftPromotionId,
                                            "isChecked": isChecked,
                                            "activityItemId": view.prototype.activityItemId,
                                            "iProductId": iProductId
                                        });
                                    }
                                });
                                var proxy = cb.rest.DynamicProxy.create({ addGiftCarts: { url: 'client/ShoppingCarts/addCarts', method: 'POST', options: { token: true } } });
                                proxy.addGiftCarts({ items: cb.data.JsonSerializer.serialize(items) }, function (getGiftErr, getGiftData) {
                                    if (err) {
                                        myApp.toast(err.message, 'error').show(true);
                                        return;
                                    } else {
                                        self.productCheckboxSelectFunc(false, false);
                                        if ($$('.popup-prodSUK').hasClass('modal-in'))
                                            myApp.closeModal('.popup-prodSUK');
                                        $$('.popup-overlay').removeClass('modal-overlay-visible');
                                    }
                                });
                            }

                        }

                    });
                    // 赠品弹出层取消按钮
                    $$('.toolbar').find('.giftCancelBtn').on('click', function (e) {
                        if ($$('.popup-prodSUK').hasClass('modal-in'))
                            myApp.closeModal('.popup-prodSUK');
                        $$('.popup-overlay').removeClass('modal-overlay-visible');
                    });
                    // 赠品弹出层返回按钮
                    $$('.toolbar').find('.giftReturn').on('click', function (e) {
                        if ($$('.popup-prodSUK').hasClass('modal-in'))
                            myApp.closeModal('.popup-prodSUK');
                        $$('.popup-overlay').removeClass('modal-overlay-visible');
                    });
                    // 限制f7自动触发checkbox方法
                    $$('.giftListContent').on('click', function (e) {
                        if ($$(e.target).attr('class') !== "icon icon-form-checkbox" && $$(e.target).attr('class') !== "cartGiftQuantity" && $$(e.target).attr('class') !== "giftImage" && $$(e.target).attr('class') !== "item-text giftName") {
                            var isCheck = $$(this).find('input[type="checkbox"][name="giftCheckboxInput"]').prop('checked');
                            $$(this).find('input[type="checkbox"][name="giftCheckboxInput"]').prop('checked', !isCheck);
                        }
                    });
                    // 查看商品详情
                    $$('.goProductDetailBtn').on('click', function (e) {
                        var goods_id = $$(this).parents('.giftListContent').find('.goProductDetailBtn').data('id');
                        if ($$('.popup-prodSUK').hasClass('modal-in'))
                            myApp.closeModal('.popup-prodSUK');
                        $$('.popup-overlay').removeClass('modal-overlay-visible');
                        myApp.mainView.router.loadPage({
                            url: 'detail?goods_id=' + goods_id
                        });
                    });
                }
            });
        });
        // 满赠功能模块结束
        //$$('.infinite-scroll').on('infinite', function () {
        //    var startIndex = view.prototype.startIndex;
        //    var endIndex = view.prototype.startIndex + 6;
        //    if (self.rawData && self.rawData.length) {
        //        if (startIndex < self.rawData.length) {
        //            thisView.find('.infinite-scroll-preloader').show();
        //            var cartListHtml = self.render(self.getView().find('#cartItemTpl').html(), { cartList: { list: self.rawData.slice(startIndex, endIndex), allProductGiftPreferDetail: [] } });
        //            // 将每行的信息存储
        //            view.prototype.startIndex = endIndex;
        //            self.getView().find('.cartItemContainer').append(cartListHtml);
        //        } else {
        //            // 加载完毕，则注销无限加载事件，以防不必要的加载
        //            myApp.detachInfiniteScroll($$('.infinite-scroll'));
        //            // 删除加载提示符
        //            $$('.infinite-scroll-preloader').remove();

        //        }

        //    }
        //    self.RegeistEvent();
        //});
    };
    // 格式化：构件属性选择数据源
    view.prototype.FormatAttrDataFunc = function (val, data) {
        if (val) {
            val.iQuantity = data.iQuantity;
            val.fSalePrice = parseFloat(data.fNewSalePrice).toFixed(2);
            val.iSKUId = data.iSKUId;
            for (var i = 0; i < val.lsSpecs.length; i++) {
                var item = val.lsSpecs[i];
                for (var j = 0; j < data.oSKU.lsSkuSpecItems.length; j++) {
                    var selectedItem = data.oSKU.lsSkuSpecItems[j];
                    if (selectedItem.iSpecId == item.id) {
                        for (var k = 0; k < item.lsSpecItem.length; k++) {
                            item.lsSpecItem[k].parentId = item.id;
                            if (item.lsSpecItem[k].id == selectedItem.id)
                                item.lsSpecItem[k].isCheck = true;
                        }
                    }
                }
            }
        }
        return val;
    };
    // 计算所有选中商品价格
    view.prototype.calcTotalPrice = function () {
        var _this = this;
        var total = {
            totalPrice: 0,
            type: 0,
            number: 0
        };
        // 是否积分商品
        var integralProduct = false;
        var selectChildItem = _this.getView().find("input[type=checkbox][name=cartItemCheckbox][datachecked='1']");
        selectChildItem.each(function () {
            if ($$(this).attr("data-productAttribute") == "1") {
                integralProduct = false;
            } else if ($$(this).attr("data-productAttribute") == "2") {
                integralProduct = true;
            }
            total.totalPrice += parseFloat($$(this).parents('.singleProductList').find('.newSingleTotalPrice').text().substr(1));
            total.type++;
            total.number += parseInt($$(this).parents('.singleProductList').find('input.singleProductQuantity').val());
        });
        total.totalPrice = parseFloat(total.totalPrice).toFixed(2);
        if (integralProduct) {
            _this.getView().find('div[data-page="cart"] .cartTotalPrice').text(total.totalPrice + "积分");
        } else {
            _this.getView().find('div[data-page="cart"] .cartTotalPrice').text("￥" + total.totalPrice);
        }

        // _this.getView().find('div[data-page="cart"] .cartClassfyAndCount').text(total.type + "种" + total.number + "件");
    };
    // 改变套餐数量
    view.prototype.changeCommnoNumFunc = function (commonProductQuantity, singleProductQuantity, singleProductPriceList, result) {
        var _this = this;
        $$.each(singleProductQuantity, function (index, value) {
            // 改变数量
            $$(singleProductQuantity[index]).val(commonProductQuantity);
            // 浏览状态下改变，编辑状态下不改变
            if (view.prototype.isShowEditor) {
                // 最新价格
                $$(singleProductPriceList[index]).text(parseFloat(result[index].fNewSalePrice).toFixed(2));
                $$(singleProductQuantity[index]).data("singlePrice", parseFloat(result[index].fNewSalePrice).toFixed(2));
            }
            // 单价
            var singleProductPrice = $$(singleProductQuantity[index]).data("singlePrice");
            // 改变dataset里面的套餐数量
            $$(singleProductQuantity[index]).attr('data-i-package-num', commonProductQuantity);
            // 改变dataset里面的数量
            $$(singleProductQuantity[index]).attr('data-i-Quantity', commonProductQuantity);
            // 单个商品的总价格
            // $$(singleProductQuantity[index]).parent().prev('.price.newSingleTotalPrice').text("￥" + parseFloat(singleProductPrice * (parseInt(commonProductQuantity))).toFixed(2));
        });
    };
    // 判断库存是否充足
    view.prototype.isHaveInventoryFunc = function (iQuantity, inventory, _this) {
        var isHaveInventory = false;
        if (inventory > iQuantity) {
            isHaveInventory = true;
        } else {
            $$(this).addClass("disabled")
        }
        return isHaveInventory;
    };
    // 限购公共方法
    view.prototype.amountControlFunc = function (obj) {
        var _self = this;
        var skuMap = {};
        var productMap = {};
        var selectedProducts = _self.getView().find('input[type=checkbox][name=cartItemCheckbox][datachecked="1"]');
        for (var i = 0, len = selectedProducts.length; i < len; i++) {
            var element = selectedProducts[i];
            var $data = $$(element).parents('li.singleProductList').find('input.singleProductQuantity').dataset();
            $data.iQuantity = $$(element).parents('li.singleProductList').find('input.singleProductQuantity').val();
            var skuId = $data.iSKUId;
            var quantity = parseInt($data.iQuantity);
            if (skuMap[skuId] == null) skuMap[skuId] = 0;
            skuMap[skuId] += quantity;
            if (skuMap[skuId] > obj.sku[skuId]) {
                myApp.toast($data.name + "库存不足", 'tips').show(true);
                return false;
            }
            var productId = $data.iProductId;
            if ($data.bIsMain) {
                if ($data.canPurchaseCount != '') {
                    if (productMap[productId] == null) productMap[productId] = 0;
                    productMap[productId] += quantity;
                    if (obj.product[productId] != null && productMap[productId] > obj.product[productId]) {
                        myApp.toast($data.name + "限购" + obj.product[productId] + "件", "tips").show(true);
                        return false;
                    }
                }
            } else if ($data.lPackageId != '' && !$data.bIsMain) {
                if (parseInt($data.iQuantity) > parseInt($data.canPurchaseCount)) {
                    myApp.toast($data.name + "限购" + $data.canPurchaseCount + "件", "tips").show(true);
                    return false;
                }
            } else {
                if (productMap[productId] == null) {
                    productMap[productId] = 0;
                    productMap[productId] += quantity;
                } else {
                    productMap[productId] += quantity;
                }
                if (parseInt($data.iQuantity) > parseInt($data.canPurchaseCount)) {
                    myApp.toast($data.name + "限购" + $data.canPurchaseCount + "件", "tips").show(true);
                    return false;
                }
                if (obj.product[productId] != null && productMap[productId] > obj.product[productId]) {
                    myApp.toast($data.name + "限购" + obj.product[productId] + "件", "tips").show(true);
                    return false;
                }
            }
        }
        return true;
    };
    // 赠品模块开始
    // 对购物车数据赠品进行处理lsCart
    view.prototype.handleCartGiftData = function (serverData) {
        var _this = this;
        var list = [];
        // 买A送A赠品临时数组
        var tempA = [];
        var map = {};
        for (var i = 0; i < serverData.length; i++) {
            if (serverData[i].length > 1) {
                list.push(serverData[i]);
            } else {
                var key = serverData[i][0].activityId;
                if (key) {
                    if (serverData[i][0].giftPreferDetail) {
                        // 判断子活动中是否有送赠品活动
                        serverData[i][0].giftPreferDetail.item.isShowGiftBtn = 0;
                        for (var itemsIndex = 0; itemsIndex < serverData[i][0].giftPreferDetail.items.length; itemsIndex++) {
                            if (serverData[i][0].giftPreferDetail.items[itemsIndex].iGiftItemType == 1) {
                                serverData[i][0].giftPreferDetail.item.isShowGiftBtn = 1;
                                serverData[i][0].giftPreferDetail.item.ids = serverData[i][0].giftPreferDetail.items[itemsIndex].id;
                            }
                        }
                        // 满A送A的特殊处理
                        if (serverData[i][0].giftPreferDetail.prefer.iGiftType == 4) {
                            if (!serverData[i][0].isGiftProduct) {
                                //var keys = serverData[i][0].id + new Date().getTime();
                                var keys = serverData[i][0].iProductId + key;
                                if (map[keys]) {
                                    map[keys].push(serverData[i][0]);
                                } else {
                                    map[keys] = [serverData[i][0]];
                                }

                            } else {
                                tempA.push(serverData[i][0]);
                            }
                        } else {
                            // 不是满A送A
                            if (map[key]) {
                                map[key].push(serverData[i][0]);

                            } else {
                                map[key] = [serverData[i][0]];
                            }
                        }
                    } else {
                        // 不是满A送A
                        if (map[key]) {
                            map[key].push(serverData[i][0]);

                        } else {
                            map[key] = [serverData[i][0]];
                        }
                    }

                } else {
                    var keys = _this.guidFunc();
                    // var keys = serverData[i][0].iProductId + new Date().getTime() + serverData[i][0].id;
                    map[keys] = [serverData[i][0]];
                }
            }
        }
        // 买A送A时将赠品和商品组合
        if (tempA.length > 0) {
            for (var key in map) {
                var value = map[key];
                if (value[0].giftPreferDetail) {
                    if (value[0].giftPreferDetail.prefer.iGiftType == 4) {
                        for (var i = 0; i < tempA.length; i++) {
                            if (tempA[i].iProductId == value[0].iProductId) {
                                map[key].push(tempA[i]);
                            }
                        }
                    }
                }

            }
        }
        // 买A送A时将赠品和商品组合结束
        var temp = [];
        for (var key in map) {
            var val = map[key];
            if (val.length) {
                temp.push(val);
            } else {
                temp.push([val]);
            }
        }
        for (var i = 0; i < temp.length; i++) {
            //for(var j=0;j<temp[])
            list.push(temp[i]);
        }
        return list;
    }
    // 生成唯一的Key（guid）
    view.prototype.guidFunc = function () {
        function S4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    }
    // 满赠活动选择框触发获得所有商品组成参数传给服务端，获得新的购物车列表
    view.prototype.productCheckboxSelectFunc = function (isSelectAllBtn, isSelectAll) {
        var self = this;
        var ShoppCartItems = new Array();
        var shoppingCart = {};
        var selectChks = self.getView().find("input[type=checkbox][name=cartItemCheckbox]");
        // 是否调用满赠活动中将勾选将标识传给服务端的方法productCheckboxSelectFunc
        selectChks.each(function () {
            var id = $$(this).data('id');
            var isChecked = false;
            var datachecked = $$(this).attr('datachecked');
            if (isSelectAllBtn) {
                if (isSelectAll) {
                    isChecked = true;
                } else {
                    isChecked = false;
                }

            } else {
                if (datachecked == '1') {
                    isChecked = true;
                } else {
                    isChecked = false;
                }
            }

            ShoppCartItems.push({
                id: id,
                isChecked: isChecked
            });
        });
        shoppingCart.cartList = ShoppCartItems;
        var proxy = cb.rest.DynamicProxy.create({ getCartList: { url: 'client/ShoppingCarts/getCartList', method: 'POST', options: { token: true, mask: true } } });
        proxy.getCartList(shoppingCart, function (err, result) {
            if (err) {
                myApp.pullToRefreshDone();
                return;
            }
            var transferData = self.transferServerData(result);
            view.prototype.obj = transferData.obj;
            var $cartList = self.getView().find('.cartNew-list');
            var cartListHtml = self.render(self.getView().find('#cartItemTpl').html(), { cartList: { list: transferData.list, allProductGiftPreferDetail: transferData.allProductGiftPreferDetail } });
            if (result.lsCart.length)
                self.getView().find('.bottom-bar.cart-btn-row').removeClass('hide');
            else
                self.getView().find('.bottom-bar.cart-btn-row').addClass('hide');
            // 将每行的信息存储
            self.rawData = transferData.list;
            view.prototype.startIndex = self.rawData.length;
            self.getView().find('.cartItemContainer').html(cartListHtml);
            self.RegeistEvent();
            // 全部商品的数量
            self.getView().find('.allCartProductCount').text(transferData.amount);
            // 底部导航栏目购物车的数量图标
            $$('.shoppingCartCount').text(transferData.amount);
            view.prototype.cartTotalNum = transferData.amount;
            $$('.shoppingCartCount').show();
            var singleCartItemCheckBoxDiv = self.getView().find('.singleCartItemCheckBox');
            if (view.prototype.isShowEditor) {
                self.getView().find('div[data-page="cart"] .btn-editStatue').attr('data-Type', 'edit').html('编辑');
                // 将失效的商品checkbox变成可用
                $$.each(singleCartItemCheckBoxDiv, function (index, value) {
                    // 失效商品checkbox不可选
                    if ($$(singleCartItemCheckBoxDiv[index]).attr('cartEnable') == "1") {
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).addClass('disabled')
                    }
                    // 组合商品checkbox隐藏
                    if ($$(singleCartItemCheckBoxDiv[index]).attr('commonProduct') == "1") {
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).addClass('cartCheckHide')
                    }
                });
                // 底部菜单的显示和隐藏
                self.getView().find('.cart-balance-container').removeClass('hide');
                self.getView().find('.cart-btn-submit').removeClass('hide');
                self.getView().find('.cart-btn-collection').addClass('hide');
                self.getView().find('.cart-btn-delete').addClass('hide');

            } else {
                self.getView().find('div[data-page="cart"] .btn-editStatue').attr('data-Type', 'submit').html('完成');
                // 将失效的商品checkbox变成可用
                $$.each(singleCartItemCheckBoxDiv, function (index, value) {
                    // 商品失效
                    if ($$(singleCartItemCheckBoxDiv[index]).hasClass('disabled')) {
                        // 让checkbox可选
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).removeClass('disabled');
                        // 添加失效标志
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).attr('cartEnable', "1");
                    }
                    // 显示组合的商品chencbox对其进行编辑
                    if ($$(singleCartItemCheckBoxDiv[index]).hasClass('cartCheckHide')) {
                        // 显示组合商品的checkbox
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).removeClass('cartCheckHide');
                        // 添加组合商品的标志
                        $$(self.getView().find('.singleCartItemCheckBox')[index]).attr('commonProduct', "1")
                    }
                });
                // 底部菜单的显示和隐藏
                self.getView().find('.cart-btn-submit').addClass('hide');
                self.getView().find('.cart-balance-container').addClass('hide');
                self.getView().find('.cart-btn-collection').removeClass('hide');
                self.getView().find('.cart-btn-delete').removeClass('hide');
            }
            self.getView().find('.infinite-scroll-preloader').hide();
            // 计算总价格
            self.calcTotalPrice();
            myApp.pullToRefreshDone();
        });

    }
    // 重组赠品集合的数据，根据SKUID找到对应规格名称并复制
    view.prototype.formGiftDataFunc = function (giftData, selecetedGiftItems) {
        var data = giftData;
        for (var i = 0; i < data.length; i++) {
            for (var k = 0; k < data[i].productList.length; k++) {
                data[i].productList[k].imgUrl = data[i].productList[k].fullDefaultImageUrl;
                // 获得所有赠品sku集合
                for (var j = 0; j < data[i].productList[k].lsProductSkus.length; j++) {
                    // 将商品规格赋值开始
                    var cSpecIds = data[i].productList[k].lsProductSkus[j].cSpecIds;
                    if (cSpecIds) {
                        var cSpecIdsArray = [];
                        var skuName = "";
                        cSpecIdsArray = cSpecIds.split(";");
                        for (var m = 0; m < cSpecIdsArray.length; m++) {
                            for (var n = 0; n < data[i].productList[k].lsSpecs.length; n++) {
                                for (var w = 0; w < data[i].productList[k].lsSpecs[n].lsSpecItem.length; w++) {
                                    if (cSpecIdsArray[m] == data[i].productList[k].lsSpecs[n].lsSpecItem[w].id) {
                                        skuName = skuName + data[i].productList[k].lsSpecs[n].cName + "&nbsp;" + data[i].productList[k].lsSpecs[n].lsSpecItem[w].cSpecItemName + "&nbsp;&nbsp;";
                                    }
                                }
                            }
                        }
                        data[i].productList[k].lsProductSkus[j].skuName = skuName;
                    }
                    if (data[i].productList[k].fullDefaultImageUrl) {
                        data[i].productList[k].lsProductSkus[j].fullDefaultImageUrl = data[i].productList[k].fullDefaultImageUrl;
                    }
                    // 将商品规格赋值结束
                    // 将领取赠品的数量赋值，让赠品列表中数量为之前领取的数量
                    if (selecetedGiftItems.length) {
                        for (var o = 0; o < selecetedGiftItems.length; o++) {
                            if (selecetedGiftItems[o].isChecked && selecetedGiftItems[o].iProductId == data[i].productList[k].lsProductSkus[j].iProductId && selecetedGiftItems[o].iSKUId == data[i].productList[k].lsProductSkus[j].id) {
                                data[i].productList[k].lsProductSkus[j].selectQuantity = selecetedGiftItems[o].iQuantity;
                                data[i].productList[k].lsProductSkus[j].isChecked = selecetedGiftItems[o].isChecked;
                            }
                        }
                    }
                    // 将领取赠品的数量赋值，让赠品列表中数量为之前领取的数量结束
                    // 库存标志
                    if (data[i].productList[k].lsProductSkus[j].lInventoryCount > 0) {
                        data[i].productList[k].lsProductSkus[j].hasInventoryCount = true;
                    } else {
                        data[i].productList[k].lsProductSkus[j].hasInventoryCount = false;
                    }
                }

            }
        }
        return data;
    }
    // 满赠活动选择赠品最大数量的限制
    view.prototype.selectGiftLimitNumFunc = function (giftNum) {
        var _this = this;
        var maxNumFlag = false;
        // 选中赠品的容器
        var selectGiftItem = $$('.cartGiftLists').find("input[type=checkbox][name=giftCheckboxInput][datachecked='1']");
        var selectGiftItems = $$('.cartGiftLists').find("input[type=checkbox][name=giftCheckboxInput]:checked");
        var selectGiftNum = 0;
        var selectGiftNum1 = 0;
        var selectGiftNum2 = 0;
        selectGiftItem.each(function () {
            selectGiftNum1 += parseInt($$(this).parents('.giftListContent').find('.cartGiftQuantity').val());
        });
        selectGiftItems.each(function () {
            selectGiftNum2 += parseInt($$(this).parents('.giftListContent').find('.cartGiftQuantity').val());
        });
        selectGiftNum = selectGiftNum1 > selectGiftNum2 ? selectGiftNum1 : selectGiftNum2;
        if (selectGiftNum > giftNum) {
            myApp.toast('只允许选择' + giftNum + '件赠品', "tips").show(true);
            maxNumFlag = true;
        } else {
            $$('.selectGiftNum').text(selectGiftNum);
        }
        return maxNumFlag;
    };
    // 赠品模块结束
    view.prototype.afterFromPageBack = function () {
        var self = this;
        if (myApp.mainView.container.id !== "cartView") {
            myApp.hideToolbar('.homeNavBar');
            self.getView().find('a.cartBack').removeClass('hide');
            self.getView().find('.bottom-bar').css('bottom', '0px');
        } else {
            myApp.showToolbar('.homeNavBar');
            self.getView().find('a.cartBack').addClass('hide');
            self.getView().find('.bottom-bar').css('bottom', '49px');
        }
    };
    // 普通商品和虚拟商品不能一起结算处理
    view.prototype.readlVirtualProductDeal = function () {
        var self = this;
        var isProductAble = true;
        // 初始化
        // 是否礼品卡或计次卡
        view.prototype.isGiftOrCountCard = false;
        // 是否普通商品
        view.prototype.isRealProduct = false;
        // 是否虚拟商品
        view.prototype.isVirtualProduct = false;
        // 现金购买
        view.prototype.cashPay = false;
        // 积分购买
        view.prototype.pointsPay = false;
        // 虚拟商品属性
        // 储值卡
        view.prototype.isVirtualStorageCard = false;
        // 礼品卡
        view.prototype.isVirtualGiftCard = false;
        // 计次卡
        view.prototype.isVirtualCountCard = false;
        // 其它虚拟商品
        view.prototype.isOtherVirtualProduct = false;
        var checkItem = self.getView().find("input[type=checkbox][name=cartItemCheckbox][datachecked='1']");
        checkItem.each(function () {
            var realProductAttribute = $$(this).attr('data-realProductAttribute');
            var virtualProductAttribute = $$(this).attr('data-virtualProductAttribute');
            var productAttribute = $$(this).attr('data-productAttribute');
            // 商品属性
            if (realProductAttribute == "1") {
                view.prototype.isRealProduct = true;
            } else if (realProductAttribute == "2") {
                view.prototype.isVirtualProduct = true;
                // 虚拟商品属性
                if (virtualProductAttribute == "1") {
                    view.prototype.isVirtualStorageCard = true;
                } else if (virtualProductAttribute == "2") {
                    view.prototype.isVirtualGiftCard = true;
                    view.prototype.isGiftOrCountCard = true;
                } else if (virtualProductAttribute == "3") {
                    view.prototype.isVirtualCountCard = true;
                    view.prototype.isGiftOrCountCard = true;
                } else if (virtualProductAttribute == "4") {
                    view.prototype.isOtherVirtualProduct = true;
                }
            }
            // 销售方式
            if (productAttribute == "1") {
                view.prototype.cashPay = true;
            } else if (productAttribute == "2") {
                view.prototype.pointsPay = true;
            }
        });
        if (view.prototype.isRealProduct && view.prototype.isVirtualProduct) {
            isProductAble = false;
        } else if (view.prototype.isRealProduct && !view.prototype.isVirtualProduct) {
            if (view.prototype.cashPay && view.prototype.pointsPay) {
                isProductAble = false;
            }
        } else if (!view.prototype.isRealProduct && view.prototype.isVirtualProduct) {
            if (view.prototype.isVirtualStorageCard && !view.prototype.isVirtualGiftCard && !view.prototype.isVirtualCountCard && !view.prototype.isOtherVirtualProduct || !view.prototype.isVirtualStorageCard && view.prototype.isVirtualGiftCard && !view.prototype.isVirtualCountCard && !view.prototype.isOtherVirtualProduct || !view.prototype.isVirtualStorageCard && !view.prototype.isVirtualGiftCard && view.prototype.isVirtualCountCard && !view.prototype.isOtherVirtualProduct || !view.prototype.isVirtualStorageCard && !view.prototype.isVirtualGiftCard && !view.prototype.isVirtualCountCard && view.prototype.isOtherVirtualProduct || !view.prototype.isVirtualStorageCard && !view.prototype.isVirtualGiftCard && !view.prototype.isVirtualCountCard && !view.prototype.isOtherVirtualProduct) {

            } else {
                isProductAble = false;
            }
        }
        if (!isProductAble) {
            myApp.toast("礼品卡、计次卡、积分商品只能单独结算，不能与其它商品同时结算", "tips").show(true);
        } 
        return isProductAble;
    };
    return view;
});