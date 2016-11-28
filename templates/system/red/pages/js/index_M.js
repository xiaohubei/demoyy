// Determine theme depending on device
var isAndroid = Framework7.prototype.device.android === true;
var isIos = Framework7.prototype.device.ios === true;

// Set Template7 global devices flags
Template7.global = {
    android: isAndroid,
    ios: isIos
};
Template7.registerHelper('adjustImgSrc', function (src) {
    return cb.util.adjustImgSrc(src);
});
Template7.registerHelper('formatDate', function (strDate, fmt) {
    return cb.util.formatDate(strDate, fmt);
});
// Define Dom7
var $$ = Dom7;

// Change Through navbar layout to Fixed
if (isAndroid) {
    // Change class
    $$('.view.navbar-through').removeClass('navbar-through').addClass('navbar-fixed');
    // And move Navbar into Page
    //$$('.view .navbar').prependTo('.view .page');
}

// Init App
var params = {
    cacheIgnoreGetParameters: true,
    modalButtonOk: '确认',
    modalButtonCancel: '取消',
    preloadPreviousPage: false
};
if (!cb.config || cb.config.fromWechat) params.pushState = true;
//if (cb.config && cb.config.fromWechat) {
//    var pushStateSeparator = '&!/';
//    var index = location.search.indexOf(pushStateSeparator);
//    var pushStateRoot = index > -1 ? location.search.substr(0, index) : location.search;
//    params.pushStateRoot = pushStateRoot;
//    params.pushStateSeparator = pushStateSeparator;
//}
var myApp = new Framework7(params);

cb.util.loadingControl = {
    start: function () {
        myApp.showIndicator();
    },
    end: function () {
        myApp.hideIndicator();
    }
};
//初始化键盘所用
cb.util.inputKeyboard = function (view, obj) {
    if (!view && !obj) return;
    var localScreenHeight = document.body.clientHeight;
    if (arguments.length == 1) {
        view.find('input').each(function () {
            var item = $$(this);
            $$(this).focus(function () {
                var inputsetInterval = setInterval(function () {
                    var elementTop = item.offset().top;
                    if (elementTop >= document.body.clientHeight - 44) {
                        var moveHeight = elementTop - document.body.clientHeight + item.height();
                        if (view.hasClass('no-tabbar') || view.hasClass('no-toolbar'))
                            moveHeight += 88;

                        if (view.find('.page-content').children('.page-content-inner'))
                            view.find('.page-content').children('.page-content-inner').css({
                                'transform': 'translateY(-' + moveHeight + 'px)',
                                '-webkit-transform': 'translateY(-' + moveHeight + 'px)'
                            });
                    }

                    if (localScreenHeight == document.body.clientHeight) {
                        clearInterval(inputsetInterval);
                        $$(this).blur();
                    }
                }, 500);
            }).blur(function () {
                if (view.find('.page-content').children('.page-content-inner'))
                    view.find('.page-content').children('.page-content-inner').css({
                        'transform': 'translateY(0px)',
                        '-webkit-transform': 'translateY(0px)'
                    });
            });
        });
    }
    else {
        obj.focus(function () {
            var inputsetInterval = setInterval(function () {
                var elementTop = obj.offset().top;
                if (elementTop >= document.body.clientHeight) {
                    var moveHeight = elementTop - document.body.clientHeight + obj.height();
                    if (view.hasClass('no-tabbar') || view.hasClass('no-toolbar'))
                        moveHeight += 44;

                    if (view.find('.page-content').children('.page-content-inner'))
                        view.find('.page-content').children('.page-content-inner').css('transform', 'translateY(-' + moveHeight + 'px)');
                }

                if (localScreenHeight == document.body.clientHeight) {
                    clearInterval(inputsetInterval);
                    if (view.find('.page-content').children('.page-content-inner'))
                        view.find('.page-content').children('.page-content-inner').css('transform', 'translateY(0px)');
                }
            }, 500);
        }).blur(function () {
            if (view.find('.page-content').children('.page-content-inner'))
                view.find('.page-content').children('.page-content-inner').css('transform', 'translateY(0px)');
        });
    }
};

