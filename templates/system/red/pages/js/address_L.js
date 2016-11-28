cb.views.register('AddressViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {

        var clearModalData = function () {
            $('#addressid').val('');
            $("#cAddress").val(''),
            $("#cArea").val('市、县级市、县'),
            $("#cCity").val('地级市'),
            $("#cProvince").val('省份'),
            $("#cZipCode").val(''),
            $("#cReceiver").val(''),
            $("#cMobile").val(''),
            $("#cTelePhone").val(''),
            $("#bDefault").attr('checked', true)
        };
        //禁止非数字输入
        $("#cZipCode").keydown(function (e) {
            var code = e.keyCode;
            if ((code <= 57 && code >= 48) || (code <= 105 && code >= 96) || (code == 8)) {
                return true;
            } else {
                return false;
            }
        });

        var validData = function (val) {
            if (!val.cReceiver) {
                alert("请输入收货人信息");
                return false;
            }
            if (val.cZipCode) {
                var zipCodeReg = /^[1-9][0-9]{5}$/;
                if (!zipCodeReg.test(val.cZipCode)) {
                    alert("请输入正确的邮编");
                    return false;
                }
            }
            if (!val.cArea) {
                alert("请选择省市区");
                return false;
            }
            if (!val.cAddress) {
                alert("请输入详细地址");
                return false;
            }
            if ((!val.cMobile) && (!val.cTelePhone)) {
                alert("请输入电话号码或手机号");
                return false;
            }
            if (val.cMobile) {
                var telReg = !!val.cMobile.match(/^(0|86|17951)?(13[0-9]|15[012356789]|17[678]|18[0-9]|14[57])[0-9]{8}$/);
                if (telReg == false) {
                    alert("请输入正确格式的手机号");
                    return false;
                }
            }
            return true;
        };

        var listproxy = cb.rest.DynamicProxy.create({
            getAddressList: {
                url: 'member/Members/getMemberAddress', method: 'GET', options: { token: true }
            },
            deleteAddress: {
                url: 'member/Members/deleteMemberAddress', method: 'POST', options: { token: true }
            },
            getProvinces: {
                url: 'client/Regions/getProvinces', method: 'GET', options: { token: true }
            },
            getCitys: {
                url: 'client/Regions/getCitysFromProvince', method: 'GET', options: { token: true }
            },
            getAreas: {
                url: 'client/Regions/getDistrictFromCity', method: 'GET', options: { token: true }
            }
        });
        $('.form-group.regionListArea').find('select').on('change', function () {
            if ($(this).hasClass('provice')) {
                if (!$('#cProvince').val()) return;

                listproxy.getCitys({ parentId: $('#cProvince').val() }, function (err, data) {
                    if (err) {
                        alert(err.message);
                        return;
                    }
                    $('#cCity').children().remove();
                    $('#cArea').children().remove();
                    for (var i = 0; i < data.length; i++) {
                        var option = '<option value="' + data[i].regionCode + '">' + data[i].name + '</option>';
                        $('#cCity').append(option);
                    }
                    $('#cCity').trigger('change');
                });

            }
            if ($(this).hasClass('city')) {
                if (!$('#cCity').val()) return;

                listproxy.getAreas({ parentId: $('#cCity').val() }, function (err, data) {
                    if (err) {
                        alert(err.message);
                        return;
                    }
                    $('#cArea').children().remove();
                    for (var i = 0; i < data.length; i++) {
                        var option = '<option value="' + data[i].regionCode + '">' + data[i].name + '</option>';
                        $('#cArea').append(option);
                    }
                });
            }
        });

        var self = this;
        listproxy.getProvinces(function (err, data) {
            $('#cProvince').children().remove();
            if (err) {
                alert(err.message);
                return;
            }
            for (var i = 0; i < data.length; i++) {
                var option = i == 0 ? '<option value="' + data[i].regionCode + '" selected>' + data[i].name + '</option>' : '<option value="' + data[i].regionCode + '">' + data[i].name + '</option>';
                $('#cProvince').append(option);
            }
            $('#cProvince').trigger('change');
        });
        listproxy.getAddressList({}, function (err, data) {
            if (err) {
                alert(err);
                return;
            }
            if (!data) data = new Array();
            self.addList = data;
            var html = this.render($('#myInformationTpl').html(), { addrList: data });
            $("#addrList").html(html);
            $("#addressNum_botton").html(data.length);
            $('.showModelBtn').on('click', function () {
                clearModalData();
                $("#myModalLabel").html("新增地址");
                if (data.length >= 20) {
                    alert("抱歉，地址信息最多可创建20条。");
                    return false;
                }
                else
                    $('#myAddress').modal('show');
            });
            //编辑地址
            $('.middle_r.addressManageArea').find('a').on('click', function (e) {
                var className = $(this).attr('class');
                var id = $(this).attr('data-id');
                switch (className) {
                    case "edit-btn":
                        $("#myModalLabel").html("编辑地址");
                        $('#myAddress').modal('show');
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].id == id) {
                                var itemData = data[i];
                                $('#addressid').val(id)
                                for (var attr in itemData) {
                                    if ($('#' + attr)) {
                                        $('#' + attr).val(itemData[attr]);
                                    }
                                }
                                $("#cProvince").find("option:contains('" + itemData.cProvince + "')").prop("selected", "selected");
                                listproxy.getCitys({ parentId: $("#cProvince option:selected").val() }, function (err, data) {
                                    if (err) {
                                        alert(err.message);
                                        return;
                                    }
                                    $('#cCity').children().remove();
                                    for (var i = 0; i < data.length; i++) {
                                        var option = '<option value="' + data[i].regionCode + '">' + data[i].name + '</option>';
                                        if (itemData.cCity == data[i].name)
                                            option = '<option value="' + data[i].regionCode + '" selected="selected">' + data[i].name + '</option>';
                                        $('#cCity').append(option);
                                    }
                                    listproxy.getAreas({ parentId: $('#cCity option:selected').val() }, function (err, data) {
                                        if (err) {
                                            alert(err.message);
                                            return;
                                        }
                                        $('#cArea').children().remove();
                                        for (var i = 0; i < data.length; i++) {
                                            var option = '<option value="' + data[i].regionCode + '">' + data[i].name + '</option>';
                                            if (itemData.cRegion == data[i].regionCode)
                                                option = '<option value="' + data[i].regionCode + '" selected="selected">' + data[i].name + '</option>';
                                            $('#cArea').append(option);
                                        }
                                    });
                                });
                                $('#bDefault').attr('checked', data[i].bDefault);
                                break;
                            }
                        }
                        break;
                    case "common-address":
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].id == id) {
                                var itemData = data[i];
                                itemData.bDefault = true;
                                var editproxy = cb.rest.DynamicProxy.create({ postAddressList: { url: 'member/Members/saveMemberAddress', method: 'POST', options: { token: true } } });
                                editproxy.postAddressList({ model: itemData }, function (err, data) {
                                    if (err) {
                                        alert(err);
                                        return;
                                    }
                                    window.location.href = 'address';
                                });

                            }
                        }
                        break;
                    case "delete-btn":
                        if (confirm("您确定要删除该地址么？")) {
                            var id = $(this).attr('data-id');
                            for (var i = 0; i < data.length; i++) {
                                if (data[i].id == id) {
                                    listproxy.deleteAddress({ model: data[i] }, function (err, data) {
                                        if (err) {
                                            alert(err);
                                            return;
                                        }
                                        if (data)
                                            window.location.href = 'address';
                                    });
                                    break;
                                }
                            }
                        }
                    break;
                }
            });
        }, this);
        //弹出框保存按钮
        $("#newaddressSave").on('click', function () {
            var itemData = {
                cAddress: $("#cAddress").val(),
                cArea: $("#cArea").find("option:selected").text(),
                cCity: $("#cCity").find("option:selected").text(),
                cProvince: $("#cProvince").find("option:selected").text(),
                cRegion:$("#cArea").val(),
                cZipCode: $("#cZipCode").val(),
                cReceiver: $("#cReceiver").val(),
                cMobile: $("#cMobile").val(),
                cTelePhone: $("#cTelePhone").val(),
                bDefault: $("#bDefault").prop('checked')
            }
            if (!validData(itemData)) return;
            if ($('#addressid').val()) {
                itemData.id = $('#addressid').val();
                itemData.ts= self.addList.filter(function (item) {
                    return item.id == itemData.id;
                })[0].ts;
            }                

            var saveproxy = cb.rest.DynamicProxy.create({ addAddressList: { url: 'member/Members/saveMemberAddress', method: 'POST', options: { token: true } } });
            saveproxy.addAddressList({ model: itemData }, function (err, data) {
                if (err) {
                    alert(err.message);
                    return;
                }
                clearModalData();
                window.location.href = 'address';
            });
            listproxy.getAddressList();
        });
    }
    return view;
});

