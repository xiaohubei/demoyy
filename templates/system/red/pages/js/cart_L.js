cb.views.register('CartViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.commitLimit = {};
    view.prototype.cart_boxWidget = {};


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


    // 满赠活动子id
    view.prototype.activityItemId = "";
    // 满赠活动id
    view.prototype.giftPromotionId = "";
    // 最多领取赠品的数量
    view.prototype.giftMaxNum = 0;
    // 满赠领取赠品时商品id
    view.prototype.iProductId = "";
    // 满A送A商品购物车id
    view.prototype.cartId = "";
    // 满赠类型
    view.prototype.iGiftType = "";

    view.prototype.getProxyData = function (widgetName) {
        if (widgetName == "cart_box") {
            var inviteCode = cb.rest.AppContext.inviteCode;
            if (inviteCode) {
                return { isMini: false, promoteCode: inviteCode };
            } else {
                return { isMini: false};
            } 
        }
       
    };

    view.prototype.init = function () {
        var _self = this;
        var cartWidget = this.getWidgets()['cart_box'];
        cart_boxWidget = this.getWidgets()['cart_box'];
        var productList = new Array();
        // 获得该用户积分
        var proxy = cb.rest.DynamicProxy.create({ getMemberPoints: { url: 'member/Members/getMemberByToken', method: 'POST', options: { token: true } } });
        // 加载个人信息
        proxy.getMemberPoints({}, function (getMemberPointsErr, getMemberPointsResult) {
            if (getMemberPointsErr) {
                //alert("获取个人信息失败" + getMemberPointsErr.message);
            } else {
                // 我的积分
                if (!getMemberPointsResult.iPoints) {
                    cb.rest.AppContext.iPoints = 0;
                } else {
                    cb.rest.AppContext.iPoints = getMemberPointsResult.iPoints;
                }
                $(".myPoints").html('<div><span class="myPointsIcon"><span>我的积分</span></span><span style="margin-left:50px;color:red;"class="myTotalPointsOfCart">' + cb.rest.AppContext.iPoints + '</span><span>分</span></div>');
                
            }
        });
       
        // 删除接口，迷你购物车界面调用
        cartWidget.on('afterDelete', function (e) {
            window.location.href = "cart";
        });
        var token = cb.rest.AppContext.token;
        cartWidget.on('afterCartBoxInint', function (map) {
            view.prototype.commitLimit = map;
            var data = map.list;
            // 推广码处理
            var proxy = cb.rest.DynamicProxy.create({ getStoreSetting: { url: 'client/StoreSettingController/getStoreSetting', method: 'POST', options: { token: true}} });
            proxy.getStoreSetting({}, function (getStoreSettingErr, getStoreSettingResult) {
                if (getStoreSettingErr) {

                } else {
                    if (getStoreSettingResult.cartpromocode) {
                        $(".promotionCodeFlag").html('<label style="float: left; margin-left: 30px; padding-top: 2px;">推广码:</label><input type="text" class="promotionCode"  maxlength="50" style="margin-left:20px;text-align:center;">')
                        var inviteCode = cb.rest.AppContext.inviteCode;
                        if (inviteCode) {
                            $(".promotionCode").val(inviteCode);
                        }
                    }
                }
            });
            if (!data || data.length == 0) {
                if ($("[name = 'checkAll']").prop("checked") == true) {
                    $("[name='checkAll']").removeAttr("checked");
                }
            }
            if (!token) {
                window.location.href = "/login";
            } else {
                // 获得收藏的商品
                var myCollectionParams = { currentPage: 1, pagesize: '', productName: '', classId: '', tagId: '' };
                var proxy = cb.rest.DynamicProxy.create({ getProductFavorites: { url: 'client/ProductFavorites/getProductFavorites', method: 'POST', options: { token: true}} });
                proxy.getProductFavorites(myCollectionParams, function (err, result) {
                    if (err) {

                    } else {
                        productList = result.pager.data;
                        // 对从服务端加载的数据进行处理
                        handleShoppingCartData(true, data, productList);
                        // 获取购物车列表
                        var html = this.render($('#getCartLists').html(), { list: { list: data, allProductGiftPreferDetail: map.allProductGiftPreferDetail } });
                        $(".item-list").empty().append(html);
                        calcTotalPrice();
                        // 套餐数量加
                        $('.commonIncrement').on('click', function (e) {
                            // 主商品是否有效
                            var packageValidContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=packageValid]');
                            if ($(packageValidContainer[0]).val() == "0") {
                                return;
                            }
                            // 是否下架
                            var iStatusContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iStatus]');
                            if ($(iStatusContainer[0]).val() == "0") {
                                return;
                            }
                            // 内容是否为空
                            if (!$('.commonQuantity').val()) {
                                alert('内容不能为空');
                                return;
                            }
                            // 是否为数字
                            if (isNaN($('.commonQuantity').val())) {
                                alert('请输入数字');
                                return;
                            }
                            // 更新套餐数量
                            var shoppingCart = {};
                            var itemsArray = new Array();
                            // 套餐中每个商品的数量
                            var childItemQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=changeQuantity11]');
                            // 套餐中每个商品的sku
                            var iSKUIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iSKUId]');
                            // 套餐中每个商品的id
                            var idContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=id]');
                            // 套餐中每个商品的sPackageUUID
                            var sPackageUUIDContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=sPackageUUID]');
                            // 套餐中每个商品的lPackageId
                            var lPackageIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=lPackageId]');
                            // 套餐中每个商品的iProductId
                            var iProductIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iProductId]');
                            // 套数
                            var commonQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=commonQuantity]');
                            // 当前checkBox
                            var checkBoxtContainer = $(this).closest('div.commonProduct').find('input[type=checkbox][name=checkItem]');
                            // 商品的限购总量
                            var canPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPurchaseCount]');
                            // 每一套套餐商品的限购量
                            var canPerPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPerPurchaseCount]');
                            // 商品的限购提示
                            var canPurchaseMsgCountContainer = $(this).closest('div.commonProduct').find('div[name=canPurchaseMsg]');
                            // 商品的库存
                            var lInventoryCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=lInventoryCount]');
                            // 单个商品加按钮
                            var incrementContainer = $(this).closest('div.commonProduct').find('button[class=increment]');
                            var maxCommonCount = 0;
                            if ($(canPurchaseCountContainer[0]).val()) {
                                maxCommonCount = parseInt($(lInventoryCountContainer[0]).val()) > parseInt($(canPurchaseCountContainer[0]).val()) ? $(canPurchaseCountContainer[0]).val() : $(lInventoryCountContainer[0]).val();
                            } else {
                                maxCommonCount = $(lInventoryCountContainer[0]).val();
                            }
                            if (parseInt(maxCommonCount) < parseInt(commonQuantityContainer[0].value) || parseInt(maxCommonCount) == parseInt(commonQuantityContainer[0].value)) {
                                if (parseInt(maxCommonCount) == parseInt(commonQuantityContainer[0].value)) {
                                    // 修改套餐的数量时，套餐中所有商品的数量修改为套餐的数量
                                    for (var i = 0; i < childItemQuantityContainer.length; i++) {
                                        // 商品的数量改为套餐数量
                                        childItemQuantityContainer[i].value = commonQuantityContainer[0].value;
                                        $(childItemQuantityContainer[i]).blur();
                                    }
                                }
                                $('.commonIncrement').css("cursor", "not-allowed");
                                return;
                            } else {
                                $('.commonIncrement').css("cursor", "pointer");
                            }
                            // 套数增加1
                            commonQuantityContainer[0].value = parseInt(commonQuantityContainer[0].value) + 1;
                            // 保存没有修改之前每个商品原来的数量
                            var preProductCount = new Array();
                            // 修改套餐的数量时，套餐中所有商品的数量修改为套餐的数量
                            for (var i = 0; i < childItemQuantityContainer.length; i++) {
                                // 改变副商品限购数量
                                if (i > 0) {
                                    // 新的限购数量
                                    if ($(canPerPurchaseCountContainer[i]).val()) {
                                        var newLimitCount = parseInt(commonQuantityContainer[0].value) * parseInt(canPerPurchaseCountContainer[i].value);
                                        // 限购数量赋值
                                        $(canPurchaseCountContainer[i]).val(newLimitCount);
                                        // 每个商品的限购提示
                                        $(canPurchaseMsgCountContainer[i]).text("还可购买" + newLimitCount + "件");
                                    }
                                }
                                $(incrementContainer[i]).removeAttr("disabled");
                                $(incrementContainer[i]).css("cursor", "pointer");
                                // 获得商品原来的数量
                                preProductCount.push(childItemQuantityContainer[i].value);
                                // 商品的数量改为套餐数量
                                childItemQuantityContainer[i].value = commonQuantityContainer[0].value;
                                // 获得参数
                                itemsArray.push({
                                    id: idContainer[i].value,
                                    iSKUId: iSKUIdContainer[i].value,
                                    iQuantity: childItemQuantityContainer[i].value,
                                    sPackageUUID: sPackageUUIDContainer[i].value,
                                    lPackageId: lPackageIdContainer[i].value,
                                    iProductId: iProductIdContainer[i].value,
                                    iPackageNum: commonQuantityContainer[0].value
                                });
                            }
                            // 每个商品的总价
                            var totalPriceContainer = $(this).closest('div.commonProduct').find('strong[name=totalPrice]');
                            // 每个商品的单价
                            var singlePriceContainer = $(this).closest('div.commonProduct').find('strong[name=productprice]');
                            shoppingCart.items = itemsArray;
                            // 获得数据
                            var limitContainer = {};
                            var firstRcy = true;
                            checkBoxtContainer.each(function () {
                                // 限购
                                if (checkBoxtContainer[0].checked) {
                                    // 获得选中商品下单的参数
                                    if (firstRcy) {
                                        limitContainer = $(this).closest('div.row').find('.quantity-form');
                                        firstRcy = false;
                                    } else {
                                        var tempContainer = $(this).closest('div.row').find('.quantity-form');
                                        for (var i = 0; i < tempContainer.length; i++) {
                                            limitContainer.push(tempContainer[i]);
                                        }
                                    }
                                }
                            });
                            var isSuccess = amountControl(map.obj, limitContainer);
                            if (!isSuccess) {
                                // 还原数量
                                commonQuantityContainer[0].value = parseInt(commonQuantityContainer[0].value) - 1;
                                for (var i = 0; i < childItemQuantityContainer.length; i++) {
                                    // 还原每个商品的数量
                                    childItemQuantityContainer[i].value = preProductCount[i];
                                    // 还原限购的数量
                                    if (i > 0) {
                                        // 新的限购数量
                                        if ($(canPerPurchaseCountContainer[i]).val()) {
                                            var newLimitCount = parseInt(childItemQuantityContainer[0].value) * parseInt(canPerPurchaseCountContainer[i].value);
                                            // 限购数量赋值
                                            $(canPurchaseCountContainer[i]).val(newLimitCount);
                                            // 每个商品的限购提示
                                            $(canPurchaseMsgCountContainer[i]).text("限购" + newLimitCount + "件");
                                        }
                                    }
                                }

                                return;
                            } else {
                                // 调用更新接口
                                var proxy = cb.rest.DynamicProxy.create({ update: { url: 'client/ShoppingCarts/update', method: 'POST', options: { token: true}} });
                                proxy.update(shoppingCart, function (err, data) {
                                    if (err) {
                                        alert(err.message);
                                        return;
                                    } else {
                                        for (var i = 0; i < singlePriceContainer.length; i++) {
                                            // 获取商品最新价格
                                            $(singlePriceContainer[i]).text("￥" + parseFloat(data[i].fNewSalePrice).toFixed(2));
                                            // 获得单价
                                            var singlePrice = $(singlePriceContainer[i]).text();
                                            singlePrice = singlePrice.substr(1);
                                            // 单种商品总价
                                            var totalPrice = parseFloat(commonQuantityContainer[0].value) * parseFloat(singlePrice)
                                            $(totalPriceContainer[i]).text(cb.util.formatMoney(totalPrice));
                                        }
                                        // 计算所有选中商品总价格
                                        calcTotalPrice();
                                        //$("#allProductPrice").text(cb.util.formatMoney(calcTotalPrice()));
                                        // 改变迷你购物车数量
                                        cartWidget.refresh(true);
                                        // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                                        productCheckboxParamsFunc();
                                        // 满赠促销活动结束 将选中标识传给服务端
                                    }
                                }, this);

                            }
                        });
                        // 套餐数量减
                        $('.commonDecrement').on('click', function (e) {
                            // 主商品是否有效
                            var packageValidContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=packageValid]');
                            if ($(packageValidContainer[0]).val() == "0") {
                                return;
                            }
                            // 是否下架
                            var iStatusContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iStatus]');
                            if ($(iStatusContainer[0]).val() == "0") {
                                return;
                            }
                            // 内容不能为空
                            if (!$('.commonQuantity').val()) {
                                alert('内容不能为空');
                                return;
                            }
                            // 判断是否为数字
                            if (isNaN($('.commonQuantity').val())) {
                                alert('请输入数字');
                                return;
                            }
                            // 更新套餐数量
                            var shoppingCart = {};
                            var itemsArray = new Array();
                            // 套餐中每个商品的数量
                            var childItemQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=changeQuantity11]');
                            // 套餐中每个商品的sku
                            var iSKUIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iSKUId]');
                            // 套餐中每个商品的id
                            var idContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=id]');
                            // 套餐中每个商品的sPackageUUID
                            var sPackageUUIDContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=sPackageUUID]');
                            // 套餐中每个商品的lPackageId
                            var lPackageIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=lPackageId]');
                            // 套餐中每个商品的iProductId
                            var iProductIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iProductId]');
                            // 套数
                            var commonQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=commonQuantity]');
                            // 商品的限购总量
                            var canPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPurchaseCount]');
                            // 每个套餐商品的限购量
                            var canPerPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPerPurchaseCount]');
                            // 商品的限购提示
                            var canPurchaseMsgCountContainer = $(this).closest('div.commonProduct').find('div[name=canPurchaseMsg]');
                            // 商品的库存
                            var lInventoryCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=lInventoryCount]');
                            // 单个商品加按钮
                            var incrementContainer = $(this).closest('div.commonProduct').find('button[class=increment]');
                            var maxCommonCount = 0;
                            if ($(canPurchaseCountContainer[0]).val()) {
                                maxCommonCount = parseInt($(lInventoryCountContainer[0]).val()) > parseInt($(canPurchaseCountContainer[0]).val()) ? $(canPurchaseCountContainer[0]).val() : $(lInventoryCountContainer[0]).val();
                            } else {
                                maxCommonCount = $(lInventoryCountContainer[0]).val();
                            }
                            $('.commonIncrement').css("cursor", "pointer");
                            // 当套数为1时，就不能再减了
                            if (parseInt(commonQuantityContainer[0].value) == 1) {
                                return;
                            }
                            // 套餐数量减1
                            commonQuantityContainer[0].value = parseInt(commonQuantityContainer[0].value) - 1;
                            // 修改整套的数量时，套餐中所有商品的数量修改为整套的数量
                            for (var i = 0; i < childItemQuantityContainer.length; i++) {
                                // 改变副商品限购数量
                                // 封掉的代码
                                if (i > 0) {
                                    if ($(canPerPurchaseCountContainer[i]).val()) {
                                        var newLimitCount = parseInt(commonQuantityContainer[0].value) * parseInt(canPerPurchaseCountContainer[i].value);
                                        $(canPurchaseCountContainer[i]).val(newLimitCount);
                                        $(canPurchaseMsgCountContainer[i]).text("还可购买" + newLimitCount + "件");
                                    }
                                }
                                $(incrementContainer[i]).removeAttr("disabled");
                                $(incrementContainer[i]).css("cursor", "pointer");
                                childItemQuantityContainer[i].value = commonQuantityContainer[0].value;
                                // 获得参数
                                itemsArray.push({
                                    id: idContainer[i].value,
                                    iSKUId: iSKUIdContainer[i].value,
                                    iQuantity: childItemQuantityContainer[i].value,
                                    sPackageUUID: sPackageUUIDContainer[i].value,
                                    lPackageId: lPackageIdContainer[i].value,
                                    iProductId: iProductIdContainer[i].value,
                                    iPackageNum: commonQuantityContainer[0].value
                                });
                            }
                            // $('.changeQuantity11').blur();
                            shoppingCart.items = itemsArray;
                            // 每个商品的总价
                            var totalPriceContainer = $(this).closest('div.commonProduct').find('strong[name=totalPrice]');
                            // 每个商品的单价
                            var singlePriceContainer = $(this).closest('div.commonProduct').find('strong[name=productprice]');
                            // 调用更新接口
                            var proxy = cb.rest.DynamicProxy.create({ update: { url: 'client/ShoppingCarts/update', method: 'POST', options: { token: true}} });
                            proxy.update(shoppingCart, function (err, data) {
                                if (err) {
                                    alert('更新购物车失败: ' + err.message);
                                    return;
                                } else {
                                    for (var i = 0; i < singlePriceContainer.length; i++) {
                                        // 获取商品的最新价格
                                        $(singlePriceContainer[i]).text("￥" + parseFloat(data[i].fNewSalePrice).toFixed(2));
                                        // 获得单价
                                        var singlePrice = $(singlePriceContainer[i]).text();
                                        singlePrice = singlePrice.substr(1);
                                        // 单种商品总价
                                        var totalPrice = parseFloat(commonQuantityContainer[0].value) * parseFloat(singlePrice)
                                        $(totalPriceContainer[i]).text(cb.util.formatMoney(totalPrice));
                                    }
                                    // 计算所有选中商品总价格
                                    //$("#allProductPrice").text(cb.util.formatMoney(calcTotalPrice()));
                                    calcTotalPrice();
                                    // 改变迷你购物车数量
                                    cartWidget.refresh(true);
                                    // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                                    productCheckboxParamsFunc();
                                    // 满赠促销活动结束 将选中标识传给服务端
                                }
                            }, this);
                        });
                        // 套餐数量输入框改动
                        $('.commonQuantity').blur(function (e) {
                            // 主商品是否有效
                            var packageValidContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=packageValid]');
                            if ($(packageValidContainer[0]).val() == "0") {
                                return;
                            }
                            // 是否下架
                            var iStatusContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iStatus]');
                            if ($(iStatusContainer[0]).val() == "0") {
                                return;
                            }
                            if (!$('.commonQuantity').val()) {
                                alert('内容不能为空');
                                return;
                            }
                            if (isNaN($('.commonQuantity').val())) {
                                alert('请输入数字');
                                return;
                            }
                            if (parseInt($('.commonQuantity').val()) < 1) {
                                $('.commonQuantity').val("1");
                            }
                            // 更新套餐数量
                            var shoppingCart = {};
                            var itemsArray = new Array();
                            // 套餐中每个商品的数量
                            var childItemQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=changeQuantity11]');
                            // 套餐中每个商品的sku
                            var iSKUIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iSKUId]');
                            // 套餐中每个商品的id
                            var idContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=id]');
                            // 套餐中每个商品的sPackageUUID
                            var sPackageUUIDContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=sPackageUUID]');
                            // 套餐中每个商品的lPackageId
                            var lPackageIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=lPackageId]');
                            // 套餐中每个商品的iProductId
                            var iProductIdContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iProductId]');
                            // 套数
                            var commonQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=commonQuantity]');
                            // 商品的限购量
                            var canPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPurchaseCount]');
                            var canPerPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPerPurchaseCount]');
                            // 商品的限购提示
                            var canPurchaseMsgCountContainer = $(this).closest('div.commonProduct').find('div[name=canPurchaseMsg]');
                            // 当前checkBox
                            var checkBoxtContainer = $(this).closest('div.commonProduct').find('input[type=checkbox][name=checkItem]');
                            // 单个商品加按钮
                            var incrementContainer = $(this).closest('div.commonProduct').find('button[class=increment]');
                            // 商品的库存
                            var lInventoryCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=lInventoryCount]');
                            var maxCommonCount = 0;
                            if ($(canPurchaseCountContainer[0]).val()) {
                                maxCommonCount = parseInt($(lInventoryCountContainer[0]).val()) > parseInt($(canPurchaseCountContainer[0]).val()) ? $(canPurchaseCountContainer[0]).val() : $(lInventoryCountContainer[0]).val();
                            } else {
                                maxCommonCount = $(lInventoryCountContainer[0]).val();
                            }
                            if (parseInt(maxCommonCount) < parseInt(commonQuantityContainer[0].value) || parseInt(maxCommonCount) == parseInt(commonQuantityContainer[0].value)) {
                                commonQuantityContainer[0].value = maxCommonCount;
                                $('.commonIncrement').css("cursor", "not-allowed");
                            } else {
                                $('.commonIncrement').css("cursor", "pointer");
                            }
                            // 修改整套的数量时，套餐中所有商品的数量修改为整套的数量
                            var preProductCount = new Array();
                            for (var i = 0; i < childItemQuantityContainer.length; i++) {
                                preProductCount.push(childItemQuantityContainer[i].value);
                                childItemQuantityContainer[i].value = commonQuantityContainer[0].value;
                                // 封掉的代码
                                if (i > 0) {
                                    if ($(canPerPurchaseCountContainer[i]).val()) {
                                        var newLimitCount = parseInt(commonQuantityContainer[0].value) * parseInt(canPerPurchaseCountContainer[i].value);
                                        $(canPurchaseCountContainer[i]).val(newLimitCount);
                                        $(canPurchaseMsgCountContainer[i]).text("还可购买" + newLimitCount + "件");
                                    }
                                }
                                $(incrementContainer[i]).removeAttr("disabled");
                                $(incrementContainer[i]).css("cursor", "pointer");
                                // 获得参数
                                itemsArray.push({
                                    id: idContainer[i].value,
                                    iSKUId: iSKUIdContainer[i].value,
                                    iQuantity: childItemQuantityContainer[i].value,
                                    sPackageUUID: sPackageUUIDContainer[i].value,
                                    lPackageId: lPackageIdContainer[i].value,
                                    iProductId: iProductIdContainer[i].value,
                                    iPackageNum: commonQuantityContainer[0].value
                                });
                            }
                            // $('.changeQuantity11').blur();
                            shoppingCart.items = itemsArray;
                            // 每个商品的总价
                            var totalPriceContainer = $(this).closest('div.commonProduct').find('strong[name=totalPrice]');
                            // 每个商品的单价
                            var singlePriceContainer = $(this).closest('div.commonProduct').find('strong[name=productprice]');
                            // 获得数据
                            var limitContainer = {};
                            var firstRcy = true;
                            checkBoxtContainer.each(function () {
                                // 限购
                                if (checkBoxtContainer[0].checked) {
                                    // 获得选中商品下单的参数
                                    if (firstRcy) {
                                        limitContainer = $(this).closest('div.row').find('.quantity-form');
                                        firstRcy = false;
                                    } else {
                                        var tempContainer = $(this).closest('div.row').find('.quantity-form');
                                        for (var i = 0; i < tempContainer.length; i++) {
                                            limitContainer.push(tempContainer[i]);
                                        }
                                    }
                                }
                            });
                            var isSuccess = amountControl(map.obj, limitContainer);
                            if (!isSuccess) {
                                commonQuantityContainer[0].value = preProductCount[0];
                                for (var i = 0; i < childItemQuantityContainer.length; i++) {
                                    childItemQuantityContainer[i].value = preProductCount[i];
                                    for (var i = 0; i < childItemQuantityContainer.length; i++) {
                                        // 还原每个商品的数量
                                        childItemQuantityContainer[i].value = preProductCount[i];
                                        // 还原限购的数量
                                        if (i > 0) {
                                            // 新的限购数量
                                            if ($(canPerPurchaseCountContainer[i]).val()) {
                                                var newLimitCount = parseInt(childItemQuantityContainer[0].value) * parseInt(canPerPurchaseCountContainer[i].value);
                                                // 限购数量赋值
                                                $(canPurchaseCountContainer[i]).val(newLimitCount);
                                                // 每个商品的限购提示
                                                $(canPurchaseMsgCountContainer[i]).text("限购" + newLimitCount + "件");
                                            }
                                        }
                                    }
                                }
                                return;
                            } else {
                                // 调用更新接口
                                var proxy = cb.rest.DynamicProxy.create({ update: { url: 'client/ShoppingCarts/update', method: 'POST', options: { token: true}} });
                                proxy.update(shoppingCart, function (err, data) {
                                    if (err) {
                                        alert('更新购物车失败: ' + err.message);
                                        return;
                                    } else {
                                        for (var i = 0; i < singlePriceContainer.length; i++) {
                                            // 获取商品的最新价格
                                            $(singlePriceContainer[i]).text("￥" + parseFloat(data[i].fNewSalePrice).toFixed(2));
                                            // 获得单价
                                            var singlePrice = $(singlePriceContainer[i]).text();
                                            singlePrice = singlePrice.substr(1);
                                            // 单种商品总价
                                            var totalPrice = parseFloat(commonQuantityContainer[0].value) * parseFloat(singlePrice)
                                            $(totalPriceContainer[i]).text(cb.util.formatMoney(totalPrice));
                                        }
                                        // 计算所有选中商品总价格
                                        //$("#allProductPrice").text(cb.util.formatMoney(calcTotalPrice()));
                                        calcTotalPrice();
                                        // 改变迷你购物车数量
                                        cartWidget.refresh(true);
                                        // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                                        productCheckboxParamsFunc();
                                        // 满赠促销活动结束 将选中标识传给服务端
                                    }
                                }, this);

                            }

                        });
                        // 删除套餐
                        $('.deleteCommon').on('click', function (e) {
                            var sPackageUUIDContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=sPackageUUID]');
                            var sPackageUUID = $(sPackageUUIDContainer[0]).val();
                            // 调用删除套餐接口
                            var proxy = cb.rest.DynamicProxy.create({ deletePackage: { url: 'client/ShoppingCarts/deletePackage', method: 'POST', options: { token: true}} });
                            proxy.deletePackage({ 'sPackageUUID': sPackageUUID }, function (err, data) {
                                if (err) {
                                    alert('删除失败: ' + err.message);
                                    return;
                                } else {
                                    productCheckboxParamsFunc();
                                    // window.location.href = "cart";
                                }
                            });
                        });
                        // 商品数量加
                        $('.increment').on('click', function (e) {
                            var container = $(this).closest('div.quantity-form').find('input');
                            // 套数
                            var commonQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=commonQuantity]');
                            var checkBoxtContainer = $(this).closest('div.commonProduct').find('input[type=checkbox][name=checkItem]');
                            var lInventoryCount1 = $(this).closest('div.p-quantity').find('div');
                            // 商品的限购量
                            var canPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPurchaseCount]');
                            // 商品的限购量
                            var canPerPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPerPurchaseCount]');
                            // 商品的限购提示
                            var canPurchaseMsgCountContainer = $(this).closest('div.commonProduct').find('div[name=canPurchaseMsg]');
                            // 商品是否下架
                            var iStatusContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iStatus]');
                            if ($(container[14]).val()) {
                                if ($(iStatusContainer[0]).val() != "1") {
                                    return;
                                } else {
                                    if (container[11].value != "1") {
                                        return;
                                    }
                                }
                            } else {
                                if (container[11].value != "1") {
                                    return;
                                }
                            }
                            // 是否失效packageValid
                            if (container[19].value != "1") {
                                return;
                            }
                            if (isNaN($('.changeQuantity11').val())) {
                                alert('请输入数字');
                                return;
                            }
                            // 更新购物车数量
                            var shoppingCart = {};
                            var itemsArray = new Array();
                            // 购买数量
                            var cartQuantity = parseInt(container[0].value);
                            // 库存量
                            var lInventoryCount = container[7].value;
                            // 最新库存量
                            getInventoryCount.call(this, function (newInventoryCount) {
                                // 如果取到库存量
                                if (newInventoryCount > 0 || newInventoryCount == 0) {
                                    lInventoryCount = newInventoryCount;
                                } else {
                                    // 如果从库里没有取到最新库存量，则用之前取的库存量
                                }
                                // 如果有限购
                                if ($(container[17]).val()) {
                                    if (!isNaN($(container[17]).val())) {
                                        var limitCount = parseInt($(container[17]).val()) > 0 ? parseInt($(container[17]).val()) : 0;
                                        lInventoryCount = parseInt(lInventoryCount) > limitCount ? limitCount : lInventoryCount;
                                    }
                                }
                                if (cartQuantity == lInventoryCount || cartQuantity > lInventoryCount) {
                                   // $(lInventoryCount1[1]).text("至多可买" + lInventoryCount + "件商品");
                                    if (cartQuantity > 1) {
                                        $('.decrement').removeAttr("disabled");
                                        $('.decrement').css("cursor", "pointer");
                                    }
                                    return;
                                } else {
                                   // $(lInventoryCount1[1]).text("有货");
                                    if (cartQuantity === parseInt(lInventoryCount) - 1) {
                                        $(this).prop('disabled', true);
                                        $(this).css("cursor", "not-allowed");
                                    }
                                    cartQuantity++;
                                    container[0].value = cartQuantity;
                                    // 获得参数
                                    if ($(container[14]).val()) {
                                        itemsArray.push({
                                            id: container[6].value,
                                            iSKUId: container[1].value,
                                            sPackageUUID: container[13].value,
                                            lPackageId: container[14].value,
                                            iPackageNum: commonQuantityContainer[0].value,
                                            iQuantity: cartQuantity
                                        });
                                    } else {
                                        itemsArray.push({
                                            id: container[6].value,
                                            iSKUId: container[1].value,
                                            sPackageUUID: container[13].value,
                                            lPackageId: container[14].value,
                                            iQuantity: cartQuantity
                                        });
                                    }
                                    shoppingCart.items = itemsArray;
                                    // 调用更新接口
                                    var proxy = cb.rest.DynamicProxy.create({ update: { url: 'client/ShoppingCarts/update', method: 'POST', options: { token: true}} });
                                    proxy.update(shoppingCart, function (err, data) {
                                        if (err) {
                                            container[0].value = cartQuantity - 1;
                                            alert(err.message);
                                            return;
                                        } else {
                                            container[0].value = cartQuantity;
                                            // 主商品的数量
                                            if ($(container[15]).val() == "1") {
                                                $('.increment').removeAttr("disabled");
                                                $('.increment').css("cursor", "pointer");
                                                $(container[20]).val(cartQuantity);
                                            }

                                            if (cartQuantity > 1) {
                                                $('.decrement').removeAttr("disabled");
                                                $('.decrement').css("cursor", "pointer");
                                            }
                                            // 计算总金额productPrice
                                            var singlePriceContainer = $(this).closest('div.row').find('strong');
                                            var index = 0;
                                            if (singlePriceContainer.length == 3) {
                                                index = 1;
                                            } else if (singlePriceContainer.length == 2) {
                                                index = 0;
                                            }
                                            // 积分商品和普通商品的处理
                                            if ($(container[22]).val() == "1") {
                                                //将当前最新价格显示
                                                $(singlePriceContainer[index]).text(cb.util.formatMoney(parseFloat(data[0].fNewSalePrice)));
                                                // 获得单价
                                                var singlePrice = $(singlePriceContainer[index]).text();
                                                // 单种商品总价
                                                singlePrice = singlePrice.substr(1);
                                                var totalPrice = parseFloat(container[0].value) * parseFloat(singlePrice)
                                                $(singlePriceContainer[index + 1]).text(cb.util.formatMoney(totalPrice));
                                                // 计算所有选中商品总价格
                                                calcTotalPrice();
                                            } else if ($(container[22]).val() == "2") {
                                                //将当前最新价格显示
                                                $(singlePriceContainer[index]).text(parseInt(data[0].salePoints));
                                                // 获得单价
                                                var salePoints = $(singlePriceContainer[index]).text();
                                                var totalPrice = parseInt(container[0].value) * parseInt(salePoints)
                                                $(singlePriceContainer[index + 1]).text(totalPrice);
                                                // 计算所有选中商品总价格
                                                calcTotalPrice();
                                            }
                                           
                                            // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                                            productCheckboxParamsFunc();
                                            // 满赠促销活动结束 将选中标识传给服务端
                                        }

                                    }, this);
                                }
                            });
                        });
                        // 商品数量减
                        $('.decrement').on('click', function (e) {
                            var _self = this;
                            var container = $(this).closest('div.quantity-form').find('input');
                            var singlePriceContainer = $(this).closest('div.row').find('strong');
                            // 套数
                            var commonQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=commonQuantity]');
                            var checkBoxtContainer = $(this).closest('div.commonProduct').find('input[type=checkbox][name=checkItem]');
                            var lInventoryCount1 = $(this).closest('div.p-quantity').find('div');
                            // 商品的限购量
                            var canPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPurchaseCount]');
                            // 商品的限购量
                            var canPerPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPerPurchaseCount]');
                            // 商品的限购提示
                            var canPurchaseMsgCountContainer = $(this).closest('div.commonProduct').find('div[name=canPurchaseMsg]');
                            // 商品是否下架
                            var iStatusContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iStatus]');
                            // 是否下架
                            if ($(container[14]).val()) {
                                if ($(iStatusContainer[0]).val() != "1") {
                                    return;
                                } else {
                                    if (container[11].value != "1") {
                                        return;
                                    }
                                }
                            } else {
                                if (container[11].value != "1") {
                                    return;
                                }
                            }
                            // 是否失效packageValid
                            if (container[19].value != "1") {
                                return;
                            }
                            if (isNaN($('.changeQuantity11').val())) {
                                alert('请输入数字');
                                return;
                            }
                            var index = 0;
                            if (singlePriceContainer.length == 3) {
                                index = 1;
                            } else if (singlePriceContainer.length == 2) {
                                index = 0;
                            }
                            var cartQuantity = parseInt(container[0].value);
                            if (cartQuantity < 2) {
                                return;
                            }
                            // 更新购物车数量
                            var shoppingCart = {};
                            var itemsArray = new Array();
                            // 库存量
                            var lInventoryCount = container[7].value;
                            // 最新库存量
                            getInventoryCount.call(this, function (newInventoryCount) {
                                // 如果取到库存量
                                if (newInventoryCount > 0 || newInventoryCount == 0) {
                                    lInventoryCount = newInventoryCount;
                                } else {
                                    // 如果从库里没有取到最新库存量，则用之前取的库存量
                                }
                                // 如果有限购
                                if ($(container[17]).val()) {
                                    if (!isNaN($(container[17]).val())) {
                                        var limitCount = parseInt($(container[17]).val()) > 0 ? parseInt($(container[17]).val()) : 0;
                                        lInventoryCount = parseInt(lInventoryCount) > limitCount ? limitCount : lInventoryCount;
                                    }

                                }
                                if (cartQuantity > lInventoryCount) {
                                   // $(lInventoryCount1[1]).text("至多可买" + lInventoryCount + "件商品");
                                    cartQuantity = lInventoryCount;
                                } else {
                                   // $(lInventoryCount1[1]).text("有货");
                                    cartQuantity--;
                                }
                                // 获得参数
                                if ($(container[14]).val()) {
                                    itemsArray.push({
                                        id: container[6].value,
                                        iSKUId: container[1].value,
                                        lPackageId: container[14].value,
                                        sPackageUUID: container[13].value,
                                        iPackageNum: commonQuantityContainer[0].value,
                                        iQuantity: cartQuantity
                                    });
                                } else {
                                    itemsArray.push({
                                        id: container[6].value,
                                        iSKUId: container[1].value,
                                        lPackageId: container[14].value,
                                        sPackageUUID: container[13].value,
                                        iQuantity: cartQuantity
                                    });
                                }
                                shoppingCart.items = itemsArray;
                                if (cartQuantity != lInventoryCount && lInventoryCount > 1) {
                                    $('.increment').removeAttr("disabled");
                                    $('.increment').css("cursor", "pointer");
                                }
                                // 调用修改购物车接口
                                var proxy = cb.rest.DynamicProxy.create({ update: { url: 'client/ShoppingCarts/update', method: 'POST', options: { token: true}} });
                                proxy.update(shoppingCart, function (err, data) {
                                    if (err) {
                                        alert('更新失败: ' + err.message);
                                        return;
                                    } else {
                                        if (cartQuantity == 1) {
                                            $(this).prop('disabled', true);
                                            $(this).css("cursor", "not-allowed");
                                        }
                                        container[0].value = cartQuantity;
                                        if (container[14].value) {
                                            $(_self).parents('.commonProduct').find('.commonIncrement').css("cursor", "pointer");
                                            // 主商品的数量
                                            if ($(container[15]).val() == "1") {
                                                $(container[20]).val(cartQuantity);
                                            }
                                        }
                                        // 积分商品和普通商品的处理
                                        if ($(container[22]).val() == "1") {
                                            //将当前最新价格显示
                                            $(singlePriceContainer[index]).text(cb.util.formatMoney(parseFloat(data[0].fNewSalePrice)));
                                            // 获得单价
                                            var singlePrice = $(singlePriceContainer[index]).text();
                                            singlePrice = singlePrice.substr(1);
                                            // 单种商品总价
                                            var totalPrice = parseFloat(container[0].value) * parseFloat(singlePrice)
                                            $(singlePriceContainer[index + 1]).text(cb.util.formatMoney(totalPrice));
                                            // 计算所有选中商品总价格
                                            calcTotalPrice();
                                        } else if ($(container[22]).val() == "2") {
                                            //将当前最新价格显示
                                            $(singlePriceContainer[index]).text(parseInt(data[0].salePoints));
                                            // 获得单价
                                            var salePoints = $(singlePriceContainer[index]).text();
                                            var totalPrice = parseInt(container[0].value) * parseInt(salePoints)
                                            $(singlePriceContainer[index + 1]).text(totalPrice);
                                            // 计算所有选中商品总价格
                                            //$("#allProductPrice").text(calcTotalPrice());
                                            calcTotalPrice();
                                        }
                                        // 改变迷你购物车数量
                                        // cartWidget.refresh(true);
                                        // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                                        productCheckboxParamsFunc();
                                        // 满赠促销活动结束 将选中标识传给服务端
                                    }

                                }, this);
                            });
                        });
                        // 商品数量输入框改动
                        $('.changeQuantity11').blur(function (e) {
                            // 内容参数
                            var container = $(this).closest('div.quantity-form').find('input');
                            // 价格
                            var singlePriceContainer = $(this).closest('div.row').find('strong');
                            var checkBoxtContainer = $(this).closest('div.commonProduct').find('input[type=checkbox][name=checkItem]');
                            // 商品的限购量
                            var canPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPurchaseCount]');
                            // 商品的限购量
                            var canPerPurchaseCountContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=canPerPurchaseCount]');
                            // 商品是否下架
                            var iStatusContainer = $(this).closest('div.commonProduct').find('input[type=hidden][name=iStatus]');
                            // 商品的限购提示
                            var canPurchaseMsgCountContainer = $(this).closest('div.commonProduct').find('div[name=canPurchaseMsg]');
                            // 套数
                            var commonQuantityContainer = $(this).closest('div.commonProduct').find('input[type=text][name=commonQuantity]');
                            if ($(container[14]).val()) {
                                if ($(iStatusContainer[0]).val() != "1") {
                                    return;
                                }
                            } else {
                                if (container[11].value != "1") {
                                    return;
                                }
                            }
                            // 是否失效packageValid
                            if (container[19].value != "1") {
                                return;
                            }
                            if (isNaN($('.changeQuantity11').val())) {
                                alert('请输入数字');
                                return;
                            }
                            var index = 0;
                            if (singlePriceContainer.length == 3) {
                                index = 1;
                            } else if (singlePriceContainer.length == 2) {
                                index = 0;
                            }
                            var lInventoryCount1 = $(this).closest('div.p-quantity').find('div');
                            if (container[0].value < 1) {
                                container[0].value = 1;
                            }
                            var cartQuantity = parseInt(container[0].value);
                            // 库存量
                            var lInventoryCount = container[7].value;
                            // 最新库存量
                            getInventoryCount.call(this, function (newInventoryCount) {
                                // 如果取到库存量
                                if (newInventoryCount > 0 || newInventoryCount == 0) {
                                    lInventoryCount = newInventoryCount;
                                } else {
                                    // 如果从库里没有取到最新库存量，则用之前取的库存量
                                }
                                // 如果有限购
                                if ($(container[17]).val()) {
                                    if (!isNaN($(container[17]).val())) {
                                        var limitCount = parseInt($(container[17]).val()) > 0 ? parseInt($(container[17]).val()) : 0;
                                        lInventoryCount = parseInt(lInventoryCount) > limitCount ? limitCount : lInventoryCount;
                                    }

                                }
                                if (cartQuantity > lInventoryCount) {
                                    cartQuantity = lInventoryCount;
                                    container[0].value = lInventoryCount;
                                    if ($(container[15]).val() == "1") {
                                        $(container[20]).val(lInventoryCount)
                                    }
                                    //$(lInventoryCount1[1]).text("至多可买" + lInventoryCount + "件商品");
                                    $(commonQuantityContainer[0]).val(lInventoryCount);
                                } else {
                                   // $(lInventoryCount1[1]).text("有货");

                                }
                                // 更新购物车数量
                                var shoppingCart = {};
                                var itemsArray = new Array();
                                // 获得参数
                                if ($(container[14]).val()) {
                                    // 组合
                                    itemsArray.push({
                                        id: container[6].value,
                                        iSKUId: container[1].value,
                                        sPackageUUID: container[13].value,
                                        lPackageId: container[14].value,
                                        iPackageNum: commonQuantityContainer[0].value,
                                        iQuantity: container[0].value
                                    });
                                } else {
                                    // 单个
                                    itemsArray.push({
                                        id: container[6].value,
                                        iSKUId: container[1].value,
                                        sPackageUUID: container[13].value,
                                        lPackageId: container[14].value,
                                        iQuantity: container[0].value
                                    });
                                }
                                shoppingCart.items = itemsArray;
                                // 调用修改购物车接口
                                var proxy = cb.rest.DynamicProxy.create({ update: { url: 'client/ShoppingCarts/update', method: 'POST', options: { token: true}} });
                                proxy.update(shoppingCart, function (err, data) {
                                    if (err) {
                                        alert(err.message);
                                        return;
                                    } else {
                                        // 主商品的数量
                                        if ($(container[15]).val() == "1") {
                                            $(container[20]).val(cartQuantity);
                                        }
                                        // 积分商品和普通商品的处理
                                        if ($(container[22]).val() == "1") {
                                            //将当前最新价格显示
                                            $(singlePriceContainer[index]).text(cb.util.formatMoney(parseFloat(data[0].fNewSalePrice)));
                                            // 获得单价
                                            var singlePrice = $(singlePriceContainer[index]).text();
                                            singlePrice = singlePrice.substr(1);
                                            // 单种商品总价
                                            var totalPrice = parseFloat(container[0].value) * parseFloat(singlePrice)
                                            $(singlePriceContainer[index + 1]).text(cb.util.formatMoney(totalPrice));
                                            // 计算所有选中商品总价格
                                            //$("#allProductPrice").text(cb.util.formatMoney(calcTotalPrice()));
                                            calcTotalPrice();
                                        } else if ($(container[22]).val() == "2") {
                                            //将当前最新价格显示
                                            $(singlePriceContainer[index]).text(parseInt(data[0].salePoints));
                                            // 获得单价
                                            var salePoints = $(singlePriceContainer[index]).text();
                                            var totalPrice = parseInt(container[0].value) * parseInt(salePoints)
                                            $(singlePriceContainer[index + 1]).text(totalPrice);
                                            // 计算所有选中商品总价格
                                            //$("#allProductPrice").text(calcTotalPrice());
                                            calcTotalPrice();
                                        }
                                       
                                        // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                                        productCheckboxParamsFunc();
                                        // 满赠促销活动结束 将选中标识传给服务端
                                    }

                                }, this);

                            });
                        });
                        // 删除商品
                        $(".cart-remove").on('click', function (e) {
                            var bIsMainFlag = false;
                            var container = $(this).closest('div.row').find('.quantity-form input');
                            if (!window.confirm('你确定要删除吗？')) {
                                return;
                            }
                            var shoppingCart = {};
                            var itemsArray = new Array();
                            if ($(container[14]).val()) {
                                if (container[15].value == "0") {
                                    bIsMainFlag = false;
                                } else {
                                    bIsMainFlag = true;
                                }
                            } else {
                                bIsMainFlag = false;
                            }

                            // 获得选中的复选框
                            var selectChks = $("input[type=checkbox][name=checkItem]:checked");
                            itemsArray.push({
                                id: container[6].value,
                                bIsMain: bIsMainFlag
                            });
                            // 获得参数
                            shoppingCart.items = itemsArray;
                            // 调用删除接口
                            var proxy = cb.rest.DynamicProxy.create({ del: { url: 'client/ShoppingCarts/del', method: 'POST', options: { token: true}} });
                            proxy.del(shoppingCart, function (err, data) {
                                if (err) {
                                    alert('删除失败: ' + err.message);
                                    return;
                                } else {
                                    productCheckboxParamsFunc();
                                    //window.location.href = "cart";
                                }
                            });
                        });
                        // 收藏
                        $(".cart-follow").on('click', function (e) {
                            // 获得收藏按钮
                            var collectionContainer = $(this).closest('div.p-ops').find('span');
                            var container = $(this).closest('div.row').find('.quantity-form input');
                            if ($(collectionContainer[1]).hasClass("isCollection")) {
                                return;
                            }
                            // 是否下架
                            if (container[11].value != "1") {
                                return;
                            }
                            // 是否收藏
                            if (container[12].value == "1") {
                                return;
                            }
                            if (!window.confirm('你确定要收藏吗？')) {
                                return;
                            }
                            var collectionParams = {};
                            var itemsArray = new Array();
                            itemsArray.push(container[5].value);
                            collectionParams.ids = itemsArray;
                            // 调用收藏接口
                            var proxy = cb.rest.DynamicProxy.create({ addProductFavorite: { url: 'client/ProductFavorites/addProductFavorite', method: 'POST', options: { token: true}} });
                            proxy.addProductFavorite(collectionParams, function (err, data) {
                                if (err) {
                                    alert(err.message);
                                    return;
                                } else {
                                    $(collectionContainer[1]).text("已收藏");
                                    $(collectionContainer[1]).addClass("isCollection");
                                    $(collectionContainer[1]).css("cursor", "not-allowed");
                                }
                            });
                        });
                        // 商品选择框
                        $(".single_jdcheckbox").on('click', function (e) {
                            var childItemContainer = $(this).parents('.commonProduct').find('input[type=checkbox][name=checkChildItem]');
                            // 如果不是组合
                            if (!$(this).data('iscombination')) {
                                childItemContainer = $(this).closest('div.row.commomItem').find('input[type=checkbox][name=checkChildItem]');
                            }
                            if (e.currentTarget.checked) {
                                for (var i = 0; i < childItemContainer.length; i++) {
                                    $(childItemContainer[i]).prop("checked", 'true');
                                }
                                // 处理积分商品
                                var isProductAble = _self.integralProductDeal();
                                if (!isProductAble) {
                                    e.currentTarget.checked = false;
                                    // 处理组合里的隐藏chekbox
                                    for (var i = 0; i < childItemContainer.length; i++) {
                                        $(childItemContainer[i]).removeAttr("checked");
                                    }
                                    alert("礼品卡、计次卡、积分商品只能单独结算，不能与其它商品同时结算！！！")
                                    return;
                                }
                                var isSuccess = amountControl(map.obj, $(this).parents('.commonProduct').find('.commomItem'));
                                if (!isSuccess) {
                                    e.currentTarget.checked = false;
                                    // 处理组合里的隐藏chekbox
                                    for (var i = 0; i < childItemContainer.length; i++) {
                                        $(childItemContainer[i]).removeAttr("checked");
                                    }
                                } else {
                                    for (var i = 0; i < childItemContainer.length; i++) {
                                        $(childItemContainer[i]).prop("checked", 'true');
                                    }
                                }
                            } else {
                                // 处理组合里的隐藏chekbox
                                for (var i = 0; i < childItemContainer.length; i++) {
                                    $(childItemContainer[i]).removeAttr("checked");
                                }
                            }
                            calcTotalPrice();
                            // 获得选中的复选框列表
                            var selectChks = $("input[type=checkbox][name=checkItem]:checked");
                            var productChks = $("input[type=checkbox][name=checkItem]");
                            if (selectChks.length == 0) {
                                view.prototype.isGiftCard = false;
                                view.prototype.commonProduct = false;
                                $(".submit-btn").css("background", "#e54346");
                                $(".submit-btn").css("cursor", "pointer");
                            }
                           
                            // 如果商品全部选中 全选按钮选中
                            if (selectChks.length == productChks.length) {
                                $("[name='checkAll']").prop("checked", 'true');
                                $("[name='downCheckAll']").prop("checked", 'true');
                            } else {
                                if ($("[name = 'checkAll']").prop("checked") == true) {
                                    // 取消全选
                                    $("[name='checkAll']").removeAttr("checked");
                                }
                                if ($("[name = 'downCheckAll']").prop("checked") == true) {
                                    // 取消全选
                                    $("[name='downCheckAll']").removeAttr("checked");
                                }
                            }
                            // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                            productCheckboxParamsFunc();
                            // 满赠促销活动结束 将选中标识传给服务端
                        });
                        // 清空购物车
                        $(".remove-batch").on('click', function (e) {
                            if (e.handled !== true) {
                                e.handled = true
                                // 获得选中的复选框
                                if (data.length == 0) {
                                    alert("购物车无商品");
                                    return;
                                }
                                var selectChks = $("input[type=checkbox][name=checkChildItem]:checked");
                                if (!selectChks.length) {
                                    alert("请选择要删除的商品");
                                    return;
                                }
                                if (!window.confirm('你确定要删除选中的商品吗？')) {
                                    return;
                                }
                                var shoppingCart = {};
                                var itemsArray = new Array();
                                selectChks.each(function () {
                                    // 得到选中的购物车id
                                    var container = $(this).closest('div.row').find('.quantity-form input');
                                    itemsArray.push({ id: container[6].value });
                                });
                                // 赠品集合
                                var giftContainer = $(this).parents('.cart-warp').find('span.cartGiftProductDelete');
                                giftContainer.each(function () {
                                    // 得到选中的购物车id
                                    var id = $(this).data('id');
                                    itemsArray.push({ id: $(this).data('id') });
                                });
                                // 获得参数
                                shoppingCart.items = itemsArray;
                                // 调用删除接口
                                var proxy = cb.rest.DynamicProxy.create({ del: { url: 'client/ShoppingCarts/del', method: 'POST', options: { token: true}} });
                                proxy.del(shoppingCart, function (err, data) {
                                    if (err) {
                                        alert(err.message);
                                        return;
                                    } else {
                                        // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                                        productCheckboxParamsFunc();
                                        // 满赠促销活动结束 将选中标识传给服务端
                                    }

                                });
                            }
                        });
                        // 推广码保存
                        $(".promotionCode").blur(function (e) {
                            if (e.handled !== true) {
                                e.handled = true;
                                promotionCodeFunc();
                            }
                        });
                        // 按回车推广码保存
                        _self.getView().keydown(function (e) {
                            if (e.handled !== true) {
                                e.handled = true;
                                if (e.keyCode !== 13) return;
                                promotionCodeFunc();
                            }
                        });
                        // 满赠功能模块开始
                        // 点击查看赠品或领取赠品按钮
                        $(".viewGiftBtn").on('click', function (e) {
                            if (!token) {
                                window.location.href = "login";
                            }
                            var _this = this;
                            // 选中赠品的数据
                            var selecetedGiftItems = [];
                            var allType = $(this).data('type');
                            var offsetLeft = "";
                            var offsetTop = "";
                            if (allType) {
                                offsetLeft = e.target.offsetLeft;
                                offsetTop = e.target.offsetTop;
                                $('.gift-box').css('left', offsetLeft + 200);
                                $('.gift-box').css('top', offsetTop + 300);
                            } else {
                                offsetLeft = e.target.offsetLeft;
                                offsetTop = $(e.target).closest('.commonProduct').get(0).offsetTop;
                                $('.gift-box').css('left', offsetLeft + 200);
                                $('.gift-box').css('top', offsetTop + 100);
                            }
                            
                            // 赠品集合Id
                            var giftPreItemId = $(this).data('giftactiveid');
                            view.prototype.activityItemId = $(this).data('giftactiveid');
                            // 满赠活动id
                            view.prototype.giftPromotionId = $(this).data('giftpromotionid');
                            // 商品iproductid
                            view.prototype.iProductId = $(this).data('iproductid');
                            // 满A送A商品购物车id
                            view.prototype.cartId = $(this).data('cartid');
                            // 最多领取赠品的数量
                            var giftNum = parseInt($(this).data('giftnum'));
                            view.prototype.giftMaxNum = giftNum;
                            var params = {};
                            // 调用获取相应赠品服务
                            // 满赠类型
                            view.prototype.iGiftType = $(this).data('igifttype');
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
                            if ($(_this).text().trim() == "查看赠品") {
                                // 全部赠品
                                params.isDisplayAllPreItems = true;
                                selecetedGiftItems = [];

                            } else {
                                params.isDisplayAllPreItems = false;
                                // 获得选中赠品的信息
                                if (allType) {
                                    var selecetedGiftItemsContainer = $(this).parents('.allGiftItemList').find('div.getGiftProductItem');
                                    selecetedGiftItemsContainer.each(function () {
                                        var tempData = $(this).data();
                                        selecetedGiftItems.push({
                                            "iSKUId": tempData.iskuid,
                                            "iQuantity": tempData.iquantity,
                                            "isGiftProduct": true,
                                            "isChecked": true,
                                            "iProductId": tempData.iproductid
                                        });
                                    });
                                } else {
                                    var selecetedGiftItemsContainer = $(this).parents('.itemList').find('div.getGiftProductItem');
                                    selecetedGiftItemsContainer.each(function () {
                                        var tempData = $(this).data();
                                        selecetedGiftItems.push({
                                            "iSKUId": tempData.iskuid,
                                            "iQuantity": tempData.iquantity,
                                            "isGiftProduct": true,
                                            "isChecked": true,
                                            "iProductId": tempData.iproductid
                                        });
                                    });
                                }
                            }
                            var proxy = cb.rest.DynamicProxy.create({ getGiftProductList: { url: 'client/ShoppingCarts/getGiftProductList', method: 'POST', options: { token: true, mask: true } } });
                            proxy.getGiftProductList(params, function (err, data) {
                                if (err) {
                                    alert(err.message)
                                    return;
                                } else {
                                    if (!data) {
                                        data = [];
                                    }
                                    // 设置标志是查看赠品还是领取赠品
                                    if ($(_this).text().trim() == "查看赠品") {
                                        // 全部赠品
                                        data[0].isGetGiftProduct = false;

                                    } else {
                                        data[0].isGetGiftProduct = true;
                                    }
                                    $('.selectGiftNum').text(0);
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
                                            }

                                        }

                                    }
                                    // 渲染模板
                                    var giftHtml = _self.render($('#getGiftLists').html(), { giftList: data });
                                    $(".gift-goods").empty().append(giftHtml);
                                    // 最多领取赠品的数量
                                    $('.maxGiftNum').text(giftNum);
                                    // 是查看赠品还是领取赠品
                                    if ($(_this).text().trim() == "查看赠品") {
                                        // 隐藏确定按钮
                                        $(".giftOkBtn").hide();
                                        // 隐藏取消按钮
                                        $(".cancel-gift").hide();
                                        // 隐藏选择框
                                        $(".gift-checkbox-input").css('visibility', 'hidden');
                                        // 显示返回按钮
                                        $(".return-gift").show();

                                    } else {
                                        var selectGiftItem = $(".gift-cart-checkbox input[type=checkbox][name=gift-checkbox-input]:checked");
                                        selectGiftNum = 0;
                                        selectGiftItem.each(function () {
                                            selectGiftNum += parseInt($(this).parents('.item-gift').find('.gift-number').val());
                                        });
                                        $('.selectGiftNum').text(selectGiftNum);
                                        // 显示确定按钮
                                        $(".giftOkBtn").show();
                                        // 显示取消按钮
                                        $(".cancel-gift").show();
                                        // 显示选择框
                                        $(".gift-checkbox-input").css('visibility', 'visible');
                                        // 隐藏返回按钮
                                        $(".return-gift").hide();
                                    }
                                    $('.gift-box').show();
                                    // checkbox点击事件
                                    $(".gift-checkbox-input").on('click', function (e) {
                                        // 根据相应Sku库存判断
                                        if (e.currentTarget.checked) {
                                            var currentinventorycount = $(this).parents('.item-gift').find('.gift-number').data('inventorycount');
                                            if (!currentinventorycount || currentinventorycount < 1) {
                                                $(".giftOkBtn").attr('disabled', 'disabled');
                                            } else {
                                                $(".giftOkBtn").removeAttr('disabled');
                                            }
                                        } else {
                                            $(".giftOkBtn").removeAttr('disabled');
                                        }

                                        // 选中赠品的容器
                                        var selectGiftItem = $(".gift-cart-checkbox input[type=checkbox][name=gift-checkbox-input]:checked");
                                        var selectGiftNum = 0;
                                        selectGiftItem.each(function () {
                                            selectGiftNum += parseInt($(this).parents('.item-gift').find('.gift-number').val());
                                        });
                                        if (selectGiftNum > giftNum) {
                                            alert('只允许选择' + giftNum + '件赠品');
                                            e.currentTarget.checked = false;
                                            selectGiftItem = $(".gift-cart-checkbox input[type=checkbox][name=gift-checkbox-input]:checked");
                                            selectGiftNum = 0;
                                            selectGiftItem.each(function () {
                                                selectGiftNum += parseInt($(this).parents('.item-gift').find('.gift-number').val());
                                            });
                                            $('.selectGiftNum').text(selectGiftNum);
                                        }
                                        $('.selectGiftNum').text(selectGiftNum);

                                    });
                                    // 赠品加
                                    $(".giftQuantityAdd").on('click', function (e) {
                                        if (e.handled !== true) // This will prevent event triggering more then once 
                                        {
                                            var giftNumber = $(this).parent('.quantity_right').find('.gift-number').val();
                                            giftNumber++;
                                            $(this).parent('.quantity_right').find('.giftQuantityReduce').removeAttr("disabled");
                                            $(this).parent('.quantity_right').find('.gift-number').val(giftNumber);
                                            e.handled = true;
                                            // 库存
                                            var lInventoryCount = $(this).parent('.quantity_right').find('.gift-number').data('inventorycount');
                                            if (giftNumber > lInventoryCount) {
                                                giftNumber--;
                                                $(this).parent('.quantity_right').find('.gift-number').val(giftNumber);
                                                $(this).prop('disabled', 'true');
                                            }
                                            if (selectGiftLimitNumFunc(giftNum)) {
                                                $(this).parent('.quantity_right').find('.gift-number').val(giftNumber - 1);
                                                selectGiftLimitNumFunc(giftNum);
                                            }
                                        }

                                    });
                                    // 赠品减
                                    $(".giftQuantityReduce").on('click', function (e) {
                                        if (e.handled !== true) // This will prevent event triggering more then once 
                                        {
                                            e.handled = true;
                                            var giftNumber = $(this).parent('.quantity_right').find('.gift-number').val();
                                            $(this).parent('.quantity_right').find('.giftQuantityAdd').removeAttr("disabled");
                                            if (giftNumber < 2 || giftNumber == 2) {
                                                $(this).prop('disabled', 'true');
                                                if (giftNumber == 2) {
                                                    giftNumber--;
                                                    $(this).parent('.quantity_right').find('.gift-number').val(giftNumber);
                                                    if (selectGiftLimitNumFunc(giftNum)) {
                                                        return;
                                                    }
                                                } else {
                                                    selectGiftLimitNumFunc(giftNum);
                                                    return;
                                                }
                                            } else {
                                                giftNumber--;
                                                $(this).parent('.quantity_right').find('.gift-number').val(giftNumber);
                                                selectGiftLimitNumFunc(giftNum);
                                            }

                                        }

                                    });
                                    // 商品数量输入框改动
                                    $('.gift-number').blur(function (e) {
                                        if (isNaN($(this).val())) {
                                            alert('请输入数字');
                                            $(this).val(1)
                                            return;
                                        }
                                        if ($(this).val() < 0 || $(this).val() == 0) {
                                            $(this).val(1);
                                            $(this).parent('.quantity_right').find('.giftQuantityReduce').prop('disabled', 'true');
                                        }
                                        var lInventoryCount = $(this).data('inventorycount');
                                        if ($(this).val() > lInventoryCount) {
                                            alert('库存不足');
                                            $(this).val(lInventoryCount > 0 ? lInventoryCount : 0);
                                            $(this).parent('.quantity_right').find('.giftQuantityAdd').prop('disabled', 'true');
                                            $(this).parent('.quantity_right').find('.giftQuantityReduce').removeAttr("disabled");
                                        } else if ($(this).val() == lInventoryCount) {
                                            $(this).parent('.quantity_right').find('.giftQuantityAdd').prop('disabled', 'true');
                                        } else {
                                            $(this).parent('.quantity_right').find('.giftQuantityAdd').removeAttr("disabled");
                                            if ($(this).val() > 1) {
                                                $(this).parent('.quantity_right').find('.giftQuantityReduce').removeAttr("disabled");
                                            }
                                        }
                                        selectGiftLimitNumFunc(giftNum);
                                    });
                                }
                            });
                        });
                        // 赠品弹出层关闭按钮
                        $(".gift-close").on('click', function (e) {
                            $('.gift-box').hide();
                        });
                        // 赠品弹出层确定按钮
                        $(".giftOkBtn").on('click', function (e) {
                            if (e.handled !== true) {
                                if ($(this).attr('disabled')) {
                                    e.handled = true;
                                    return;
                                }
                                if (selectGiftLimitNumFunc(view.prototype.giftMaxNum)) {
                                    e.handled = true;
                                    return;
                                } else {
                                    e.handled = true;
                                    var items = [];
                                    // 获得选中的checkbox集合
                                    var selectChks = $(".gift-cart-checkbox input[type=checkbox][name=gift-checkbox-input]");
                                    selectChks.each(function () {
                                        // 每个商品属性种类集合
                                        var iSKUId = $(this).parents('.item-gift').find('div.p-sku').data('skuid');
                                        // 保证数量必须有值并且为不为0的整数
                                        var iQuantity = $(this).parents('.item-gift').find('.gift-number').val();
                                        if (isNaN(iQuantity) || !iQuantity) {
                                            iQuantity = 1;
                                        }
                                        if (view.prototype.iGiftType == 4) {
                                            items.push({
                                                "iSKUId": iSKUId,
                                                "iQuantity": parseInt(iQuantity),
                                                "isGiftProduct": true,
                                                "activityId": view.prototype.giftPromotionId,
                                                "isChecked": this.checked,
                                                "parentId": view.prototype.cartId,
                                                "activityItemId":view.prototype.activityItemId,
                                                "iProductId": $(this).parents('.item-gift').find('.gift-number').data('productid')
                                            });
                                        } else {
                                            items.push({
                                                "iSKUId": iSKUId,
                                                "iQuantity": parseInt(iQuantity),
                                                "isGiftProduct": true,
                                                "activityId": view.prototype.giftPromotionId,
                                                "isChecked": this.checked,
                                                "activityItemId": view.prototype.activityItemId,
                                                "iProductId": $(this).parents('.item-gift').find('.gift-number').data('productid')
                                            });
                                        }
                                    });
                                    var proxy = cb.rest.DynamicProxy.create({ addGiftCarts: { url: 'client/ShoppingCarts/addCarts', method: 'POST', options: { token: true, mask: true } } });
                                    proxy.addGiftCarts({ items: cb.data.JsonSerializer.serialize(items) }, function (getGiftErr, getGiftData) {
                                        if (err) {
                                            alert(err.message)
                                            return;
                                        } else {
                                            // 满赠促销活动开始 将选中标识传给服务端
                                            var itemsArray = new Array();
                                            var selectChks = $(".cart-warp input[type=checkbox][name=checkChildItem]");
                                            // 是否调用满赠活动中将勾选将标识传给服务端的方法productCheckboxSelectFunc
                                            selectChks.each(function () {
                                                var selectCheckBoxContainer = $(this).closest('div.row.commomItem').find('input[type=hidden][name=id]');
                                                itemsArray.push({
                                                    id: selectCheckBoxContainer[0].value,
                                                    isChecked: this.checked
                                                });
                                            });
                                            productCheckboxSelectFunc(itemsArray);
                                            // 满赠促销活动结束 将选中标识传给服务端
                                            $('.gift-box').hide();
                                        }
                                    });
                                }

                            }

                        });
                        // 赠品弹出层取消按钮
                        $(".cancel-gift").on('click', function (e) {
                            $('.gift-box').hide();
                        });
                        // 赠品弹出层返回按钮
                        $(".return-gift").on('click', function (e) {
                            $('.gift-box').hide();
                        });
                        // 更多优惠点击
                        $(".giftMorePrivilege").on('click', function (e) {
                            var dataShow = $(this).data('show');
                            var allGiftPrivilege = $(this).parents('.allGiftItemList').find('.giftMorePrivilege').data('type');
                            if (dataShow == "down") {
                                if (allGiftPrivilege == "allGiftPrivilege") {
                                    var offsetLeft = $(this).parents('.allGiftItemList').find('.giftMorePrivilege').offset().left;
                                    var offsetTop = $(this).offset().top;
                                    $(this).parents('.allGiftItemList').find('.cartGiftDetail').css('margin-left', offsetLeft - 31);
                                    $(this).parents('.allGiftItemList').find('.cartGiftDetail').css('margin-top', 3);
                                    $(this).parents('.allGiftItemList').find('.giftMorePrivilege').data('show', 'up');
                                    $(this).parents('.allGiftItemList').find('.cartGiftDetail').slideDown();
                                } else {
                                    var offsetLeft = $(this).parents('.itemList').find('.giftMorePrivilege').offset().left;
                                    $(this).parents('.itemList').find('.cartGiftDetail').css('margin-left', offsetLeft - 128);
                                    $(this).parents('.itemList').find('.cartGiftDetail').css('margin-top', -10);
                                    $(this).parents('.itemList').find('.giftMorePrivilege').data('show', 'up');
                                    $(this).parents('.itemList').find('.cartGiftDetail').slideDown();
                                }
                               
                            } else {
                                if (allGiftPrivilege == "allGiftPrivilege") {
                                    $(this).parents('.allGiftItemList').find('.giftMorePrivilege').data('show', 'down');
                                    $(this).parents('.allGiftItemList').find('.cartGiftDetail').slideUp();
                                } else {
                                    
                                    $(this).parents('.itemList').find('.giftMorePrivilege').data('show', 'down');
                                    $(this).parents('.itemList').find('.cartGiftDetail').slideUp();
                                }
                            }
                               
                           
                            
                        });
                      
                        // 赠品删除
                        $(".cartGiftProductDelete").on('click', function (e) {
                            if (!window.confirm('你确定要删除吗？')) {
                                return;
                            }
                            var shoppingCart = {};
                            var itemsArray = new Array();
                            // 获得选中的复选框
                            itemsArray.push({
                                id: $(this).data('id'),
                                bIsMain: false
                            });
                            // 获得参数
                            shoppingCart.items = itemsArray;
                            // 调用删除接口
                            var proxy = cb.rest.DynamicProxy.create({ del: { url: 'client/ShoppingCarts/del', method: 'POST', options: { token: true}} });
                            proxy.del(shoppingCart, function (err, data) {
                                if (err) {
                                    alert('删除失败: ' + err.message);
                                    return;
                                } else {
                                    // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                                    productCheckboxParamsFunc();
                                    // 满赠促销活动结束 将选中标识传给服务端
                                }
                            });
                        });
                        // 满赠功能模块结束
                    }
                }, this);
            }

        }, this);
        // 结算 购物车下单
        $(".submit-btn").on('click', function (e) {
            // 是否积分商品
            var isIntegralProduct = false;
            // 获得选中商品的信息
            var selectChks = $("input[type=checkbox][name=checkChildItem]:checked");
            var checkItem = $("input[type=checkbox][name=checkItem]:checked");
            if (!selectChks.length) {
                alert("请选择要结算的商品");
                return;
            }
            // 商品选择类别校验
            var isProductAble = _self.integralProductDeal();
            if (!isProductAble) {
                alert("礼品卡、计次卡、积分商品只能单独结算，不能与其它商品同时结算");
                return;
            }
            // 限制礼品卡选择赠品不能结算
            if (view.prototype.isVirtualProduct) {
                var giftProductItems = $(".getGiftProductItem");
                if (giftProductItems && giftProductItems.length) {
                    alert("虚拟商品不允许选择赠品");
                    return;
                }
            }
            // 获得商品参数
            var shoppingCart = {};
            var itemsArray = new Array();
            // 限购参数
            var limitContainer = {};
            var firstRcy = true;
            // 库存是否充足
            var isHaveInventory = true;
            // 选中的商品列表信息
            checkItem.each(function () {
                // 获得选中商品下单的参数
                if (firstRcy) {
                    limitContainer = $(this).closest('div.row').find('.quantity-form');
                    firstRcy = false;
                } else {
                    var tempContainer = $(this).closest('div.row').find('.quantity-form');
                    for (var i = 0; i < tempContainer.length; i++) {
                        limitContainer.push(tempContainer[i]);
                    }
                }
            });
            // 调用限购
            if (token) {
                if (!amountControl(view.prototype.commitLimit.obj, limitContainer)) {
                    isHaveInventory = false;
                    return;
                }
                selectChks.each(function () {
                    // 获得选中商品下单的参数
                    var container = $(this).closest('div.row').find('.quantity-form input');
                    // 商品名称
                    var cName = container[10].value;
                    // 组合商品其中的商品删除（失效）
                    if ($(container[19]).val() != "1" && $(container[14]).val()) {
                        alert(cName + "商品已失效");
                        isHaveInventory = false;
                        return;
                    }
                    itemsArray.push({ iSKUId: container[1].value, iCorpId: container[2].value, iQuantity: container[0].value, fSalePrice: container[4].value, iProductId: container[5].value, id: container[6].value, productAttribute: container[22].value });
                    // 积分商品
                    if (container[22].value == "2") {
                        isIntegralProduct = true;
                    }
                    // 判断库存量
                    var InventoryCount = parseInt(container[7].value);
                    // 购买数量大于库存量
                    if (parseInt(container[0].value) > InventoryCount) {
                        isHaveInventory = false;
                        alert(cName + "商品库存不足，请从新设置购买数量");
                        return;
                    }
                });
            }

            shoppingCart.items = itemsArray;
            // 积分商品处理
            if (isIntegralProduct) {
                // 总价格
                var totalPrice = calcTotalPrice();
                var myTotalPonits = $('.myTotalPointsOfCart').text();
                if (totalPrice && myTotalPonits) {
                    if (parseFloat(totalPrice) > parseFloat(myTotalPonits)) {
                        alert("您的积分不足，请重新选择商品");
                        return;
                    }
                }
            }

            // 库存充足去结算
            if (isHaveInventory) {
                // 检查商品的状态是否已下架
                var proxy = cb.rest.DynamicProxy.create({ checkiQuantity: { url: 'client/ShoppingCarts/checkiQuantity', method: 'POST', options: { token: true}} });
                proxy.checkiQuantity(shoppingCart, function (err1, data1) {
                    if (err1) {
                        alert(err1.message);
                        return;
                    } else {
                        // 调用结算接口
                        // 赠品集合
                        var giftProductContainer = $(".getGiftProductItem");
                        giftProductContainer.each(function () {
                            itemsArray.push({ iSKUId: $(this).data("iskuid"), iCorpId: $(this).data("icorpid"), iQuantity: $(this).data("iquantity"), fSalePrice: 0, iProductId: $(this).data("iproductid"), id: $(this).data("id") });
                        });
                        shoppingCart.items = itemsArray;
                        debugger;
                        // 新添加参数 不是送商品的全部商品满赠活动，满赠条件，获得该活动子活动的id
                        var childActiveIdContainer = $(".childActivityId");
                        var childActiveIdsArray = [];
                        childActiveIdContainer.each(function () {
                            childActiveIdsArray.push($(this).data("childactivityid"));
                        });
                        // 新添加参数 是送商品的全部商品满赠活动，满赠条件并且选了赠品，获得该活动子活动的id
                        var productGiftChildActivityIdContainer = $(".productGiftChildActivityId");
                        productGiftChildActivityIdContainer.each(function () {
                            childActiveIdsArray.push($(this).data("childactivityid"));
                        });
                        var activityIds = childActiveIdsArray.join(",");
                        shoppingCart.activityIds = activityIds;
                        debugger;
                        var proxy = cb.rest.DynamicProxy.create({ generateOrderByShoppingCart: { url: 'client/Orders/GenerateOrderByShoppingCart', method: 'POST', options: { token: true, mask: true } } });
                        proxy.generateOrderByShoppingCart(shoppingCart, function (err2, data2) {
                            if (err2) {
                                alert(err2.message);
                                return;
                            } else {
                                // 积分商品
                                if (isIntegralProduct) {
                                    window.location.href = "/orderExchange";
                                } else {
                                    // 是礼品卡和计次卡
                                    if (view.prototype.isGiftOrCountCard) {
                                        window.location.href = "/orderGiftCard";
                                       
                                    } else {
                                        // 普通商品
                                        window.location.href = "/order";
                                    }
                                }
                            }

                        }, this);
                    }

                }, this);
            }
        });
        // 全选
        $("#checkAll").on('click', function (e) {
            if ($("[name = 'checkAll']").prop("checked") == true) {
                // 全选
                $("[name='checkItem']").prop("checked", 'true');
                $("[name='checkChildItem']").prop("checked", 'true');
                var checkItem = $("input[type=checkbox][name=checkItem]:checked");
                // 商品选择类别校验
                var isProductAble = _self.integralProductDeal();
                if (!isProductAble) {
                    // 取消全选
                    $("[name='checkAll']").removeAttr("checked");
                    $("[name='checkItem']").removeAttr("checked");
                    $("[name='checkChildItem']").removeAttr("checked");
                    alert("礼品卡、计次卡、积分商品只能单独结算，不能与其它商品同时结算");
                    return;
                }
                var limitContainer = {};
                var firstRcy = true;
                checkItem.each(function () {
                    // 获得选中商品下单的参数
                    if (firstRcy) {
                        limitContainer = $(this).closest('div.row').find('.quantity-form');
                        firstRcy = false;
                    } else {
                        var tempContainer = $(this).closest('div.row').find('.quantity-form');
                        for (var i = 0; i < tempContainer.length; i++) {
                            limitContainer.push(tempContainer[i]);
                        }
                    }
                });
                // 调用限购
                if (token) {
                    if (!amountControl(view.prototype.commitLimit.obj, limitContainer)) {
                        $("[name='checkItem']").removeAttr("checked");
                        if ($("[name = 'checkAll']").prop("checked") == true) {
                            $("[name='checkAll']").removeAttr("checked");
                        }
                        $("[name='checkChildItem']").removeAttr("checked");
                        return;
                    }
                }

            } else {
                // 取消全选
                $("[name='checkItem']").removeAttr("checked");
                $("[name='checkChildItem']").removeAttr("checked");
            }
            calcTotalPrice();
            // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
            if (token) {
                productCheckboxParamsFunc();
            }
            // 满赠促销活动结束 将选中标识传给服务端
        });

    };
    // 计算所有选中商品价格
    var calcTotalPrice = function () {
        var allProductPrice = 0.00;
        var allSelectProductCcount = 0;
        var selectChks = $(".cart-warp input[type=checkbox][name=checkItem]:checked");
        var selectChildItem = $(".cart-warp input[type=checkbox][name=checkChildItem]:checked");
        var index = 1;
        var isSalePointsProduct = false;
        allSelectProductCcount = 0;
        selectChildItem.each(function () {
            // 获得离每个选中按钮最近的单个商品总价格
            var singlePriceBtnContainer = $(this).closest('div.row').find('strong');
            if (singlePriceBtnContainer.length == 2) {
                index = 0;
            } else if (singlePriceBtnContainer.length == 3) {
                index = 1;
            }
            // 选中单个商品总价格
            var singleCheckedProductPrice = $(singlePriceBtnContainer[index + 1]).text();
            var integralFlag = $(singlePriceBtnContainer[index + 1]).data('integral');
            if (integralFlag == "1") {// 普通商品单个商品总价格
                isSalePointsProduct = false;
                singleCheckedProductPrice = singleCheckedProductPrice.substr(1);
            } else if (integralFlag == "2") {// 积分商品单个商品总价格
                isSalePointsProduct = true;
                singleCheckedProductPrice = singleCheckedProductPrice;
            }
            // 将选中单个商品总价格累加
            allProductPrice += parseFloat(singleCheckedProductPrice);
            allSelectProductCcount += 1;
        });
        // 总数量
        $(".allProductCount").text(allSelectProductCcount);
        if (isSalePointsProduct) {
            $("#allProductPrice").text(allProductPrice + "积分");
        } else {
            $("#allProductPrice").text(cb.util.formatMoney(allProductPrice));
        }
        
        // 返回所有选中商品总价格
        return allProductPrice;
    }
    // 判断库存量
    var getInventoryCount = function (callback) {
        // 库存量 如果返回-1说明没有取到库存量，使用原先取到的库存量 获取库存量接口后台报错，已经不再维护，所以不再调用此接口，为了不影响其它依赖
        // 该方法的模块 传回-1
        var InventoryCount = -1;
        callback.call(this, InventoryCount);
    }
    var control = function () {
        var set = {};
    };
    var amountControl = function (obj, container) {
        var skuMap = {};
        var productMap = {};
        var selectedProducts = $('.item-list').find('input[type=checkbox][name=checkChildItem]:checked');
        for (var i = 0, len = selectedProducts.length; i < len; i++) {
            var element = selectedProducts[i];
            //var $data = $(element).closest('div.row').find('input');
            var $data = $(element).parents('.commomItem').find('div.quantity-form input');
            var skuId = $data.get(1).value;
            var quantity = parseInt($data.get(0).value);
            if (skuMap[skuId] == null) skuMap[skuId] = 0;
            skuMap[skuId] += quantity;
            if (skuMap[skuId] > obj.sku[skuId]) {
                alert($data.get(10).value + "库存不足");
                return false;
            }
            var productId = $data.get(5).value;
            if ($data.get(15).value != '0') {
                if ($data.get(17).value != '') {
                    if (productMap[productId] == null) productMap[productId] = 0;
                    productMap[productId] += quantity;
                    if (obj.product[productId] != null && productMap[productId] > obj.product[productId]) {
                        alert($data.get(10).value + "限购" + obj.product[productId] + "件");
                        return false;
                    }
                }
            } else if ($data.get(14).value != '' && $data.get(15).value == '0') {
                if (parseInt($data.get(0).value) > parseInt($data.get(17).value)) {
                    alert($data.get(10).value + "限购" + $data.get(17).value + "件");
                    return false;
                }
            } else {
                if (productMap[productId] == null) {
                    productMap[productId] = 0;
                    productMap[productId] += quantity;
                } else {
                    productMap[productId] += quantity;
                }
                if (parseInt($data.get(0).value) > parseInt($data.get(17).value)) {
                    alert($data.get(10).value + "限购" + $data.get(17).value + "件");
                    return false;
                }
                if (obj.product[productId] != null && productMap[productId] > obj.product[productId]) {
                    alert($data.get(10).value + "限购" + obj.product[productId] + "件");
                    return false;
                }
            }
        }

        for (var i = 0, len = container.length; i < len; i++) {
            var element = container[i];
            var $data = $(element).find('input');
            var hasCalc = false;
            for (var j = 0, len1 = selectedProducts.length; j < len1; j++) {
                if ($data.get(0) === selectedProducts[j]) {
                    hasCalc = true;
                    break;
                }
            }
            if (hasCalc) continue;
            var skuId = $data.get(2).value;
            var quantity = parseInt($data.get(1).value);
            if (skuMap[skuId] == null) skuMap[skuId] = 0;
            skuMap[skuId] += quantity;
            if (skuMap[skuId] > obj.sku[skuId]) {
                alert($data.get(11).value + "库存不足");
                return false;
            }
            var productId = $data.get(6).value;
            if ($data.get(16).value != '0') {
                if ($data.get(18).value != '') {
                    if (productMap[productId] == null) productMap[productId] = 0;
                    productMap[productId] += quantity;
                    if (obj.product[productId] != null && productMap[productId] > obj.product[productId]) {
                        alert($data.get(11).value + "限购" + obj.product[productId] + "件");
                        return false;
                    }
                }
            } else {
                if (parseInt($data.get(1).value) > parseInt($data.get(18).value)) {
                    alert($data.get(11).value + "限购" + $data.get(18).value + "件");
                    return false;
                }
            }
        }
        return true;
    };
    // 对购物车数据列表进行处理
    var handleShoppingCartData = function (isLogin, data, productList) {
        // 对从服务端加载的数据进行处理
        if (data.length > 0) {
            for (var i = 0; i < data.length; i++) {
                var isCheckedFlag = false;
                for (var k = 0; k < data[i].length; k++) {
                    // 是否主商品的标志
                    if (data[i][k].bIsMain) {
                        data[i][k].bIsMain = "1";
                    } else {
                        data[i][k].bIsMain = "0";
                    }
                    // 状态是否下架
                    if (data[i][k].oSKU.iStatus == 1) {
                        data[i][k].oSKU.iStatus = "1";
                    } else {
                        data[i][k].oSKU.iStatus = "0";
                    }
                    // 是否是礼品卡
                    if (data[i][k].isGiftCard) {
                        data[i][k].isGiftCard = "1";
                    } else {
                        data[i][k].isGiftCard = "0";
                    }
                    // 满赠促销处理开始
                    // 不是组合商品
                    if (!data[i][k].lPackageId) {
                        // 存在满赠活动
                        if (data[i][k].activityId && data[i][k].giftPreferDetail) {
                            data[i][k].isValid = data[i][k].giftPreferDetail.isValid;
                            // 满赠子活动id
                            data[i][k].giftActiveId = data[i][k].giftPreferDetail.item.id;
                            // 满赠活动id
                            data[i][k].giftPromotionId = data[i][k].activityId;
                            if (data[i][k].isChecked) {
                                isCheckedFlag = true;
                            }
                        }
                    } else {
                        // 组合商品中主商品选中，其它商品也随之选中（解决组合商品价格计算问题
                        if (data[i][0].isChecked) {
                            data[i][k].isChecked = true;
                        } else {
                            data[i][k].isChecked = false;
                        }
                        if (!data[i][0].iPackageNum) {
                            data[i][0].iPackageNum = data[i][0].iQuantity;
                        }
                    }
                    // 满赠促销处理结束
                    // 是否登录
                    if (isLogin) {
                        data[i][k].isLogin = 1;
                        // 添加是否已收藏标志
                        data[i][k].isCollection = 0;
                        if (productList.length > 0) {
                            for (var j = 0; j < productList.length; j++) {
                                if (data[i][k].iProductId == productList[j].pid) {
                                    // 商品已收藏
                                    data[i][k].isCollection = 1;
                                }
                            }

                        }
                    } else {
                        data[i][k].isLogin = 0;
                    }
                    // 单个商品的总价格
                    // 普通商品 
                    if (data[i][k].productAttribute == 1) {
                        data[i][k].singProductTotalPrice = data[i][k].iQuantity * data[i][k].fNewSalePrice;
                    } else if (data[i][k].productAttribute == 2) {// 积分商品
                        data[i][k].singProductTotalPrice = data[i][k].iQuantity * data[i][k].oSKU.salePoints;
                    }
                    
                    // 是否有效
                    if (data[i][k].packageValid != null) {
                        if (data[i][k].packageValid) {
                            data[i][k].packageValid = "1";
                        } else {
                            data[i][k].packageValid = "0";
                        }
                    } else {
                        data[i][k].packageValid = "1";
                    }
                    // 页面限购提示
                    if (data[i][k].lPackageId && data[i][k].bIsMain == "0") {
                        if (data[i][k].canPurchaseCount || data[i][k].canPurchaseCount == 0) {
                            var canBuynumber = data[i][k].canPurchaseCount > data[i][k].oSKU.lInventoryCount ? data[i][k].oSKU.lInventoryCount : data[i][k].canPurchaseCount;
                            data[i][k].canPurchaseTip = "还可购买" + canBuynumber + "件";
                            data[i][k].limitCountTip = "限购" + data[i][k].canPerPurchaseCount + "件";
                        } else {
                            if (data[i][k].tipMessage) {
                                if (data[i][k].tipMessage.indexOf("-1") > 0) {
                                    data[i][k].canPurchaseTip = "";
                                    data[i][k].limitCountTip = "不限购";
                                } else if (data[i][k].tipMessage.indexOf("0") > 0) {
                                    data[i][k].canPurchaseTip = "";
                                    data[i][k].limitCountTip = "首件优惠";
                                }
                            }
                           
                        }
                      
                    } else {
                        if (data[i][k].promotion) {
                            if (data[i][k].promotion.lType == -1) {
                                data[i][k].canPurchaseTip = "";
                                data[i][k].limitCountTip = "不限购";
                            } else if (data[i][k].promotion.lType == 0) {
                                //data[i][k].canPurchaseTip = "还可购买" + data[i][k].canPurchaseCount + "件";
                                data[i][k].canPurchaseTip = "";
                                data[i][k].limitCountTip = "首件优惠";
                            } else {
                                if (data[i][k].canPurchaseCount || data[i][k].canPurchaseCount == 0) {
                                    var canBuynumber = data[i][k].canPurchaseCount > data[i][k].oSKU.lInventoryCount ? data[i][k].oSKU.lInventoryCount : data[i][k].canPurchaseCount;
                                    data[i][k].canPurchaseTip = "还可购买" + canBuynumber + "件";
                                    if (data[i][k].promotion.lType == 4) {
                                        data[i][k].limitCountTip = "限购" + data[i][k].promotion.lTypeNum + "件";
                                    } else {
                                        data[i][k].limitCountTip = "限购" + data[i][k].promotion.lType + "件";
                                    }
                                   
                                } else {
                                    var canBuynumber = data[i][k].promotion.lTypeNum > data[i][k].oSKU.lInventoryCount ? data[i][k].oSKU.lInventoryCount : data[i][k].promotion.lType;
                                    if (data[i][k].promotion.lType == 4) {
                                      canBuynumber = data[i][k].promotion.lTypeNum > data[i][k].oSKU.lInventoryCount ? data[i][k].oSKU.lInventoryCount : data[i][k].promotion.lTypeNum;
                                    }
                                    
                                    data[i][k].canPurchaseTip = "还可购买" + canBuynumber + "件";
                                    if (data[i][k].promotion.lType == 4) {
                                        data[i][k].limitCountTip = "限购" + data[i][k].promotion.lTypeNum + "件";
                                    } else {
                                        data[i][k].limitCountTip = "限购" + data[i][k].promotion.lType + "件";
                                    }
                                    
                                }

                            }
                        }
                    }
                    
                }

                data[i][0].isCheckedFlag = isCheckedFlag;
            }
        }
    }
    // 满赠活动，商品勾选将选中标识传给服务端
    var productCheckboxSelectFunc = function (ShoppCartItems) {
        var self = this;
        var shoppingCart = {};
        shoppingCart.cartList = ShoppCartItems;
        // 推广码
        var promoteCode = $('.promotionCode').val();
        if (promoteCode) {
            shoppingCart.promoteCode = promoteCode;
        }
        var proxy = cb.rest.DynamicProxy.create({ getCartList: { url: 'client/ShoppingCarts/getCartList', method: 'POST', options: { token: true, mask: true } } });
        proxy.getCartList(shoppingCart, function (err, result) {
            // 将购物车数据刷新
            var data = self.cart_boxWidget.transferServerData(result);
            // 将购物车数据保存到缓存中，解决结算后在提交订单页面迷你购物车赠品数据消失
            // window.localStorage.setItem("miniCartData", cb.data.JsonSerializer.serialize(data));
            self.cart_boxWidget.execute('afterCartBoxInint', data);
            // 改变迷你购物车数量
            self.cart_boxWidget.refresh(data, true);


        });
    }
    // 满赠活动选择框触发获得所有商品组成参数传给productCheckboxSelectFun方法
    var productCheckboxParamsFunc = function () {
        var itemsArray = new Array();
        var selectChks = $(".cart-warp input[type=checkbox][name=checkChildItem]");
        // 是否调用满赠活动中将勾选将标识传给服务端的方法productCheckboxSelectFunc
        selectChks.each(function () {
            var selectCheckBoxContainer = $(this).closest('div.row.commomItem').find('input[type=hidden][name=id]');
            itemsArray.push({
                id: selectCheckBoxContainer[0].value,
                isChecked: this.checked
            });
        });
        productCheckboxSelectFunc(itemsArray);
    }
    // 满赠活动选择赠品最大数量的限制
    var selectGiftLimitNumFunc = function (giftNum) {
        var maxNumFlag = false;
        // 选中赠品的容器
        var selectGiftItem = $(".gift-cart-checkbox input[type=checkbox][name=gift-checkbox-input]:checked");
        var selectGiftNum = 0;
        selectGiftItem.each(function () {
            selectGiftNum += parseInt($(this).parents('.item-gift').find('.gift-number').val());
        });
        if (selectGiftNum > giftNum) {
            alert('只允许选择' + giftNum + '件赠品');
            selectGiftItem = $(".gift-cart-checkbox input[type=checkbox][name=gift-checkbox-input]:checked");
            selectGiftNum = 0;
            selectGiftItem.each(function () {
                selectGiftNum += parseInt($(this).parents('.item-gift').find('.gift-number').val());
            });
            $('.selectGiftNum').text(selectGiftNum);
            maxNumFlag = true;
        }
        $('.selectGiftNum').text(selectGiftNum);
        return maxNumFlag;
    }
    // 推广码公共方法
    var promotionCodeFunc = function () {
        // 之前的推广码
        var preInviteCode = cb.rest.AppContext.inviteCode;
        // 用户输入的推广码
        var inviteCode = $('.promotionCode').val();
        if (!inviteCode) { }
        if (inviteCode === preInviteCode) return;
        // 制空
        if (!inviteCode) {
            cb.data.CookieParser.delCookie('inviteCode');
            cb.data.CookieParser.delCookie('promotCode');
            delete cb.rest.AppContext.inviteCode;
            delete cb.rest.AppContext.promotCode;
            // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
            productCheckboxParamsFunc();
            // 满赠促销活动结束 将选中标识传给服务端
        } else {
            // 推广码验证处理
            if (!$('.promotionCode').val()) {
                inviteCode = '';
            }
            var proxy = cb.rest.DynamicProxy.create({ validPromptCode: { url: 'client/StorePrompts/validPromptCode', method: 'POST', options: { token: true } } });
            proxy.validPromptCode({ 'cCode': inviteCode }, function (validPromptCodeErr, validPromptCodeResult) {
                if (validPromptCodeErr) {
                    alert(validPromptCodeErr.message, "提示信息");
                    $(".promotionCode").val(preInviteCode);
                } else {
                    cb.data.CookieParser.setCookie('inviteCode', inviteCode);
                    cb.data.CookieParser.delCookie('promotCode');
                    cb.rest.AppContext.inviteCode = inviteCode;
                    delete cb.rest.AppContext.promotCode;
                    // 满赠促销活动开始 将选中标识传给服务端 组合商品没有满赠
                    productCheckboxParamsFunc();
                    // 满赠促销活动结束 将选中标识传给服务端
                }
            });
        }
    }
    // 虚拟商品和普通商品处理
    view.prototype.integralProductDeal = function () {
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
        var selectChks = $("input[type=checkbox][name=checkItem]:checked");
        // 检查是否礼品卡
        selectChks.each(function () {
            // 商品属性
            var realProductContainer = $(this).parents('.commomItem').find('input[type=checkbox][name=checkChildItem]').attr('data-realProductAttribute');
            // 虚拟商品属性
            var virtualProductContainer = $(this).parents('.commomItem').find('input[type=checkbox][name=checkChildItem]').attr('data-virtualProductAttribute');
            // 出售方式现金积分
            var productAttributContainer = $(this).parents('.commomItem').find('input[type=checkbox][name=checkChildItem]').attr('data-productAttribute');
            // 商品属性
            if (realProductContainer == "1") {
                view.prototype.isRealProduct = true;
            } else if (realProductContainer == "2") {
                view.prototype.isVirtualProduct = true;
                // 虚拟商品属性
                if (virtualProductContainer == "1") {
                    view.prototype.isVirtualStorageCard = true;
                } else if (virtualProductContainer == "2") {
                    view.prototype.isVirtualGiftCard = true;
                    view.prototype.isGiftOrCountCard = true;
                } else if (virtualProductContainer == "3") {
                    view.prototype.isVirtualCountCard = true;
                    view.prototype.isGiftOrCountCard = true;
                } else if (virtualProductContainer == "4") {
                    view.prototype.isOtherVirtualProduct = true;
                }
            }
            // 销售方式
            if (productAttributContainer == "1") {
                view.prototype.cashPay = true;
            } else if (productAttributContainer == "2") {
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
        return isProductAble;
    }
    return view;
}, this);