function plusReady() {

    var onNetChange = function () {
        var netWork = plus.networkinfo.getCurrentType();
        if (netWork == plus.networkinfo.CONNECTION_UNKNOW || netWork == plus.networkinfo.CONNECTION_NONE)
            myApp.popup('.popup.popup-network');
        if (netWork != plus.networkinfo.CONNECTION_UNKNOW && netWork != plus.networkinfo.CONNECTION_NONE)
            myApp.closeModal('.popup.popup-network');
    };
    document.addEventListener("netchange", onNetChange, false);

    //检查更新
    var proxy = cb.rest.DynamicProxy.create({
        getVersion: {
            url: 'client/checkPackageUpdate',
            method: 'GET',
            options: {
                mask: true
            }
        }
    });
    var netWork = plus.networkinfo.getCurrentType();
    if (netWork == plus.networkinfo.CONNECTION_WIFI) {
        proxy.getVersion({ osName: plus.os.name, version: cb.config && cb.config.version || plus.runtime.version }, function (err, result) {
            if (err) {
                myApp.toast('检查更新失败', 'error').show(true);
                return;
            }
            if (result.isUpdate) {
                myApp.confirm('检测到有新版本，是否继续更新?', '提示信息', function () {
                    if (isAndroid) {
                        plus.nativeUI.toast("文件开始下载，请稍后...", { duration: "long" });
                        var wgtOption = { filename: "_downloads/update/", retry: 1 };

                        var installWgt = function (wgtpath) {
                            plus.runtime.install(wgtpath, {}, function (wgtinfo) {
                                myApp.alert('App更新完成，请立即重启应用！', '提示信息', function () {
                                    plus.runtime.quit();
                                });
                            }, function (error) {
                                myApp.toast("应用更新失败：" + error.message, 'error').show(true);
                            });
                        };

                        var task = plus.downloader.createDownload(result.updateUrl, wgtOption, function (download, status) {
                            if (status == 200) {
                                plus.nativeUI.toast("文件下载完成，开始安装...", { duration: "long" });
                                installWgt(download.filename);
                            } else {
                                myApp.toast("文件下载失败！", 'error').show(true);
                            }
                        });
                        task.start();
                    }
                    if (isIos) {
                        myApp.alert('请下载IOS安装包，通过iTunes同步更新', '提示信息');
                    }
                });
            }
        });
    }
};

