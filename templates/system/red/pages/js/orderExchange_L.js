cb.views.register('OrderExchangeViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function (widgets) {

        var orderProxy = cb.rest.DynamicProxy.create({
            getOrderMode: { url: 'client/Orders/getNewOrder', method: 'GET', options: { token: true, refresh: true } }
        });

        orderProxy.getOrderMode({}, function (err, result) {
            if (err) {
                if (typeof err == 'string') JSON.parse(err);
                alert(err.message);
                window.location.href = "/cart";
                return;
            }
            this.result = result;
            this.userDefineLogic(result)
            var self = this;
            var commonProxy = cb.rest.DynamicProxy.create({
                saveAddress: {
                    url: 'member/Members/saveMemberAddress', method: 'POST', options: { token: true }
                },
                delAddress: {
                    url: 'member/Members/deleteMemberAddress', method: 'POST', options: { token: true }
                },                
                submitOrder: {
                    url: 'client/Orders/submitOrder', method: 'POST', options: { token: true }
                },
                getProvinces: {
                    url: 'client/Regions/getProvinces', method: 'GET', options: { token: true }
                },
                getCitys: {
                    url: 'client/Regions/getCitysFromProvince', method: 'GET', options: { token: true }
                },
                getAreas: {
                    url: 'client/Regions/getDistrictFromCity', method: 'GET', options: { token: true }
                },
                getAllStoreArea: {
                    url: 'client/orders/getAllStoreArea', method: 'GET', options: { token: true, mask: true }
                },
                getStoreList: {
                    url: 'client/orders/getStoreList', method: 'POST', options: { token: true, mask: true }
                }
            });
            //--------------------------------地址部分  start--------------------------------------------------------
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
            var $ulStr = $('<ul></ul>');
            var hasDefaultAddress = false;
            if (!result.oMemeber.memberAddress)
                result.oMemeber.memberAddress = [];
            for (var i = result.oMemeber.memberAddress.length - 1; i >= 0; i--) {
                var item = result.oMemeber.memberAddress[i];
                if (item.isForbidden) {
                    continue;
                }
                else if (item.bDefault && !item.isForbidden)
                    hasDefaultAddress = true;
                var $li = $('<li>' +
						'<div class="add_header"><span class="' + (item.bDefault ? 'isdefault' : '') + '">' + (item.bDefault ? '默认地址' : item.cReceiver + item.cProvince) + '</span></div>' +
						'<div class="add_list">' +
							'<span class="add_name">' + item.cReceiver + '</span>' +
                            '<span class="add_mobile">' + (item.cMobile ? item.cMobile : item.cTelePhone) + '</span>' +
							'<span>' + item.cProvince + '</span>' +
							'<span>' + item.cCity + '</span>' +
							'<span>' + item.cArea + '</span>' +
							'<span class="detail-addr">' + item.cAddress + '</span>' +
						'</div>' +
						'<div class="opts">' +
							'<span data-optstype="setdefault" clsss="setdefault">设为默认地址</span>' +
							'<span data-optstype="edit" data-toggle="modal" data-target="#newaddress" clsss="edit">编辑</span>' +
							'<span data-optstype="delete" clsss="delete">删除</span>' +
						'</div>' +
					'</li>').data("itemData", item);

                $li.children(".add_header").on('click', function (e) {
                    var itemData = $(this).parent().data("itemData");
                    itemData.bDefault = true;
                    var $li = $(e.target).closest('li');
                    $li.siblings().find('.add_header span').removeClass('isdefault');
                    $(this).children('span').addClass('isdefault');

                    result.iMemeberAddress = itemData.id;
                    result.cReceiveAddress = itemData.cAddress;
                    result.cReceiver = itemData.cReceiver;
                    result.cRegion = itemData.cRegion;
                    result.cReceiveMobile = itemData.cMobile;
                    result.cReceiveTelePhone = itemData.cTelePhone;
                    result.cReceiveZipCode = itemData.cZipCode;
                });
                $li.on('mouseover', function (e) {
                    if ($(this).find("span.isdefault").length > 0) {
                        $(this).find('[data-optstype="setdefault"]').hide();
                    } else {
                        $(this).find('[data-optstype="setdefault"]').show();
                    }
                });
                //设置默认邮寄地址
                $li.find('[data-optstype="setdefault"]').on('click', function (e) {

                    var itemData = $(this).parent().parent().data("itemData");
                    itemData.bDefault = true;
                    var that = $(this).parent().parent().children(".add_header");

                    commonProxy.saveAddress({ model: itemData }, function (err, result) {
                        if (err) {
                            alert(err.message);
                            return;
                        }
                        $(".address_list_opts").find('ul>li>div.add_header>span').removeClass("isdefault");
                        $(that).children("span").addClass("isdefault");
                        window.location.href = "orderExchange";
                    });
                });
                //编辑地址
                $li.find('[data-optstype="edit"]').on('click', function (e) {
                    var itemData = $(this).parent().parent().data("itemData");
                    if (itemData) {
                        //弹出框循环赋值
                        for (var key in itemData) {
                            if (typeof itemData[key] != "function") {
                                var $item = $("#" + key)
                                if ($item) {
                                    $item.val(itemData[key]);
                                }
                            }
                        }
                    }
                    //为地址选择框赋值
                    $("#cProvince").find("option:contains('" + itemData.cProvince + "')").prop("selected", "selected");
                    commonProxy.getCitys({ parentId: $('#cProvince').val() }, function (err, data) {
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
                        $("#cCity").find("option:contains('" + itemData.cCity + "')").prop("selected", "selected");

                        commonProxy.getAreas({ parentId: $('#cCity').val() }, function (err, data) {
                            if (err) {
                                alert(err.message);
                                return;
                            }
                            $('#cArea').children().remove();
                            for (var i = 0; i < data.length; i++) {
                                var option = '<option value="' + data[i].regionCode + '">' + data[i].name + '</option>';
                                $('#cArea').append(option);
                            }
                            $("#cArea").val(itemData.cRegion);
                        });
                    });

                    $('#bDefault').attr('checked', itemData.bDefault);

                    //修改地址需要   ----地址id保存赋值
                    if (itemData.id) {
                        $("#addressid").val(itemData.id);
                    }
                });
                //删除地址
                $li.find('[data-optstype="delete"]').on('click', function (e) {
                    if (confirm('是否确认删除此条地址信息？')) {
                        var itemData = $(this).parent().parent().data("itemData");
                        var that = $(this).parent().parent().children(".add_header");;
                        commonProxy.delAddress({ model: itemData }, function (err, result) {
                            if (!err) {
                                window.location.href = "orderExchange";
                            }
                        });
                    }
                });
                $ulStr.append($li);
            }

            //更多地址
            $('.address_list_opts').append($ulStr);
            var $newaddress = '<a data-mytype="newaddress" data-toggle="modal" data-backdrop="static" data-target="#newaddress" class="newaddress">新增收货地址</a>';
            $('.address_list_opts ul').append($newaddress);
            $('.address_list_opts ul a').last().on('click', function () {
                clearModalData();
            });

            if (!hasDefaultAddress)
                $ulStr.find('li').eq(0).show().children('.add_header').trigger('click');

            var addressValid = function (val) {
                if (!val.cReceiver) {
                    alert("请输入收货人");
                    return false;
                }
                if (!val.cMobile && !val.cTelePhone) {
                    alert("请输入电话号或手机号");
                    return false;
                }
                if (val.cMobile) {
                    var telReg = !!val.cMobile.match(/^(0|86|17951)?(13[0-9]|15[012356789]|17[678]|18[0-9]|14[57])[0-9]{8}$/);
                    if (telReg == false) {
                        alert("请输入正确格式的手机号");
                        return false;
                    }
                }
                if (!val.cProvince || val.cProvince == '省份') {
                    alert("请选择省份");
                    return false;
                }
                if (!val.cCity || val.cCity == '地级市') {
                    alert("请选择市区");
                    return false;
                }
                if (!val.cArea || val.cArea == '市、县级市、县') {
                    alert("请选择市、县级市、县");
                    return false;
                }
                if (!val.cAddress) {
                    alert("请输入详细地址");
                    return false;
                }
                if (!val.cRegion) {
                    alert("无效的区域编码");
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
            //地址弹出框保存按钮事件
            $('#newaddressSave').on("click", function (e) {
                var itemData = {
                    cAddress: $("#cAddress").val(),
                    cArea: $("#cArea").find("option:selected").text(),
                    cCity: $("#cCity").find("option:selected").text(),
                    cEmail: result.oMemeber.cEmail,
                    cMobile: $("#cMobile").val(),
                    cProvince: $("#cProvince").find("option:selected").text(),
                    cReceiver: $("#cReceiver").val(),
                    cTelePhone: $("#cTelePhone").val(),
                    cZipCode: $("#cZipCode").val(),
                    cRegion: $("#cArea").val(),
                    iCorpId: result.oMemeber.iCorpId,
                    iMemberId: result.oMemeber.id
                }
                if (!addressValid(itemData)) return;
                if ($('#bDefault').is(':checked'))
                    itemData.bDefault = true;
                else
                    itemData.bDefault = false;
                //当addressid存在是保存  不存在是新增
                if ($("#addressid").val()) {
                    itemData.id = $("#addressid").val();
                    itemData.ts = result.oMemeber.memberAddress.filter(function (addrItem) {
                        return addrItem.id == itemData.id;
                    })[0].ts;
                }

                commonProxy.saveAddress({ model: itemData }, function (err, result) {
                    if (err) {
                        alert(err.message);
                        return;
                    } else {
                        window.location.href = "orderExchange";
                    }
                });
            });

            //获取地址信息
            var getaddressInfoFunc = function () {
                var addressId;
                $('.address_list_opts li').each(function () {
                    if ($(this).children('.add_header').find('span').hasClass('isdefault')) {
                        addressId = $(this).data('itemData');
                        return false;
                    }
                });
                return addressId ? addressId : $('.address_list_opts li').eq(0).data('itemData');
            };

            var InitAddressForm = function () {
                commonProxy.getProvinces(function (err, data) {
                    $('#cProvince').children().remove();
                    if (err) {
                        alert(err.message);
                        return;
                    }
                    for (var i = 0; i < data.length; i++) {
                        var option = '<option value="' + data[i].regionCode + '">' + data[i].name + '</option>';
                        $('#cProvince').append(option);
                    }
                    $('#cProvince').trigger('change');
                });
                //注册新增地址的下拉选项
                $('.form-group.regionListArea').find('select').on('change', function () {
                    if ($(this).hasClass('provice')) {
                        if (!$('#cProvince').val()) return;

                        commonProxy.getCitys({ parentId: $('#cProvince').val() }, function (err, data) {
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

                        commonProxy.getAreas({ parentId: $('#cCity').val() }, function (err, data) {
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


            };
            InitAddressForm();
            //-----------------------------------地址部分  end-------------------------------------------------------

            if (result.oOrderDetails.length > 0) {
                for (var i = 0, len = result.oOrderDetails.length; i < len; i++) {
                    var item = result.oOrderDetails[i];
                    var dl = '<dl>' +
                         '<dt class="col-xs-6">' +
                         '    <div class="good-img col-xs-2">' +
                          '      <a target="_blank" href="detail?goods_id=' + item.iProductId + '"><img src="' + cb.util.adjustImgSrc(item.DefaultImage) + '" style="width:54px;height:54px;"/></a>' +
                         '    </div>' +
                         '   <div class="good-info col-xs-9">' +
                         '        <div class="good-name">' + item.cProductName + '</div>' +
                    '        <div class="good-size">' + item.cSpecDescription + '</div>' +
                    '    </div>' +
                    '</dt>' +
                    '<dd class="col-xs-2 text-center line-0">' +
                    '<div class="good-price">' + item.salePoints + '积分</div>' +
                    '</dd>' +
                    '<dd class="col-xs-2 text-center line-0">' +
                    '<div class="good-number">X' + item.iQuantity + '</div>' +
                    '</dd>' +
                    '<dd class="col-xs-2 text-center line-0">' +
                    '<div class="good-sum">' + item.fSalePoint + '积分</div>' +
                    '</dd>' +
                    '</dl>';
                    $(".shopping-list .goods-items").append(dl);
                }
            }
            else
                window.location.href = "/cart";
            
            $('.payforPrice').html(result.pointNum);
            $(".osubmit").find('button').on("click", function (e) {
                if ($('.address_list_opts').find('span.isdefault').length == 0) {
                    alert("收货地址为空");
                    return;
                }
                result = self.userDefineData(result);
                if(!result) return;
                //end校验结算自定义项
                result.cClientMemo = $('#remarkText').val();
                result.promotionCode = cb.rest.AppContext.inviteCode;
                result.promoter = cb.rest.AppContext.promotCode;
                result.cDeliverType = 'EMS';
                result.cPayType = 'FIRSTPAY';
                var neworder = { "neworder": result };
                $(this).attr('disabled', 'disabled');
                commonProxy.submitOrder(neworder, function (err, result) {
                    if (err) {
                        if (typeof err == 'string')
                            err = JSON.parse(err);
                        alert(err.message);
                        $(".osubmit").find('button').removeAttr('disabled');
                    }
                    else {
                        if (!cb.rest.AppContext.promotCode) {
                            cb.data.CookieParser.delCookie('inviteCode');
                            delete cb.rest.AppContext.inviteCode;
                        }
                        window.location.href = "member/orderdetail?orderId=" + result.cOrderNo;
                    }
                });
            });
        }, this);
    }
    view.prototype.userDefineLogic = function (result){
        //结算自定义项 --xinggj
        if(!result.oOrderCustomItems) return;
        var userDefineDom =$(".order_main .user-defined");
        var UserDefinedHtml = this.render($('#UserDefinedTpl').html(), {data:result.oOrderCustomItems});
        userDefineDom.find(".container").html(UserDefinedHtml);
        userDefineDom.find(".dropdown-menu li a").click(function (e){
            var referenceDom = $(this).parent().parent().siblings().find('.reference');
            if($(this).text() == "清空"){
                referenceDom.val("请选择")
            }else{
                referenceDom.val($(this).text())
            }
        })
        //end结算自定义项 --xinggj
    }
    view.prototype.userDefineData = function (){
        var result = this.result;
        var userDefineDom =$(".order_main .user-defined");
        var defineDataDom = userDefineDom.find('input.user-defined-data');
        for(var i=0; i<defineDataDom.length; i++){
            for(var j=0; j<result.oOrderCustomItems.length; j++){
                var value = result.oOrderCustomItems[j];
                if($(defineDataDom[i]).data("cdefinename") == value.cDefineName){
                    var defineData = $(defineDataDom[i]).val();
                    if(defineData.length > value.iLength){
                        alert(value.cTitle + '长度必须为'+ value.iLength +',请重新输入!');
                        return;
                    }
                    if(defineData.length == 0 && !value.isNull){
                        alert(value.cTitle + "不能为空,请重新输入!");
                        return;
                    }
                    value.cDefaultValue = defineData;
                }
            }
        }
        return result;
    }
    return view;
});