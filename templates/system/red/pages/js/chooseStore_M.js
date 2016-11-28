cb.views.register('chooseStoreViewController', function (controllerName) {
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

        self.proxy = cb.rest.DynamicProxy.create({
            getAllStoreArea: {
                url: 'client/orders/getAllStoreArea', method: 'GET', options: { token: true, mask: true }
            },
            getStoreList: {
                url: 'client/orders/getStoreList', method: 'POST', options: { token: true, mask: true }
            }
        });

        thisView.find('.dai-search').children('.btn-search').on('click', function () {
            thisView.find('.storeList').find('li.search').toggleClass('hide');
            if (thisView.find('.storeList').find('li.search').hasClass('hide')) {
                thisView.find('.storeList').find('li.search').find('input').val('');
                thisView.find('.storeList').find('li.search').nextAll().removeClass('hide');
            }
        });

        thisView.find('.storeList').find('li.search').find('input').on('keypress', function (e) {
            if (e.which == 13) {
                var keyValue = $$(this).val();
                if (keyValue) {
                    thisView.find('.storeList').find('li.search').nextAll().each(function () {
                        if ($$(this).attr('data-key') && $$(this).attr('data-key').indexOf(keyValue) > 0)
                            $$(this).removeClass('hide');
                        else
                            $$(this).addClass('hide');
                    });
                }
                else {
                    thisView.find('.storeList').find('li.search').nextAll().removeClass('hide');
                }
                e.preventDefault();
            }
        });

        thisView.find('.storeList').find('li.search').children('span').on('click', function () {
            $$(this).parent().addClass('hide');
            $$(this).parent().find('input').val('');
            thisView.find('.storeList').find('li.search').nextAll().removeClass('hide');
        });

        self.proxy.getAllStoreArea(function (err, result) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            if (result && result.length) {
                self.InitAddress(result, pageData);
            }
            else {
                myApp.toast('暂无自提点信息', 'tips').show(true);
                myApp.mainView.router.back();
            }
        });

        $$('.popup.popup-map').children('.navbar').find('.close-white').remove();
        $$('.popup.popup-map').children('.navbar').find('.right').html('<i class="icon close-white"></i>');
        $$('.popup.popup-map').children('.navbar').find('.close-white').on('click', function () {
            myApp.closeModal('.popup.popup-map');

            if (cb.cache.get('map') && window.plus) {
                var map = cb.cache.get('map');
                map.hide();
            }
        });
    };
    view.prototype.InitAddress = function (val, checkedValue) {
        var self = this;

        this.getView().find('.dai-search').children('.col-auto').on('change', function () {
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
        });

        this.getView().find('.dai-search').children('.col-auto').on('click', function () {
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
        });

        this.getView().find('.dai-search').children('.col-auto').each(function () {
            var type = $$(this).attr('data-type');
            if (checkedValue.selectedValue && checkedValue.selectedValue.storeAddress)
                $$(this).html(checkedValue.selectedValue.storeAddress[type]);
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

        var selectId = this.getView()[0].f7PageData.query.selectedValue.storeId;

        this.proxy.getStoreList(param, function (err, data) {
            if (err) {
                myApp.toast('获取自提点信息失败', 'error').show(true);
                return;
            }
            if (selectId) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].id == selectId)
                        data[i].isChecked = true;
                }
            }
            self.getView().find('.storeList').find('li.search').nextAll().remove();
            self.getView().find('.storeList').find('ul').append(self.render($$('#storeListTpl').html(), { storeList: data }));

            self.getView().find('.storeList').find('li').children('label').on('click', function () {
                $$(this).find('input').prop('checked', true);
                var selectId = $$(this).find('input').dataset().id;

                var selectItem = data.filter(function (val) {
                    return val.id == selectId;
                })[0];
                myApp.mainView.router.back({
                    query: {
                        storeData: selectItem
                    }
                });
            });

            self.getView().find('.storeList').find('li').find('.btn-mapLoaction').on('click', function () {
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
                        scale: 20 // 地图缩放级别,整形值,范围从1~28。默认为最大
                    });
                }
                else if (window.plus) {
                    self.InitLoaclMap(selectItem);
                    myApp.popup('.popup.popup-map');

                    if (cb.cache.get('map') && window.plus) {
                        var map = cb.cache.get('map');
                        map.show();
                    }
                }
                else {
                    self.InitWebMap(selectItem);
                    myApp.popup('.popup.popup-map');

                    setTimeout(function () {
                        if (cb.cache.get('webMap'))
                            cb.cache.get('webMap').panTo(new BMap.Point(selectItem.lng, selectItem.lat));
                    }, 100);
                }
            });
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
        if (cb.cache.get('map')) {
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