var init = function () {
    var updateCart = function () {
        // 加载购物车列表 获得购物车数量
        var proxy = cb.rest.DynamicProxy.create({
            getCartLists: {
                url: 'client/ShoppingCarts/getCartList',
                method: 'GET',
                options: {
                    token: true,
                    autoLogin: false
                }
            }
        });
        proxy.getCartLists(function (err, result) {
            if (err) {
                $$('.shoppingCartCount').hide();
                return;
            }
            // 底部导航栏目购物车的数量图标
            $$('.shoppingCartCount').text(result.lsCart.length);
            $$('.shoppingCartCount').show().removeClass('hide');
        });
    };
    // 登录的情况下默认加载购物车数量
    if (cb.rest.AppContext.token) updateCart();

    var _loginViewControllerName = 'LoginViewController';
    var $view = $$('.login-screen').find('[data-controller=' + _loginViewControllerName + ']');
    if (!$view.length) return;
    var _loginController = new cb.views[_loginViewControllerName]();
    $view[0].controller = _loginController;
    _loginController._set_data('view', $view);
    _loginController.init(updateCart);

    cb.route = {
        redirectLoginPage: function () {
            var options;
            if (arguments.length === 1) {
                if (arguments[0] instanceof cb.views.BaseView) {
                    options = { controller: arguments[0] };
                } else if (typeof arguments[0] === 'function') {
                    options = { callback: arguments[0] };
                } else {
                    options = arguments[0];
                }
            }
            _loginController.login(options);
        }
    };

    var _viewIds = {};

    var addView = function (viewId, url) {
        var viewSelector = '#' + viewId;
        var defaultOptions = {
            // Don't worry about that Material doesn't support it
            // F7 will just ignore it for Material theme
            //dynamicNavbar: true,
            preroute: function (view, options) {
                if (!options || !options.url || options.url === '#') return;
                var queryString = new cb.util.queryString(options.url);
                var context = cb.rest.AppContext;
                queryString.set('size', context.size);
                queryString.set('device', context.device);
                queryString.set('token', context.token);
                if (context.preview)
                    queryString.set('preview', context.preview);
                queryString.set('view', view.container.id);
                var index = options.url.indexOf('?');
                options.url = index < 0 ? options.url : options.url.substr(0, index);
                if (cb.config) {
                    if (cb.config.webDomain) {
                        options.url = options.url.replace(cb.config.webDomain + '/', '');
                        if (options.url.substr(options.url.length - 5, 5) === '.html') {

                        } else if (cb.config.dynamicRoute.indexOf(options.url) === -1) {
                            options.url = cb.config.filePath + '/' + options.url + '.html';
                        } else {
                            options.url = cb.config.webDomain + '/' + options.url;
                            queryString.set('package', true);
                        }
                    } else if (cb.config.fromWechat) {
                        queryString.set('wid', context.wid);
                    }
                }
                options.url += queryString.toStr();
            },
            preprocess: function (content, url, next) {
                cb.init(content, function (controller, pageHTML) {
                    if (controller.controllerName === _loginViewControllerName) {
                        next('');
                        myApp.removeFromCache(url.split('?')[0]);
                        cb.route.redirectLoginPage();
                        return false;
                    }
                    next(pageHTML);
                    processOtherPage(controller);
                });
            }
        };
        // Init View
        var view = myApp.addView(viewSelector, defaultOptions);
        _viewIds[viewId] = view;
        setMainView(viewSelector, view);
        if (url) {
            view.router.loadPage(url);
        } else {
            //view.router.refreshPage();
            view.router.reloadPage(view.url);
        }
    };

    var setMainView = function (viewSelector, view) {
        $$(viewSelector).parent().children().removeClass('view-main active');
        $$(viewSelector).addClass('view-main active');
        var toolbarItem = $$(viewSelector).parent().find('a[href="' + viewSelector + '"]');
        toolbarItem.parent().children().removeClass('active');
        toolbarItem.addClass('active');
        view.main = true;
        myApp.mainView = view;
    };

    //检测设备网络状态
    $$(document).on('pageBeforeInit pageInit', function () {
        if (window.plus) {
            var netWork = plus.networkinfo.getCurrentType();
            if (netWork == plus.networkinfo.CONNECTION_UNKNOW || netWork == plus.networkinfo.CONNECTION_NONE)
                myApp.popup('.popup.popup-network');
        }
    });

    if (window.plus) {
        $$('.popup.popup-network').find('a.button').on('click', function () {
            var netWork = plus.networkinfo.getCurrentType();
            if (netWork != plus.networkinfo.CONNECTION_UNKNOW && netWork != plus.networkinfo.CONNECTION_NONE)
                myApp.closeModal('.popup.popup-network');
        });
    }

    var defaultViewId = 'homeView';
    var viewIdObj = { homeview: 'homeView', categoryview: 'categoryView', cartview: 'cartView', memberview: 'memberView' };
    var viewIdObjYL = { home: 'homeView', goodclass: 'categoryView', mycar: 'cartView', mycenter: 'memberView' };

    var formatViewId = function (viewId) {
        if (!viewId) return;
        return viewIdObj[viewId.toLocaleLowerCase()];
    };

    var formatPageName = function (pageName) {
        if (pageName && pageName.substr(0, 1) === '/')
            return pageName.substr(1);
        return pageName;
    };

    var formatViewIdYL = function (viewId) {
        if (!viewId) return;
        return viewIdObjYL[viewId.toLocaleLowerCase()];
    };

    var getViewParams = function () {
        var pushStateSeparator = myApp.params.pushStateSeparator;
        if (location.href.indexOf(pushStateSeparator) >= 0 && location.href.indexOf(pushStateSeparator + '#') < 0) {
            var viewLink = location.href.split(pushStateSeparator)[1];
            var queryString = new cb.util.queryString(viewLink);
            var viewId = formatViewId(queryString.get('view')) || defaultViewId;
            var params = { viewId: viewId };
            if (formatPageName(queryString.pathname) !== formatPageName($$('#' + viewId).attr('data-url')))
                params.url = queryString.pathname + queryString.toStr();
            return params;
        } else if (location.href.indexOf('#') >= 0) {
            var viewId = formatViewIdYL(location.href.substr(location.href.indexOf('#') + 1)) || defaultViewId;
            return { viewId: viewId };
        } else {
            if ((cb.config && !cb.config.fromWechat) || location.pathname === '/') return { viewId: defaultViewId };
            //location.href = '/' + pushStateSeparator + location.pathname + location.search;
            var route = formatPageName(location.pathname);
            var viewId = formatViewIdYL(route);
            if (viewId)
                return { viewId: viewId };
            return { viewId: defaultViewId, url: route + location.search };
        }
    };

    $$('div.views.tabs').children('div.view.tab').on('show', function (e) {
        var viewId = e.target.id;
        if (this.id !== viewId) return;
        if (_viewIds[viewId]) {
            if ('memberView' == viewId) {
                addView(viewId, e.detail);
            } else {
                setMainView('#' + viewId, _viewIds[viewId]);
                //if (myApp.mainView.activePage.container.controller) {
                //    cb.executeController(myApp.mainView.activePage.container.controller);
                //} else {
                //    myApp.mainView.router.refreshPage();
                //}
                myApp.mainView.router.reloadPage(myApp.mainView.url);
            }

        } else {
            addView(viewId, e.detail);
        }
    });

    var viewParams = getViewParams();
    //$$('#' + viewParams.viewId).trigger('show', viewParams.url);

    if (cb.config && cb.config.fromWechat) {
        var views = $$('#' + viewParams.viewId).parent().children('.view.tab');
        if (views.length) {
            var context = cb.rest.AppContext;
            views.each(function (index, view) {
                var viewContainer = $$(view);
                var items = [];
                items.push(viewContainer.attr('data-url'));
                items.push('?wid=' + context.wid);
                if (context.shareparentid)
                    items.push('&shareparentid=' + context.shareparentid);
                viewContainer.attr('data-url', items.join(''));
            });
        }
        var wechatToolbarItem = $$('#' + viewParams.viewId).parent().children('.toolbar').find('a[href].external');
        if (wechatToolbarItem.length === 1) {
            var context = cb.rest.AppContext;
            var items = [];
            items.push(wechatToolbarItem.attr('href'));
            items.push('?wid=' + context.wid);
            items.push('&oid=' + context.oid);
            if (context.shareparentid)
                items.push('&shareparentid=' + context.shareparentid);
            items.push('&source=umall');
            items.push('&returnurl=' + context.serviceUrl);
            wechatToolbarItem.attr('href', items.join(''));
        }
        var isDebug = false;
        if (location.href.indexOf('wxdebug=true') > 0)
            isDebug = true;

        var url = location.href.indexOf('#') ? location.href.split('#')[0] : location.href;
        //获取WX config
        var proxyWX = cb.rest.DynamicProxy.create({
            getWeChatConfig: {
                url: 'client/Pay/getWeChatConfig',
                method: 'POST',
                options: {
                    mask: true
                }
            }
        });
        proxyWX.getWeChatConfig({ url: url }, function (err, result) {
            if (err) {
                if (isDebug)
                    myApp.toast('初始化微信JSSDK出错', 'error').show(true);
                return;
            }
            wx.config({
                debug: isDebug,
                appId: result.appId,
                timestamp: result.timestamp,
                nonceStr: result.nonceStr,
                signature: result.signature,
                jsApiList: ["checkJsApi", "onMenuShareTimeline", "onMenuShareAppMessage", "onMenuShareQQ", "onMenuShareWeibo", "hideMenuItems", "showMenuItems", "hideAllNonBaseMenuItem", "showAllNonBaseMenuItem", "translateVoice", "startRecord", "stopRecord", "onRecordEnd", "playVoice", "pauseVoice", "stopVoice", "uploadVoice", "downloadVoice", "chooseImage", "previewImage", "uploadImage", "downloadImage", "getNetworkType", "openLocation", "getLocation", "hideOptionMenu", "showOptionMenu", "closeWindow", "scanQRCode", "chooseWXPay", "openProductSpecificView", "addCard", "chooseCard", "openCard", "onMenuShareWeibo", "hideMenuItems", "showMenuItems", "hideAllNonBaseMenuItem", "showAllNonBaseMenuItem"]
            });
            wx.ready(function () {
                $$('#' + viewParams.viewId).trigger('show', viewParams.url);
            });
            wx.error(function (res) {
                if (isDebug)
                    myApp.toast(JSON.stringify(res), 'error').show(true);
                $$('#' + viewParams.viewId).trigger('show', viewParams.url);
            });
        });
    } else {
        $$('#' + viewParams.viewId).trigger('show', viewParams.url);
    }

    $$(document).on('pageAfterAnimation', function (e) {
        if (e.detail.page.name === 'home') {
            if (e.detail.page.container.controller) {
                e.detail.page.container.controller.run(true);
            } else {
                e.detail.page.view.allowPageChange = true;
                e.detail.page.view.router.reloadPage('home');
            }
        } else if (e.detail.page.name === 'category') {
            if (!e.detail.page.container.controller) {
                e.detail.page.view.allowPageChange = true;
                e.detail.page.view.router.reloadPage('category');
            }
        } else if (e.detail.page.name === 'cart') {
            // 底部菜单的隐藏和显示
            if (myApp.mainView.container.id !== "cartView") {
                myApp.hideToolbar('.homeNavBar');
            } else {
                myApp.showToolbar('.homeNavBar');
            }
            if (!e.detail.page.container.controller) {
                e.detail.page.view.allowPageChange = true;
                e.detail.page.view.router.reloadPage('member/cart');
            }
        } else if (e.detail.page.name === 'user') {
            if (!e.detail.page.container.controller) {
                e.detail.page.view.allowPageChange = true;
                e.detail.page.view.router.reloadPage('member/index');
            }
        }
    });

    var processOtherPage = function (controller) {
        var $view = $$(myApp.mainView.pagesContainer).find('[data-controller=' + controller.controllerName + ']');
        if (!$view.length) return;
        $view[0].controller = controller;
        controller._set_data('view', $view);
        controller._set_data('viewData', $view[0].f7PageData);
        var viewData = controller.getViewData();
        controller._set_data('query', viewData.query);
        //        if (!viewData.fromPage.container.controller) {
        //            var $back = $view.find('.back');
        //            if ($back.length) {
        //                $back.removeClass('back');
        //                $back.attr('href', $$('#' + getViewParams().viewId).attr('data-url'));
        //            }
        //        }
        if (cb.config) {
            if (cb.config.webDomain) {
                controller.on('afterBatchSubmit', function () {
                    this.getView().find('a.external').click(function (e) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if (isAndroid)
                            window.outerWebView = clicked($$(this).attr('href'));
                    });
                });
            } else if (cb.config.fromWechat) {
                var appContext = cb.rest.AppContext;
                var link = cb.rest.AppContext.serviceUrl + '/?wid=' + appContext.wid;
                if (appContext.shareparentid)
                    link += '&shareparentid=' + appContext.shareparentid;
                var content = {
                    title: $$('title').text(),
                    desc: link,
                    link: link,
                    imgUrl: $$('link[rel="shortcut icon"]').attr('href')
                };
                wx.onMenuShareTimeline(content);
                wx.onMenuShareAppMessage(content);
            }
        }
    };

    $$(document).on('pageBeforeAnimation', function (e) {
        if (e.detail.page.container.controller && e.detail.page.container.controller.afterFromPageBack)
            e.detail.page.container.controller.afterFromPageBack(e.detail.page);
    });

    /**
    * 扫码打开新窗口
    * @param {URIString} id : 要打开页面url
    * @param {boolean} wa : 是否显示等待框
    * @param {boolean} ns : 是否不自动显示
    */
    var openw = null, waiting = null;
    window.clicked = function (url, isOuter) {
        if (window.plus) {
            openw = plus.webview.create(url, url, { scrollIndicator: 'none', scalable: false });
            openw.addEventListener('loaded', function () {//页面加载完成后才显示
                openw.show("pop-in");
            }, false);
            openw.addEventListener('close', function () {//页面关闭后可再次打开
                openw = null;
            }, false);
            return openw;
        } else {
            window.location.href = url;
            //myApp.toast('本功能只能在APP中使用!', 'error').show(true);
        }
        return null;
    };

    //扫码完成,供公共调用
    window.scaned = function (type, result, file) {
        plus.nativeUI.toast("扫码成功!", {
            duration: "short"
        });
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

    }

};

if (window.plus) {
    plusReady();
} else {
    document.addEventListener("plusready", plusReady, false);
}