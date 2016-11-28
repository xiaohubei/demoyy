cb.views.register('SmartSelectController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var self = this, indexCount = 0, value = new Array(), name = new Array();
        var query = this.getViewData().query; // 获得地址信息

        var listproxy = cb.rest.DynamicProxy.create({
            getProvinces: {
                url: 'client/Regions/getProvinces',
                method: 'GET',
                options: {
                    token: true
                }
            },
            getCitysFromProvince: {
                url: 'client/Regions/getCitysFromProvince',
                method: 'GET',
                options: {
                    token: true
                }
            },
            getDistrictFromCity: {
                url: 'client/Regions/getDistrictFromCity',
                method: 'GET',
                options: {
                    token: true
                }
            }
        });

        if (query) {
            var fieldValue = query.fieldValue;
            var fieldName = query.fieldName;
            var phoneImg = query.phoneImg;
            //设置navbar title
            $$('div[data-page="SmartSelectListPage"]').children('.navbar').find('.center.nav-title-container').html(query.pageTitle);

            var loadData = function (url, param) {
                listproxy[url](param, function (err, data) {
                    if (err) {
                        myApp.toast('获取数据失败', 'error').show(true);
                        return;
                    }
                    var arrayList = new Array();
                    for (var index = 0; index < data.length; index++) {
                        var item = data[index];
                        var o = {
                            value: item[fieldValue],
                            name: item[fieldName]
                        };
                        if (phoneImg)
                            o.cPhoneImage = data[index].cPhoneImage ? (cb.rest.appContext.serviceUrl + data[index].cPhoneImage) : 'img/icon/default-bank.png';

                        if (query.selectValue && query.selectValue == item.id)
                            o.checked = true;

                        arrayList.push(o);
                    }
                    var html = self.render($$('#smartSelectItemTpl').html(), { data: arrayList });
                    //渲染模板
                    $$('div[data-page="SmartSelectListPage"] .smartSelect-Container').html(html);
                    //注册事件
                    $$('div[data-page="SmartSelectListPage"] .smartSelect-Container').find('li').on('click', function () {
                        if (query.backOnSelect) {
                            var backData = {
                                container: query.container,
                                value: $$(this).attr('data-value'),
                                name: $$(this).attr('data-name')
                            };

                            var pageVewList = $$(myApp.mainView.pagesContainer).find('.page');
                            $$(myApp.mainView.pagesContainer).find('.page')[pageVewList.length - 1].f7PageData.query = backData;
                            myApp.mainView.router.back({
                                query: backData
                            });
                        }
                        else {
                            if (value.indexOf($$(this).attr('data-value')) < 0) {
                                value.push($$(this).attr('data-value'));
                                name.push($$(this).attr('data-name'));
                            }
                            if (indexCount == query.serverUrl.length - 1) {
                                var backData = {
                                    container: query.container,
                                    value: value,
                                    name: '中国 ' + name.join().replace(/,/g, ' ')
                                };

                                var pageVewList = $$(myApp.mainView.pagesContainer).find('.page');
                                $$(myApp.mainView.pagesContainer).find('.page')[pageVewList.length - 1].f7PageData.query = backData;
                                myApp.mainView.router.back({
                                    query: backData
                                });
                            }
                            else {
                                indexCount++;
                                loadData(query.serverUrl[indexCount], { parentId: $$(this).attr('data-value') });
                            }
                        }
                    });
                });
            };

            if (!$$.isArray(query.serverUrl))
                loadData(query.serverUrl);
            else
                loadData(query.serverUrl[indexCount]);
        }
    }
    return view;
});
