cb.views.register('CategoryViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;

    view.prototype.fireClick = function (result, self) {
        $$(this).parent().children('li').removeClass('cur');
        $$(this).addClass('cur');
        //myApp.getScroller().scrollTop(myApp.getScroller().scrollTop() + $$(this).offset().top - 44, 600);

        var id = $$(this).attr('data-id');

        if (id) {
            var childCateData = result.filter(function (item) {
                return item.id == id;
            })[0];
            childCateData = self.FormateCategory(childCateData);

            var childCateHtml = self.render($$("#categoryTemplate").html(), childCateData);
            self.getView().find('#category_wapper').parent().children('.category-content').html(childCateHtml);
        }
    };

    view.prototype.init = function () {
        var self = this;
        var proxy = cb.rest.DynamicProxy.create({
            getClasses: {
                url: 'client/ProductClasses/getClasses',
                method: 'GET',
                options: {
                    mask: true
                }
            }
        });

        proxy.getClasses(function (err, result) {
            if (err) return;
            var html = self.render(self.getView().find('#categoryTitleTemplate').html(), { data: result });
            self.getView().find('#category_wapper').html(html);

            self.getView().find('#category_wapper li').on('click', function () {
                self.fireClick.call(this, result, self);
                if (isAndroid) {
                    myApp.getScroller().scrollTop(myApp.getScroller().scrollTop() + $$(this).offset().top - 44, 600);
                }
                else if (isIos) {
                    self.getView().find('.page-content').scrollTop(self.getView().find('.page-content').scrollTop() + $$(this).offset().top - 44, 600);
                }
            });

            self.fireClick.call(self.getView().find('#category_wapper li').eq(0), result, self);

            //扫码功能
            self.getView().find('.navbar.card-navbar').find('.right').on('click', function () {
                var btnType = $$(this).children('a').attr('data-type');
                if (btnType == 'scan') {
                    if (window.plus)
                        var scanWin = clicked(cb.config.filePath + "/barCode.html");
                    else if (cb.config && cb.config.fromWechat && (typeof WeixinJSBridge != "undefined")) {
                        wx.scanQRCode({
                            needResult: 1,
                            scanType: ["qrCode", "barCode"],
                            success: function (res) {
                                var result = res.resultStr;
                                if (result.indexOf('EAN-13,') == 0)
                                    result = result.split(',')[1];
                                else if (result.indexOf(' ') > 0)
                                    return;

                                var bcproxy = cb.rest.DynamicProxy.create({
                                    getProudctId: {
                                        url: 'client/products/getProductIdByBarCode?cBarCode=' + result,
                                        method: 'GET',
                                        options: {
                                            token: false
                                        }
                                    }
                                });
                                bcproxy.getProudctId(function (err, data) {
                                    if (err) {
                                        myApp.toast('获取商品信息失败', 'tips').show(true);
                                        return;
                                    }
                                    if (data)
                                        myApp.mainView.router.loadPage({
                                            url: 'detail?goods_id=' + data
                                        });
                                    else
                                        myApp.toast('暂无该商品信息', 'tips').show(true);
                                });
                            },
                            fail: function (e) {
                                myApp.toast(JSON.stringify(e),'error').show(true);
                            }
                        });
                    }
                    else
                        myApp.toast('请在App中使用该功能', 'tips').show(true);
                }
                else {
                    myApp.mainView.router.loadPage('/list?keyword=' + encodeURIComponent(self.getView().find('#searchPage_keyword').text()));
                }
            });
        });

        self.getView().find('.navbar.card-navbar').find('input').on('change keyup', function () {
            var html = '<a href="#" class="icon-only" data-type="scan"><i class="icon icon-scan-gray"></i></a>';
            if ($$(this).val())
                html = '<a href="#" class="link color-lightergray-u"  data-type="search">搜索</a>';

            self.getView().find('.navbar.card-navbar').find('.right').html(html);
        });

        self.getView().find('.navbar.card-navbar').find('form').on('click', function () {
            myApp.mainView.router.loadPage('search');
        });

        //如果是IOS系统，则分类会超上偏，需纠正
        if (window.plus && isIos) {
            self.getView().find(".category-content").css({ "top": "44px" });
        }
        //将左侧分类全覆盖
        self.getView().find("#category_wapper").css("height", ($$(window).height() - 44) + "px");

        self.getView().find(".category-content").css("height", ($$(window).height() - 94) + "px");
    };

    view.prototype.FormateCategory = function (val) {
        var re = new Object();
        cb.util.extend(true, re, val);

        if (val.lsChildClass.length) {
            for (var i = 0; i < val.lsChildClass.length; i++) {
                var item = val.lsChildClass[i];
                if (!item.lsChildClass.length) {
                    var obj = {
                        cCode: item.cCode,
                        cName: item.cName,
                        id: item.id,
                        lsChildClass: Array[0],
                        cfolder: item.cfolder,
                        cimgname: item.cimgname
                    };
                    re.lsChildClass[i].lsChildClass.push(obj);
                    re.lsChildClass[i].isLast = true;
                }
            }
        }
        else {
            re.lsChildClass.push(val);
            re.isLast = true;
        }
        return re;
    };
    return view;
});