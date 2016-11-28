cb.views.register('AddrNewPageControoller', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        delAddress: {
            url: 'member/Members/deleteMemberAddress',
            method: 'POST',
            options: {
                token: true,
                mask:true
            }
        },
        addAddressList: {
            url: 'member/Members/saveMemberAddress',
            method: 'POST',
            options: {
                token: true,
                mask:true
            }
        }
    });
    view.prototype.init = function () {
        var thisView = this.getView(); //当前显示页面dom根节点
        var query = this.getViewData().query; // 获得地址信息
        var self = this;
        //禁止非数字输入
        thisView.find('input[name="cZipCode"]').keydown(function (e) {
            var code = e.keyCode;
            if ((code <= 57 && code >= 48) || (code <= 105 && code >= 96) || (code == 8)) {
                return true;
            } else {
                return false;
            }
        });

        var validData = function (val) {
            if (!val.cReceiver) {
                myApp.toast('请输入收货人信息', 'tips').show(true);
                return false;
            }
            if (val.cZipCode) {
                var zipCodeReg = /^[1-9][0-9]{5}$/;
                if (!zipCodeReg.test(val.cZipCode)) {
                    myApp.toast('请输入正确的邮编', 'tips').show(true);
                    return false;
                }
            }
            if (!val.cDistrct) {
                myApp.toast('请选择地址', 'tips').show(true);
                return false;
            }
            if (!val.cAddress) {
                myApp.toast('请输入详细地址', 'tips').show(true);
                return false;
            }
            if ((!val.cMobile) && (!val.cTelePhone)) {
                myApp.toast('请输入电话号码或手机号', 'tips').show(true);
                return false;
            }
            if (val.cMobile) {
                var telReg = !!val.cMobile.match(/^(0|86|17951)?(13[0-9]|15[012356789]|17[678]|18[0-9]|14[57])[0-9]{8}$/);
                if (telReg == false) {
                    myApp.toast('请输入正确格式的手机号', 'tips').show(true);
                    return false;
                }
            }
            return true;
        };

        if (query.newAddress) {
            thisView.find('div[data-page="addrNewPage"] .center').text("新建地址");
            thisView.find("#btnDeleAddr").hide();
        } else {
            query.cDistrct = query.cCountry + " " + query.cProvince + " " + query.cCity + " " + query.cArea;
            myApp.formFromJSON('#AddressDetail', query);

            thisView.find('div[data-page="addrNewPage"] .center').text("修改地址");
            thisView.find("#btnDeleAddr").show();
            if (query.bDefault) {
                thisView.find('#AddressDetail li.isDefault').addClass('checked');
            }
        }
        thisView.find('#AddressDetail li.isDefault').on('click', function () {
            $$(this).toggleClass('checked');
        });

        //获取地址信息
        thisView.find('#picker-dependent').on('click', function (e) {
            myApp.mainView.router.loadPage({
                url: './smartSelect',
                query: {
                    backOnSelect: false,
                    pageTitle: "选择地址",
                    fieldValue: 'regionCode',
                    fieldName: 'name',
                    serverUrl: ['getProvinces', 'getCitysFromProvince', 'getDistrictFromCity'],
                    container: $$('#picker-dependent')
                }
            });
        });

        //监听基础信息页面返动作并执行相应逻辑
        $$(document).on('pageAfterBack', '.page[data-page="SmartSelectListPage"]', function (e) {
            var page = e.detail.page;
            if (page.query) {
                page.query.container.data('value', page.query.value);
                page.query.container.val(page.query.name);
            }
        });

        // 保存和修改地址
        thisView.find('.addrNewPage-address-submit a').on('click', function (e) {
            // 组装地址参数
            var address = myApp.formToJSON('#AddressDetail');
            address.cRegion = thisView.find('#picker-dependent').data('value') ? thisView.find('#picker-dependent').data('value')[thisView.find('#picker-dependent').data('value').length - 1] : query.cRegion;
            address.bDefault = thisView.find(".isDefault").hasClass('checked');

            var addSplitArr = address.cDistrct.split(' ');
            if (addSplitArr.length) {
                address.cCountry = addSplitArr[0];
                address.cProvince = addSplitArr[1];
                address.cCity = addSplitArr[2];
                address.cArea = addSplitArr[3];
            }
            if (!validData(address)) return;
            if (query.id) {
                address.id = query.id;
                address.ts = query.ts;
            }
            self.proxy.addAddressList({
                model: address
            }, function (err, data) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true); //✕✓
                    return;
                }
                // 返回地址页面
                myApp.mainView.router.back();
            });
        });

        thisView.find('.addressManage-btn-del').on('click', function () {
            myApp.confirm('确定要删除此条地址信息吗？', '提示信息', function () {
                self.proxy.delAddress({
                    model: query
                }, function (err, data) {
                    if (err) {
                        myApp.toast(err.message, 'error').show(true); //✕✓
                        return;
                    }
                    myApp.mainView.router.back();
                });
            });
        });
    };
    view.prototype.getAddressData = function (picker, parentData, selectData, proxyName, loop) {
        var self = this;
        var parentId;
        var replaceValue = [];
        for (var i = 0; i < parentData.length; i++) {
            if (parentData[i].name == selectData) {
                parentId = parentData[i].regionCode;
            }
        }
        this.proxy[proxyName]({
            parentId: parentId
        }, function (err, result) {
            if (err) {
                myApp.toast(err.message,'error').show(true);
                return null;
            }
            for (var i = 0; i < result.length; i++) {
                replaceValue.push(result[i].name);
            }
            if (loop) {
                self.city = result;
                if (picker.cols[1].replaceValues) {
                    picker.cols[1].replaceValues(replaceValue);
                    self.getAddressData(picker, result, picker.cols[1].value, 'getAreas', false);
                }
            } else {
                if (picker.cols[2].replaceValues) {
                    picker.cols[2].replaceValues(replaceValue);
                    $$("#picker-dependent").val(picker.cols[0].value + " " + picker.cols[1].value + " " + picker.cols[2].value);
                }
            }
        });
    }
    return view;
});