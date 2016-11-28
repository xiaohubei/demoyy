cb.views.register('distributionViewController', function (controllerName) {
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
        self.pageData = pageData;
        self.proxy = cb.rest.DynamicProxy.create({
            getAllStoreArea: {
                url: 'client/orders/getAllStoreArea', method: 'GET', options: { token: true, mask: true }
            },
            getStoreList: {
                url: 'client/orders/getStoreList', method: 'POST', options: { token: true, mask: true }
            }
        });
        if (pageData.selectedValue) {
            for (var i = 0; i < pageData.data.length; i++) {
                if (pageData.data[i].id == pageData.selectedValue.id)
                    pageData.data[i].isSelected = true;
                else
                    pageData.data[i].isSelected = false;
            }
        }
        thisView.find('.db-listblock-container').html(self.render($$('#distributionTpl').html(), { data: pageData.data }));

        thisView.find('.db-listblock-container').children('li').on('click', function (e) {
            var dbType = $$(this).attr('data-type');
            if (dbType == 'PICKUP') {
                self.InitChooseStore();
                myApp.popup('.popup.popup-chooseStore');
            }
        });

        thisView.find('.btn-ExpressType-save').on('click', function () {
            var selectValue = thisView.find('.db-listblock-container').find('input:checked').val();
            selectValue = pageData.data.filter(function (val) {
                return val.id == selectValue;
            })[0];

            if (selectValue.id == 'PICKUP') {
                if (cb.cache.get('storeDetail')) {
                    selectValue.storeId = cb.cache.get('storeDetail').id;
                    selectValue.storeName = cb.cache.get('storeDetail').name;
                    selectValue.storeAddress = {
                        province: cb.cache.get('storeDetail').province,
                        city: cb.cache.get('storeDetail').city,
                        area: cb.cache.get('storeDetail').area
                    }
                }
                else {
                    myApp.toast('请选择自提点', 'tips').show(true);
                    return;
                }
            }
            myApp.mainView.router.back({
                query: {
                    selectValue: selectValue
                }
            });
        });

        $$('.popup.popup-map').children('.navbar').find('.close-white').remove();
        $$('.popup.popup-map').children('.navbar').find('.right').html('<i class="icon close-white"></i>');
        $$('.popup.popup-map').children('.navbar').find('.close-white').on('click', function () {
            myApp.closeModal('.popup.popup-map');
            myApp.popup('.popup.popup-chooseStore');

            if (cb.cache.get('map') && window.plus) {
                var map = cb.cache.get('map');
                map.hide();
            }
        });
    };

    view.prototype.InitChooseStore = function () {
        var self = this;

        $$('.popup.popup-chooseStore').find('.dai-search').children('.btn-search').on('click', function () {
            $$('.popup.popup-chooseStore').find('.storeList').find('li.search').toggleClass('hide');
            if ($$('.popup.popup-chooseStore').find('.storeList').find('li.search').hasClass('hide')) {
                $$('.popup.popup-chooseStore').find('.storeList').find('li.search').find('input').val('');
                $$('.popup.popup-chooseStore').find('.storeList').find('li.search').nextAll().removeClass('hide');
            }
        });

        $$('.popup.popup-chooseStore').find('.storeList').find('li.search').find('input').on('keypress', function (e) {
            if (e.which == 13) {
                var keyValue = $$(this).val();
                if (keyValue) {
                    $$('.popup.popup-chooseStore').find('.storeList').find('li.search').nextAll().each(function () {
                        if ($$(this).attr('data-key') && $$(this).attr('data-key').indexOf(keyValue) > 0)
                            $$(this).removeClass('hide');
                        else
                            $$(this).addClass('hide');
                    });
                }
                else {
                    $$('.popup.popup-chooseStore').find('.storeList').find('li.search').nextAll().removeClass('hide');
                }
                e.preventDefault();
            }
        });

        $$('.popup.popup-chooseStore').children('.navbar').find('.close-white').on('click', function () {
            myApp.closeModal('.popup.popup-chooseStore');
        });

        $$('.popup.popup-chooseStore').find('.storeList').find('li.search').children('span').on('click', function () {
            $$(this).parent().addClass('hide');
            $$(this).parent().find('input').val('');
            $$('.popup.popup-chooseStore').find('.storeList').find('li.search').nextAll().removeClass('hide');
        });

        this.proxy.getAllStoreArea(function (err, result) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            if (result && result.length) {
                self.InitAddress(result);
            }
            else {
                myApp.toast('暂无自提点信息', 'tips').show(true);
                myApp.closeModal('.popup.popup-chooseStore');
                myApp.mainView.router.back();
            }
        });
    };

    view.prototype.InitWebMap = function (val) {
        var InitMap = function () {
            var city = $$('.popup.popup-chooseStore').find('.dai-search').children('.col-auto[data-type="city"]').text();
            var map = new BMap.Map("popupMap-mapArea");
            map.centerAndZoom(city, 15);

            var top_left_control = new BMap.ScaleControl({ anchor: BMAP_ANCHOR_TOP_LEFT });// 左上角，添加比例尺
            var top_right_navigation = new BMap.NavigationControl({ anchor: BMAP_ANCHOR_TOP_RIGHT, type: BMAP_NAVIGATION_CONTROL_SMALL });

            map.addControl(top_left_control);
            map.addControl(top_right_navigation);

            map.enableScrollWheelZoom();   //启用滚轮放大缩小，默认禁用
            map.enableContinuousZoom();    //启用地图惯性拖拽，默认禁用

            cb.cache.set('webMap', map);
        };

        if (!cb.cache.get('webMap')) InitMap();

        var InitMarker = function () {
            var map = cb.cache.get('webMap');
            map.clearOverlays();

            var point = new BMap.Point(val.lng, val.lat);
            var marker = new BMap.Marker(point);  // 创建标注
            map.addOverlay(marker);               // 将标注添加到地图中   

            marker.addEventListener("click", function (e) {
                var p = e.target;
                var opts = {
                    width: 200,     // 信息窗口宽度
                    height: 80,     // 信息窗口高度
                    title: val.name // 信息窗口标题
                };
                var point = new BMap.Point(p.getPosition().lng, p.getPosition().lat);
                var infoWindow = new BMap.InfoWindow('地址：' + val.province + val.city + val.area + val.address + '<br/>电话：' + val.contact_phone,
                    opts);  // 创建信息窗口对象 
                map.openInfoWindow(infoWindow, point); //开启信息窗口
            });
        };
        InitMarker();
    };
    view.prototype.InitLoaclMap = function (val) {
        var self = this;
        if (cb.cache.get('map') && window.plus) {
            var map = cb.cache.get('map');

            if (cb.cache.get('marker'))
                map.removeOverlay(cb.cache.get('marker'));

            var center = new plus.maps.Point(parseFloat(val.lng), parseFloat(val.lat));
            map.setCenter(center);

            var marker = self.creatMarker(val);
            map.addOverlay(marker);
            cb.cache.set('marker', marker);

            map.show();
        }
        else {
            setTimeout(function () {
                var map = new plus.maps.Map("popupMap-mapArea");
                map.centerAndZoom(new plus.maps.Point(parseFloat(val.lng), parseFloat(val.lat)), 12);

                map.showUserLocation(true);
                map.showZoomControls(true);

                if (cb.cache.get('marker'))
                    map.removeOverlay(cb.cache.get('marker'));

                var marker = self.creatMarker(val);
                map.addOverlay(marker);
                cb.cache.set('marker', marker)

                cb.cache.set('map', map);
            }, 300);
        }
    };

    view.prototype.creatMarker = function (val) {
        var marker = new plus.maps.Marker(new plus.maps.Point(parseFloat(val.lng), parseFloat(val.lat)));
        marker.setIcon("/img/location.png");
        marker.setLabel(val.name);
        var bubble = new plus.maps.Bubble(val.city + val.area + val.address);
        marker.setBubble(bubble);
        return marker;
    };

    view.prototype.InitAddress = function (val) {
        var self = this;
        var selectData = this.getView()[0].f7PageData.query;

        var changeEvent = function () {
            var type = $$(this).attr('data-type');
            switch (type) {
                case "province":
                    var data = self.FormateAddress(val, 'city', $$(this).html());
                    $$(this).next().html(data[0]);
                    $$(this).next().trigger('change');
                    break;
                case "city":
                    var data = self.FormateAddress(val, 'area', $$(this).html());
                    $$(this).next().html(data[0]);
                    $$(this).next().trigger('change');
                    break;
                case "area":
                    var param = {
                        province: $$(this).prev().prev().html(),
                        city: $$(this).prev().html(),
                        area: $$(this).html()
                    };
                    self.loadStoreList(param);
                    break;
            }
        };
        var clickEvent = function () {
            var selfBtn = this;
            $$(this).parent().children().removeClass('active');
            $$(this).addClass('active');
            var oldVal = $$(this).prev().html();

            var addData = self.FormateAddress(val, $$(this).attr('data-type'), oldVal);
            myApp.popup(self.InitPopHtml(addData, $$(this).html()));

            $$('.popup.popup-myStore ul li').on('click', function () {
                var id = $$(this).find('input').prop('checked', true).val();
                $$(selfBtn).html(id);
                myApp.closeModal('.popup-myStore');
            });

            $$('.popup.popup-myStore').on('closed', function () {
                $$(selfBtn).trigger('change');
            });
        };
        $$('.popup.popup-chooseStore').find('.dai-search').children('.col-auto').off('change', changeEvent);
        $$('.popup.popup-chooseStore').find('.dai-search').children('.col-auto').on('change', changeEvent);

        $$('.popup.popup-chooseStore').find('.dai-search').children('.col-auto').off('click', clickEvent);
        $$('.popup.popup-chooseStore').find('.dai-search').children('.col-auto').on('click', clickEvent);

        $$('.popup.popup-chooseStore').find('.dai-search').children('.col-auto').each(function () {
            var type = $$(this).attr('data-type');

            if (selectData.selectedValue && selectData.selectedValue.storeAddress)
                $$(this).html(selectData.selectedValue.storeAddress[type]);
            else
                $$(this).html(val[0][type]);
            if (type == 'area')
                $$(this).trigger('change');
        });
    };

    view.prototype.InitPopHtml = function (val, select) {
        var popupHTML = '<div class="popup popup-myStore">' +
                              '<div class="content-block-title">请选择地区</div>' +
                               ' <div class="list-block media-list m-b-5"><ul>';

        for (var i = 0; i < val.length; i++) {
            popupHTML += '<li><label class="label-checkbox item-content"><div class="item-inner"><div class="item-title">' + val[i] + '</div>';
            if (val[i] == select)
                popupHTML += '</div><input type="radio" name="my-checkbox" value="' + val[i] + '" checked>';
            else
                popupHTML += '</div><input type="radio" name="my-checkbox" value="' + val[i] + '">';
            popupHTML += '<div class="item-media"><i class="icon icon-form-checkbox"></i></div></label></li>';
        }
        popupHTML += '</ul></div></div>';

        return popupHTML;
    };

    view.prototype.loadStoreList = function (val) {
        var self = this;
        var param = {
            province: val.province,
            city: val.city,
            area: val.area
        };

        this.proxy.getStoreList(param, function (err, data) {
            if (err) {
                myApp.toast('获取自提点信息失败', 'error').show(true);
                return;
            }
            if (data && self.pageData.selectedValue) {
                if (cb.cache.get('storeDetail')) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id == cb.cache.get('storeDetail').id)
                            data[i].isChecked = true;
                    }
                }
                else {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id == self.pageData.selectedValue.storeId)
                            data[i].isChecked = true;
                    }
                }
            }
            $$('.popup.popup-chooseStore').find('.storeList').find('li.search').nextAll().remove();
            $$('.popup.popup-chooseStore').find('.storeList').find('ul').append(self.render($$('#storeListTpl').html(), { storeList: data }));

            $$('.popup.popup-chooseStore').find('.storeList').find('li').children('label').on('click', function () {
                $$(this).find('input').prop('checked', true);
                var selectId = $$(this).find('input').dataset().id;

                var selectItem = data.filter(function (val) {
                    return val.id == selectId;
                })[0];
                cb.cache.set('storeDetail', selectItem);
                self.storeInfo = selectItem;
                myApp.closeModal('.popup.popup-chooseStore');
            });

            $$('.popup.popup-chooseStore').find('.storeList').find('li').find('.btn-mapLoaction').on('click', function () {
                var itemId = $$(this).children('i').attr('data-id');
                var selectItem = data.filter(function (item) {
                    return item.id == itemId;
                })[0];

                $$('.popup.popup-map').find('.storeDetail-container').html(self.render($$('#storeDetailTpl').html(), selectItem));

                if (cb.config && cb.config.fromWechat) {
                    wx.openLocation({
                        latitude: selectItem.lat,
                        longitude: selectItem.lng,
                        name: selectItem.name,
                        address: selectItem.province + selectItem.city + selectItem.area + selectItem.address,
                        scale: 18 // 地图缩放级别,整形值,范围从1~28。默认为最大
                    });
                }
                else if (window.plus) {
                    self.InitLoaclMap(selectItem);
                    myApp.closeModal('.popup.popup-chooseStore');
                    myApp.popup('.popup.popup-map');

                    if (cb.cache.get('map')) {
                        var map = cb.cache.get('map');
                        map.show();
                    }
                }
                else {
                    self.InitWebMap(selectItem);

                    myApp.closeModal('.popup.popup-chooseStore');
                    myApp.popup('.popup.popup-map');

                    setTimeout(function () {
                        if (cb.cache.get('webMap'))
                            cb.cache.get('webMap').panTo(new BMap.Point(selectItem.lng, selectItem.lat));
                    }, 100);
                }
            });
        });

        var popChooseEvent = function () {
            if (cb.cache.get('storeDetail')) {
                var detail = cb.cache.get('storeDetail');

                var stdHtml = '<div class="item-title">门店自提</div><div class="item-text">' + detail.name + '</div>'
		                            + '<div class="item-subtitle">电话：<a href="tel:' + detail.contact_phone + '" class="external">' + detail.contact_phone + '</a></div>';
                self.getView().find('.db-listblock-container').find('input:checked').parent().children('.item-inner').html(stdHtml);
            }
        };
        $$('.popup.popup-chooseStore').off('closed', popChooseEvent);
        $$('.popup.popup-chooseStore').on('closed', popChooseEvent);
    };

    view.prototype.FormateAddress = function (val, type, key) {
        var addList = new Array();
        switch (type) {
            case "province":
                for (var i = 0; i < val.length; i++) {
                    if (addList.indexOf(val[i].province) < 0)
                        addList.push(val[i].province);
                }
                break;
            case "city":
                for (var i = 0; i < val.length; i++) {
                    if (val[i].province == key && addList.indexOf(val[i].city) < 0)
                        addList.push(val[i].city);
                }
                break;
            case "area":
                for (var i = 0; i < val.length; i++) {
                    if (val[i].city == key && addList.indexOf(val[i].area) < 0)
                        addList.push(val[i].area);
                }
                break;
        }
        return addList;
    };
    return view;
});