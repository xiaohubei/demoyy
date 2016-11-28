cb.views.register('aboutUmallPageController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var thisView = this.getView();
        if (window.plus) {
            thisView.find('.versionContent').html('当前版本(内部)：V' + (cb.config && cb.config.version || plus.runtime.version));
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

            var updateApp = function (url) {
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

                    var task = plus.downloader.createDownload(url, wgtOption, function (download, status) {
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
            };
            thisView.find('.btn-checkVesion').removeClass('hide');
            thisView.find('.btn-checkVesion').on('click', function () {
                //检查网络状态
                var netWork = plus.networkinfo.getCurrentType();

                proxy.getVersion({ osName: plus.os.name, version: cb.config && cb.config.version || plus.runtime.version }, function (err, result) {
                    if (err) {
                        myApp.toast('检查更新失败', 'error').show(true);
                        return;
                    }
                    if (result.isUpdate) {
                        if (netWork == plus.networkinfo.CONNECTION_UNKNOW || netWork == plus.networkinfo.CONNECTION_NONE) {
                            myApp.toast('网络已断开...', 'tips').show(true);
                            return;
                        }
                        else if (netWork != plus.networkinfo.CONNECTION_WIFI) {
                            myApp.confirm('检测到网络状态为非WIFI，是否继续更新?', '提示信息', function () {
                                //plus.runtime.openURL(result.updateUrl);
                                updateApp(result.updateUrl);
                            });
                        }
                        else {
                            myApp.confirm('检测到有新版本，是否继续更新?', '提示信息', function () {
                                //plus.runtime.openURL(result.updateUrl);
                                updateApp(result.updateUrl);
                            });
                        }
                    }
                    else
                        myApp.toast('已经是最新版本了!', 'tips').show(true);
                });
            });
        }
    };
    return view;
});