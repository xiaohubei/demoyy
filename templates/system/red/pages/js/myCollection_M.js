cb.views.register('MyCollectionViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.searchFlag = false;
    // 初始化
    view.prototype.init = function () {
        var self = this;
        // 参数
        var myCollectionParams = { currentPage: 1, pagesize: 1000000, productName: "", classId: "", tagId: "" };
        var proxy = cb.rest.DynamicProxy.create({ getProductFavorite: { url: 'client/ProductFavorites/getProductFavorites', method: 'POST', options: { token: true, mask: true } } });
        proxy.getProductFavorite(myCollectionParams, function (err, result) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            } else {
                for (var i = 0; i < result.pager.data.length; i++) {
                    result.pager.data[i].fSalePrice = parseFloat(result.pager.data[i].fSalePrice).toFixed(2);
                    result.pager.data[i].fMarkPrice = parseFloat(result.pager.data[i].fMarkPrice).toFixed(2);
                }
                var newFormData = self.forDataByDateFunc(result.pager.data);
                var myCollectionHtml = self.render($$('#myCollectionListTpl').html(), { myCollectionList: newFormData });
                // 将每行的信息存储
                $$('#myCollectionList').find('ul').html(myCollectionHtml);
                self.RegeistEvent();
            }
        });
        // 下拉刷新
        self.getView().find('.page-content.pull-to-refresh-content').on('refresh', function (e) {
            if (self.searchFlag) {
                return;
            }
            proxy.getProductFavorite(myCollectionParams, function (err, result) {
                if (err) {
                    myApp.pullToRefreshDone();
                } else {
                    for (var i = 0; i < result.pager.data.length; i++) {
                        result.pager.data[i].fSalePrice = parseFloat(result.pager.data[i].fSalePrice).toFixed(2);
                        result.pager.data[i].fMarkPrice = parseFloat(result.pager.data[i].fMarkPrice).toFixed(2);
                    }
                    var newFormData = self.forDataByDateFunc(result.pager.data);
                    var myCollectionHtml = self.render($$('#myCollectionListTpl').html(), { myCollectionList: newFormData });
                    // 将每行的信息存储
                    $$('#myCollectionList').find('ul').html(myCollectionHtml);
                    self.RegeistEvent();
                    myApp.pullToRefreshDone();
                }
            });
        });
        // 搜索
        self.getView().find('.myCollectionSearch').on('click', function (e) {
            var val = $$(this).attr('data-Type');
            if (val == "showSearch") {
                self.searchFlag = true;
                $$(this).attr('data-Type', 'hideSearch');
                self.getView().find('#myCollectionList').css("margin-top", "35px");
                self.getView().find('.searchMycollection').removeClass("hide");
            } else {
                self.searchFlag = false;
                $$(this).attr('data-Type', 'showSearch');
                self.getView().find('#myCollectionList').css("margin-top", "0");
                self.getView().find('.searchMycollection').addClass("hide");


            }

        });
        // 回退
        self.getView().find('.myCollectionReturn').on('click', function (e) {
            myApp.mainView.router.back();
        });
    };

    // 注册动态内容事件
    view.prototype.RegeistEvent = function () {
        var self = this;
        // 选中的规格是否有sku
        var isCanAddCart = false;
        // 取消收藏
        self.getView().find('a.myCollectionDel').on('click', function (e) {
            var cancelSelf = this;
            myApp.confirm('你确定要取消收藏吗？', '提示信息', function () {
                var idsArray = new Array();
                var id = $$(cancelSelf).data("id");
                idsArray.push(id);
                var proxy = cb.rest.DynamicProxy.create({ delFavorites: { url: 'client/ProductFavorites/delFavorites', method: 'POST', options: { token: true } } });
                proxy.delFavorites({ ids: idsArray }, function (err, result) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true);
                    } else {
                        myApp.toast('删除成功', 'success').show(true);
                        myApp.mainView.router.refreshPage();
                    }

                }, this);
            });

        });
        // 直接按输入法的搜索键
        self.getView().find('.searchKey').on('keypress', function (event) {
            if (event.which == 13) {
                var proxy = cb.rest.DynamicProxy.create({ getProductFavorites: { url: 'client/ProductFavorites/getProductFavorites', method: 'POST', options: { token: true, mask: true } } });
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                } else {
                    for (var i = 0; i < result.pager.data.length; i++) {
                        result.pager.data[i].fSalePrice = parseFloat(result.pager.data[i].fSalePrice).toFixed(2);
                        result.pager.data[i].fMarkPrice = parseFloat(result.pager.data[i].fMarkPrice).toFixed(2);
                    }
                    var newFormData = self.forDataByDateFunc(result.pager.data);
                    var myCollectionHtml = self.render($$('#myCollectionListTpl').html(), { myCollectionList: newFormData });
                    // 将每行的信息存储
                    $$('#myCollectionList').find('ul').html(myCollectionHtml);
                    self.RegeistEvent();
                }
            }
        });
        //// 加入购物车,获取商品规格
        //self.getView().find('a.myCollectionCart').on('click', function (e) {
        //    // 获取商品详情参数
        //    var pid = $$(this).data("pid");
        //    var getSkus = {};
        //    getSkus.ids = [pid];
        //    // 获取商品属性接口
        //    var proxy = cb.rest.DynamicProxy.create({ getProductsByIds: { url: 'client/Products/getProductsByIds', method: 'POST', options: { token: true } } });
        //    proxy.getProductsByIds(getSkus, function (err, result) {
        //        if (err || !result.length) {
        //            return;
        //        } else {
        //            // 渲染模板
        //            var productAttrHtml = self.render($$('#addProdductSkuTpl').html(), { product: result[0] });
        //            $$('.popup.popup-prodSUK').html(productAttrHtml);
        //            // 获得所选中的规格id
        //            var specItemIdArrays = new Array();
        //            for (var i = 0; i < result[0].lsSpecs.length; i++) {
        //                specItemIdArrays.push($$('.popup.popup-prodSUK').find("input[name=attrItem_" + result[0].lsSpecs[i].id + "]:checked").val());
        //            }
        //            var getSpecIdString = specItemIdArrays.join(";");
        //            for (var j = 0; j < result[0].lsProductSkus.length; j++) {
        //                if (getSpecIdString == result[0].lsProductSkus[j].cSpecIds) {
        //                    isCanAddCart = true;
        //                }
        //            }
        //            myApp.popup('.popup.popup-prodSUK');
        //            // 控制是否加入购物车
        //            if (!isCanAddCart) {
        //                $$('.popup-bottom .btn-update-sku').addClass("disabled");
        //            } else {
        //                $$('.popup-bottom .btn-update-sku').removeClass("disabled");
        //            }
        //            //控制数量输入
        //            $$('.popup.popup-prodSUK .numberManage').find('i').on('click', function (e) {
        //                var $input = $$(this).parent().find('input');
        //                // 数量
        //                var val = parseInt($input.val());
        //                // 库存
        //                var InventoryCount= parseInt($$('#changeAttrInventoryCount').text().substr(2));
        //                if ($$(this).hasClass('icon-cart-less')) {
        //                    if (val > 1) {
        //                        $input.val(val - 1);
        //                        $$(this).parent().find('i').removeClass('disabled');
        //                        if (val - 1 < 2) {
        //                            $$(this).addClass('disabled');
        //                        }
        //                    } else {
        //                        $$(this).addClass('disabled');
        //                    }

        //                } else if ($$(this).hasClass('icon-cart-add')) {
        //                    $$(this).parent().find('i').removeClass('disabled');
        //                    $input.val(val + 1);
        //                    if (val + 1 == InventoryCount) {
        //                        $$(this).addClass('disabled');
        //                    }


        //                }
        //                var iQuantity = parseInt($input.val());
        //                var popupToTalPrice = iQuantity * result[0].fSalePrice;
        //                $$(".collectionAddCartTalPrice").html(iQuantity + "<em>件</em>" + parseFloat(popupToTalPrice).toFixed(2) + "<em>元</em>");
        //            });
        //            // 加入购物车
        //            $$('.popup-bottom .btn-update-sku').on('click', function (e) {
        //                // 获得加入购物车的参数
        //                var addCartParam = self.getAddCartParamsFunc(result[0]);
        //                var proxy = cb.rest.DynamicProxy.create({ addCarts: { url: 'client/ShoppingCarts/addCarts', method: 'POST', options: { token: true } } });
        //                proxy.addCarts({ items: cb.data.JsonSerializer.serialize(addCartParam) }, function (addCartErr, addCartResult) {
        //                    if (addCartErr) {
        //                        myApp.alert(addCartErr.message, '提示信息');
        //                        return;
        //                    } else {
        //                        myApp.closeModal('.popup.popup-prodSUK');
        //                        myApp.mainView.router.refreshPage();
        //                        myApp.closeModal('.popup.popup-prodSUK')
        //                        // 底部导航栏目购物车的数量图标
        //                        $$('.shoppingCartCount').text(addCartResult);
        //                        $$('.shoppingCartCount').show();
        //                        myApp.alert('加入购物车成功', '提示信息');
        //                    }
        //                });


        //            });
        //            //属性切换事件触发
        //            $$('.popup.popup-prodSUK').find('input[type="radio"]').on('change', function (e) {
        //                isCanAddCart = false;
        //                var specItemIdArray = new Array();
        //                for (var i = 0; i < result[0].lsSpecs.length; i++) {
        //                    specItemIdArray.push($$('.popup.popup-prodSUK').find("input[name=attrItem_" + result[0].lsSpecs[i].id + "]:checked").val());
        //                }
        //                var getSpecIds = specItemIdArray.join(";");
        //                for (var j = 0; j < result[0].lsProductSkus.length; j++) {
        //                    if (getSpecIds == result[0].lsProductSkus[j].cSpecIds) {
        //                        $$('#changeAttrInventoryCount').text("库存" + result[0].lsProductSkus[j].lInventoryCount);
        //                        isCanAddCart = true;
        //                    }
        //                }
        //                if (!isCanAddCart) {
        //                    $$('.popup-bottom .btn-update-sku').addClass("disabled");
        //                } else {
        //                    $$('.popup-bottom .btn-update-sku').removeClass("disabled");
        //                }
        //        });
        //        }
        //    });
        //});


    };
    // 获得加入购物车的参数
    view.prototype.getAddCartParamsFunc = function (data) {
        var addCartParam = [];
        var specItemIds = new Array();
        $$('.popup.popup-prodSUK').find('input[type="radio"]:checked').each(function () {
            specItemIds.push($$(this).val());
        });
        var iSKUId = "";
        var iProductId = "";
        var getSpecIds = specItemIds.join(";");
        for (var j = 0; j < data.lsProductSkus.length; j++) {
            if (getSpecIds == data.lsProductSkus[j].cSpecIds) {
                iSKUId = data.lsProductSkus[j].id;
                iProductId = data.lsProductSkus[j].iProductId;
            }
        }
        if ($$('.popup.popup-prodSUK .numberManage').find('input').val()) {
            addCartParam.push({
                "iSKUId": iSKUId,
                "iQuantity": $$('.popup.popup-prodSUK .numberManage').find('input').val(),
                "iProductId": iProductId
            });
        }
        return addCartParam;
    };
    // 将收藏数据格式组装成按收藏时间分组
    view.prototype.forDataByDateFunc = function (data) {
        var date = new Date();
        var month = date.getMonth() + 1;
        var privousDay = date.getDate() - 1;
        if (month > 0 && month < 10) {
            month = "0" + month;
        }
        if (privousDay > 0 && privousDay < 10) {
            privousDay = "0" + privousDay;
        }
        var currentDate = date.getFullYear() + "-" + month + "-" + date.getDate();
        var priviousDate = date.getFullYear() + "-" + month + "-" + privousDay;
        var newData = {};
        for (var i = 0; i < data.length; i++) {
            var key = data[i].pubuts.substr(0, 10);
            if (key == currentDate) {
                key = "今天";
            } else if (key == priviousDate) {
                key = "昨天";
            }
            if (newData[key]) {
                newData[key].push(data[i]);
            } else {
                newData[key] = [data[i]];
            }
        }
        var newFormData = [];
        for (var k in newData) {
            newFormData.push({ name: k, data: newData[k] });
        }
        return newFormData;
    };
    view.prototype.formatDateFunc = function (strDate, fmt) {
        //if (!strDate) return strDate;
        if (!fmt) fmt = 'yyyy-MM-dd';
        strDate = strDate.split(" ");
        strDate = strDate[0].replace(/-/g, '/');
        var date = new Date(strDate);
        var o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "S": date.getMilliseconds()
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    };
    return view;
});