cb.views.register('AddressViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var self = this;
        var selectModel = false;
        var thisView = this.getView();
        var query = this.getViewData().query;
        if (query.select) {
            selectModel = true;
            if (query.id)
                cb.cache.set('selectModel', query.id);
            else if (!cb.cache.get('selectModel'))
                cb.cache.set('selectModel', '-1');

        }
        var listproxy = cb.rest.DynamicProxy.create({
            getAddressList: {
                url: 'member/Members/getMemberAddress', method: 'GET', options: { token: true, mask: true }
            },
            deleteAddress: {
                url: 'member/Members/deleteMemberAddress', method: 'POST', options: { token: true, mask: true }
            },
            setDefault: {
                url: 'member/Members/saveMemberAddress', method: 'POST', options: { token: true, mask: true }
            }
        });
        //编辑状态切换
        thisView.find('.btn-addressManage').on('click', function (e) {
            if ($$(this).attr('data-Type') == 'edit') {
                thisView.find('#addressContainer .addr-content li').children('.addr-operate').show();
                thisView.find('#addressContainer .addr-content li').find('.item-media.addr-edit').hide();
                $$(this).find('a').html('完成');
                $$(this).attr('data-Type', 'sumit');
            }
            else {
                thisView.find('#addressContainer .addr-content li').children('.addr-operate').hide();
                thisView.find('#addressContainer .addr-content li').find('.item-media.addr-edit').show();
                $$(this).find('a').html('管理');
                $$(this).attr('data-Type', 'edit');
            }
        });
        var loadData = function () {
            listproxy.getAddressList({}, function (err, data) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                    return;
                }
                if (data && data.length)
                    thisView.find('.btn-addressManage').children().removeClass('hide');
                else
                    thisView.find('.btn-addressManage').children().addClass('hide');

                var select = cb.cache.get('selectModel') ? true : false;
                var listData = { addressLists: data ? data : [], isSelect: select };
                for (var i = 0; i < listData.addressLists.length; i++) {
                    if (cb.cache.get('selectModel') && listData.addressLists[i].id == cb.cache.get('selectModel'))
                        listData.addressLists[i].isChecked = true;
                }
                var html = this.render($$('#AddressListTemplate').html(), listData);
                thisView.find('#addressContainer').html(html);
                //逻辑操作按钮功能组
                thisView.find('#addressContainer .addr-content .addr-operate').find('.operate-btn-row').on('click', function (e) {
                    var aid = $$(this).attr('data-addid');
                    var type = $$(this).attr('data-type');
                    var callback = function (proxy, bdefault) {
                        var json = listData.addressLists.filter(function (val) {
                            return val.id == aid;
                        })[0];
                        json.bDefault = bdefault;
                        listproxy[proxy]({ model: json }, function (rerr, rdata) {
                            if (rerr) {
                                myApp.toast(rerr.message, 'error').show(true);
                                return;
                            }
                            myApp.mainView.router.refreshPage();
                            thisView.find('.btn-addressManage').trigger('click');
                            if (rdata.length)
                                thisView.find('.btn-addressManage').children().removeClass('hide');
                            else
                                thisView.find('.btn-addressManage').children().addClass('hide');
                        });
                    }
                    var addressDetail = data.filter(function (item) {
                        return item.id == aid;
                    })[0];

                    switch (type) {
                        case "setDefault":
                            callback('setDefault', true);
                            break;
                        case "edit":
                            myApp.mainView.router.loadPage({
                                url: 'member/addr-new?newAddress=false',
                                query: addressDetail
                            });
                            break;
                        case "del":
                            if (aid != cb.cache.get('selectModel')) {
                                myApp.confirm('确定要删除此条地址信息吗？', '提示信息', function () {
                                    callback('deleteAddress', false);
                                });
                            }
                            else
                                myApp.toast('正在使用该地址，请勿删除', 'tips').show(true);
                            break;
                    }
                });

                thisView.find('#addressContainer li').children('.addressList').on('click', function () {
                    if (cb.cache.get('selectModel')) {
                        if ($$(this).attr('data-isForbidden') == 'true') {
                            myApp.toast('地址已被禁用', 'tips').show(true);
                            return;
                        }
                        $$(this).parent().parent().children('li').removeClass('checked');
                        $$(this).addClass('checked');
                        var addId = $$(this).parent().find('label').attr('data-addid');
                        var backData = listData.addressLists.filter(function (item) {
                            return item.id == addId;
                        })[0];
                        backData.select = true;
                        myApp.mainView.router.back({
                            query: {
                                addressData: backData
                            }
                        });
                    }
                });
            }, self);
        };

        loadData();

        $$(document).on('pageAfterBack', '.page[data-page="addrNewPage"]', function (e) {
            if ($$('div[data-page="addrList"] .btn-addressManage').attr('data-Type') != 'edit')
                $$('div[data-page="addrList"] .btn-addressManage').trigger('click');
            loadData();
        });
    }
    return view;
});
