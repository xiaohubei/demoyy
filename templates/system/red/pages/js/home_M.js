cb.views.register('HomeViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;

    view.prototype.init = function () {
        var self = this;
        var thisView = self.getView();
        setTimeout(function () {
            self.run(true);
        }, 1000);

        this.getView().find('.lucencyBar #btnScan').on('click', function () {
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
                        myApp.toast(JSON.stringify(e), 'error').show(true);
                    }
                });
            }
            else
                myApp.toast('请在App中使用该功能', 'tips').show(true);
        });
        var $pageContent = this.getView().find('.page-content');
        this.on('afterBatchSubmit', function () {
            if (isAndroid) {
                myApp.refreshScroller();
                if (myApp.getScroller()) {
                    myApp.getScroller().on("scroll", function (e) {
                        var swHeight = thisView.find('div[data-page="home"] .page-content').find('.swiper-container.home-swiper').height() ? thisView.find('div[data-page="home"] .page-content').find('.swiper-container.home-swiper').height() : 150;
                        var swiperHeight = swHeight - $$('div[data-page="home"] .navbar.lucencyBar').height();
                        var scrollHeight = myApp.getScroller().scrollTop();

                        $$('div[data-page="home"] .navbar.lucencyBar').find('.navbar-inner').attr('style', 'background:rgba(239,82,77,' + (scrollHeight / swiperHeight) + ')');
                    });
                }
            }
            else if (isIos) {
                thisView.find('div[data-page="home"] .page-content').on("scroll", function (e) {
                    var swHeight = thisView.find('div[data-page="home"] .page-content').find('.swiper-container.home-swiper').height() ? thisView.find('div[data-page="home"] .page-content').find('.swiper-container.home-swiper').height() : 150;
                    var swiperHeight = swHeight - thisView.find('div[data-page="home"] .navbar.lucencyBar').height();
                    var scrollHeight = $$(this).scrollTop();

                    thisView.find('div[data-page="home"] .navbar.lucencyBar').find('.navbar-inner').attr('style', 'background:rgba(239,82,77,' + (scrollHeight / swiperHeight) + ')');
                });
            }

            if (!cb.rest.AppContext.preview) return;
            window.addEventListener('message', function (event) {
                if (event.data === 'refresh') {
                    myApp.mainView.router.reloadPage();
                    return;
                }
                var eventData = { height: $pageContent[0].scrollHeight };
                if (!event.data) {
                    event.top = 0;
                } else {
                    var $currentElement = $pageContent.find('[data-name="' + event.data + '"]');
                    $currentElement.css('border', '3px solid red');
                    eventData.top = $currentElement[0].offsetTop;
                }
                event.source.postMessage(JSON.stringify(eventData), event.origin);
            }, false);
        }, this);

        if (!cb.rest.AppContext.preview) return;
        $pageContent.css('overflow', 'hidden');
    };

    return view;
});