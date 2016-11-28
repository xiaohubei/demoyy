cb.views.register('OrderViewController', function (controllerName) {
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
            var self = this;
            this.result = result;
            var commonProxy = cb.rest.DynamicProxy.create({
                saveAddress: {url: 'member/Members/saveMemberAddress', method: 'POST', options: { token: true }},
                delAddress: {url: 'member/Members/deleteMemberAddress', method: 'POST', options: { token: true }},
                getExpress: {url: 'promotion/PostActivityService/getPostActivityList', method: 'POST', options: { token: true }},
                ActivityList: {url: 'promotion/PricePreferentialService/getPricePreferentialList', method: 'POST', options: { token: true }},
                getCoupons: {url: 'coupon/MemberCouponServer/getAvailableCoupon', method: 'POST', options: { token: true }},
                submitOrder: {url: 'client/Orders/submitOrder', method: 'POST', options: { token: true }},
                getProvinces: {url: 'client/Regions/getProvinces', method: 'GET', options: { token: true }},
                getCitys: {url: 'client/Regions/getCitysFromProvince', method: 'GET', options: { token: true }},
                getAreas: {url: 'client/Regions/getDistrictFromCity', method: 'GET', options: { token: true }},
                getAllStoreArea: {url: 'client/orders/getAllStoreArea', method: 'GET', options: { token: true, mask: true }},
                getStoreList: {url: 'client/orders/getStoreList', method: 'POST', options: { token: true, mask: true }}
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

                    InitPayType(itemData.isCashOnDelivery);
                    getExpressFunc();
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
                        window.location.href = "order";
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
                    commonProxy.getCitys({ parentId: $('#cProvince option:selected').val() }, function (err, data) {
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
                        commonProxy.getAreas({ parentId: $('#cCity option:selected').val() }, function (err, data) {
                            if (err) {
                                alert(err.message);
                                return;
                            }
                            $('#cArea').children().remove();
                            for (var i = 0; i < data.length; i++) {
                                var option = '<option value="' + data[i].regionCode + '">' + data[i].name + '</option>';
                                if (data[i].regionCode == itemData.cRegion)
                                    option = '<option value="' + data[i].regionCode + '" selected="selected">' + data[i].name + '</option>';
                                $('#cArea').append(option);
                            }
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
                                window.location.href = "order";
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
                        window.location.href = "order";
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

            //-----------------------------------发票信息 start-----------------------------------------------------
            //是否启用发票
            if (!result.invoice_enableflag) {
                $('.order_main .InvoiceInfo').hide();
            }
            //初始化发票类型
            if (result.oInvoiceType && result.oInvoiceType.length > 0) {
                $('.form-horizontal.Invoice .InvoiceTypeContainer').children().remove();
                for (var i = 0; i < result.oInvoiceType.length; i++) {
                    var item = result.oInvoiceType[i];
                    var li = item.id == 'NONE' ? '<li data-value="' + item.id + '">' + item.name + '</li>' : '<li data-value="' + item.id + '">' + item.name + '</li>';
                    if (item.id == 'VAT') {
                        li = '<li class="hide" data-value="' + item.id + '">' + item.name + '</li>';
                    }
                    $('.form-horizontal.Invoice .InvoiceTypeContainer').append(li);
                }
                $('.form-horizontal.Invoice .InvoiceTypeContainer li').on('click', function () {
                    $(this).addClass('checked').siblings().removeClass('checked');

                    if ($(this).attr('data-value') == 'NONE') {
                        $("#InvoiceTitle").attr('disabled', true);
                        $('.form-horizontal.Invoice .InvoiceContentTypeContainer').attr('disabled', true);
                    }
                    else {
                        $("#InvoiceTitle").attr('disabled', false);
                        $('.form-horizontal.Invoice .InvoiceContentTypeContainer').attr('disabled', false);
                    }
                });
                $('.form-horizontal.Invoice .InvoiceTypeContainer li').each(function () {
                    if ($(this).attr('data-value') == 'NONE')
                        $(this).trigger('click');
                });
            }
            if (result.oInvoiceContent && result.oInvoiceContent.length > 0) {
                $('.form-horizontal.Invoice .InvoiceContentTypeContainer').children().remove();
                for (var i = 0; i < result.oInvoiceContent.length; i++) {
                    var item = result.oInvoiceContent[i];
                    var li = i == 0 ? '<li class="checked" data-value="' + item + '">' + item + '</li>' : '<li data-value="' + item + '">' + item + '</li>';
                    $('.form-horizontal.Invoice .InvoiceContentTypeContainer').append(li);
                }
                $('.form-horizontal.Invoice .InvoiceContentTypeContainer li').on('click', function () {
                    $(this).addClass('checked').siblings().removeClass('checked');
                });
            }
            //初始化发票抬头
            if (result.cInvoiceTitle)
                $('#InvoiceTitle').val(result.cInvoiceTitle);

            //保存发票信息
            $('.btn.btn-primary.btn-SaveInvoice').on('click', function () {
                var invioceType = $('.form-horizontal.Invoice .InvoiceTypeContainer').children('.checked').attr('data-value');

                result.cInvoiceType = invioceType;
                if (invioceType != 'NONE') {
                    var invioceTypeName = $('.form-horizontal.Invoice .InvoiceTypeContainer').children('.checked').text();
                    var invioceTitle = $('#InvoiceTitle').val();
                    var InvoiceContent = $('.form-horizontal.Invoice .InvoiceContentTypeContainer').children('.checked').text();

                    if (!invioceTitle) {
                        alert('请输入发票抬头');
                        return;
                    }
                    result.cInvoiceContent = InvoiceContent;
                    result.cInvoiceTitle = invioceTitle;
                    $('.InvoiceInfo .InvoiceShow').html('<span>' + invioceTypeName + '</span><span>' + invioceTitle + '</span><span>' + InvoiceContent + '</span>');
                }
                else {
                    $('.InvoiceInfo .InvoiceShow').html('<span>不开发票</span>');
                }
                $('#InvoiceManage').modal('hide');
            });

            //-----------------------------------发票信息 end-------------------------------------------------------

            //-----------------------------------配送方式 start-----------------------------------------------------
            if (result.oDeliverTypeList) {
                for (var i = 0; i < result.oDeliverTypeList.length; i++) {
                    $('.distributionContent').append('<li><span data-code="' + result.oDeliverTypeList[i].id + '">' + result.oDeliverTypeList[i].name + '</span></li>');
                }
                $('.distributionContent').append('<p class="tips-storeContent"></p>');
                $('.distributionContent').find('span[data-code="EMS"]').addClass('isdefault');
            }

            var InitStoreModal = function () {
                var formateAddress = function (val, type, key) {
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
                    var liHtml = '';
                    for (var i = 0; i < addList.length; i++) {
                        liHtml += '<li>' + addList[i] + '</li>';
                    }
                    return liHtml;
                };

                var storeListHtml = function (val) {
                    var html = '';
                    if (val && val.length) {
                        for (var i = 0; i < val.length; i++) {
                            html += ' <li data-key="|' + val[i].name + '|' + val[i].province + '|' + val[i].city + '|' + val[i].area + '|' + val[i].address + '|' + val[i].contact_phone + '">' +
                                         '<input type="radio" name="myStore" value="' + val[i].id + '" data-name="' + val[i].name + '" data-address="' + val[i].province + ' ' + val[i].city + ' ' + val[i].area + '" />' +
                                         '<p class="title">' + val[i].name + '</p>' +
                                         '<p>地址： ' + val[i].province + val[i].city + val[i].area + val[i].address + '</p>' +
                                         '<p>电话：' + val[i].contact_phone + '</p>' +
                                      '</li>';
                        }
                    }
                    return html;
                };
                var cAddressData = $('.address_list_opts').find('li').find('.isdefault').parent().parent().data('itemData');
                if (cAddressData) {
                    if ($('.tips-storeContent').data('storeInfo'))
                        $('#storeModal .input-storeArea').val($('.tips-storeContent').data('storeInfo').storeAddress);
                    else
                        $('#storeModal .input-storeArea').val(cAddressData.cProvince + ' ' + cAddressData.cCity + ' ' + cAddressData.cArea);
                }


                $('#storeModal .input-storeArea').on('focus', function () {
                    $(this).nextAll('.storeSearch-list').removeClass('hide');
                    commonProxy.getAllStoreArea(function (serr, stData) {
                        if (err) {
                            alert(serr.message);
                            return;
                        }
                        if (stData && stData.length) {
                            $('#storeModal .ul-area-title').children('li').on('click', function () {
                                $(this).addClass('active').siblings().removeClass('active');

                                var liType = $(this).attr('data-type');
                                var key = $(this).prev().text();
                                $(this).parent().next().find('ul').html(formateAddress(stData, liType, key));
                                $(this).parent().next().find('ul li').on('click', function () {
                                    $('#storeModal .ul-area-title').children('li.active').html('<a>' + $(this).text() + '</a>');
                                    if (liType != 'area')
                                        $('#storeModal .ul-area-title').children('li.active').next().trigger('click');
                                    else {
                                        $('#storeModal .input-storeArea').val('').nextAll('.storeSearch-list').addClass('hide');
                                        $('#storeModal .ul-area-title').children('li').each(function () {
                                            $('#storeModal .input-storeArea').val($('#storeModal .input-storeArea').val() + $(this).children('a').text() + ' ');
                                        });
                                        $('#storeModal .storeContainer').trigger('valueChange');
                                    }
                                });
                            }).eq(0).trigger('click');
                        }
                        else {
                            alert('暂无可用的自提点信息');
                        }
                    });
                });

                $('#storeModal .storeContainer').on('valueChange', function () {
                    var addKey = $('#storeModal .input-storeArea').val().trim().split(' ');
                    if (addKey.length == 3) {
                        var param = {
                            province: addKey[0],
                            city: addKey[1],
                            area: addKey[2]
                        };
                        commonProxy.getStoreList(param, function (slerr, slResult) {
                            if (slerr) {
                                alert(slerr.message);
                                return;
                            }
                            $('#storeModal .storeContainer').html(storeListHtml(slResult));

                            if ($('.tips-storeContent').data('storeInfo')) {
                                var storeId = $('.tips-storeContent').data('storeInfo').storeId;
                                $('#storeModal .storeContainer').find('input[value="' + storeId + '"]').prop('checked', true);
                            }

                            if (!slResult || slResult.length == 0)
                                $('#storeModal .storeList').children('.no-content').removeClass('hide');
                            else
                                $('#storeModal .storeList').children('.no-content').addClass('hide');

                            if (!map) InitMap(cAddressData.cCity);
                            InitMarker(slResult);

                            $('#storeModal .storeContainer').find('li').on('click', function () {
                                var storeId = $(this).find('input').prop('checked', true).val();

                                if (cb.cache.get('marker') && cb.cache.get('marker')[storeId]) {
                                    var ckMarker = cb.cache.get('marker')[storeId];
                                    ckMarker.show();
                                    map.panTo(new BMap.Point(ckMarker.point.lng, ckMarker.point.lat));
                                    for (var attr in cb.cache.get('marker')) {
                                        var attrValue = cb.cache.get('marker')[attr];
                                        if (attr != storeId)
                                            attrValue.hide();
                                    }
                                }

                            });
                        });
                    }
                }).trigger('valueChange');
            };

            var map = null;
            var InitMap = function (val) {
                // 百度地图API功能	
                map = new BMap.Map("mapContainer");
                map.centerAndZoom(val, 15);

                var top_left_control = new BMap.ScaleControl({ anchor: BMAP_ANCHOR_TOP_LEFT });// 左上角，添加比例尺
                var top_left_navigation = new BMap.NavigationControl();  //左上角，添加默认缩放平移控件
                var top_right_navigation = new BMap.NavigationControl({ anchor: BMAP_ANCHOR_TOP_RIGHT, type: BMAP_NAVIGATION_CONTROL_SMALL });

                map.addControl(top_left_control);
                map.addControl(top_left_navigation);
                map.addControl(top_right_navigation);

                map.enableScrollWheelZoom();   //启用滚轮放大缩小，默认禁用
                map.enableContinuousZoom();    //启用地图惯性拖拽，默认禁用
            };

            var InitMarker = function (val) {
                if (!map) return;

                var opts = {
                    width: 200,     // 信息窗口宽度
                    height: 80,     // 信息窗口高度
                    title: "信息窗口", // 信息窗口标题
                    enableMessage: true//设置允许信息窗发送短息
                };

                function addClickHandler(content, marker) {
                    marker.addEventListener("click", function (e) {
                        openInfo(content, e)
                    });
                }
                function openInfo(content, e) {
                    var p = e.target;
                    opts.title = content.title;
                    var point = new BMap.Point(p.getPosition().lng, p.getPosition().lat);
                    var infoWindow = new BMap.InfoWindow(content.context, opts);  // 创建信息窗口对象 
                    map.openInfoWindow(infoWindow, point); //开启信息窗口
                }
                if (val) {
                    var markerObj = {};
                    for (var i = 0; i < val.length; i++) {
                        var marker = new BMap.Marker(new BMap.Point(parseFloat(val[i].lng), parseFloat(val[i].lat)));  // 创建标注
                        var content = {
                            title: val[i].name,
                            id: val[i].id,
                            context: '地址：' + val[i].province + val[i].city + val[i].area + val[i].address + '<br/>电话：' + val[i].contact_phone
                        };
                        map.addOverlay(marker);               // 将标注添加到地图中
                        //marker.setAnimation(BMAP_ANIMATION_BOUNCE);
                        addClickHandler(content, marker);
                        markerObj[val[i].id] = marker;
                        marker.hide();
                    }
                    cb.cache.set('marker', markerObj);
                }
            };

            $('.distributionContent li').on('click', function () {
                $(this).children().addClass('isdefault').parent().siblings().children().removeClass('isdefault');
                if ($(this).children('span').attr('data-code') == 'PICKUP') {
                    InitStoreModal();
                    $('#storeModal').modal({ backdrop: 'static' });
                    $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥0.00');
                }
                else {
                    $('.tips-storeContent').html('');
                    var postPrice = $('.orderTabContent.expressContainer').find('input[value="0"]').data('expressPrice');
                    $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥' + priceFormatFunc(postPrice));
                }
                result.cDeliverType = $(this).children('span').attr('data-code');

                $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');
            });
            var storeSearchEvent = function () {
                var keyWord = $('#storeModal .input-storeKeyWord').val();
                if (keyWord) {
                    $('#storeModal .storeContainer').find('li').each(function () {
                        if ($(this).attr('data-key') && $(this).attr('data-key').indexOf(keyWord) > 0)
                            $(this).removeClass('hide');
                        else
                            $(this).addClass('hide');
                    });

                    if ($('#storeModal .storeContainer').find('li').not('.hide').length == 0)
                        $('#storeModal .storeList').children('.no-content').removeClass('hide');
                    else
                        $('#storeModal .storeList').children('.no-content').addClass('hide');
                }
                else {
                    $('#storeModal .storeList').children('.no-content').addClass('hide');
                    $('#storeModal .storeContainer').find('li').removeClass('hide');
                }
            };
            $('#storeModal .input-storeKeyWord').bind('keyup', storeSearchEvent);
            $('#storeModal .btn-store-search').bind('click', storeSearchEvent);

            $('#storeModal .btn-saveStore').bind('click', function () {
                var selectStore = $('#storeModal .storeContainer').find('input:checked');
                if (selectStore.length) {
                    $('.tips-storeContent').html('自提点：' + selectStore.attr('data-name') + '<a href="#">修改</a>').data('storeInfo', { storeId: selectStore.val(), storeAddress: selectStore.attr('data-address') });
                    $('.tips-storeContent a').bind('click', function () {
                        InitStoreModal();
                        $('#storeModal').modal('show');
                    });
                    $('#storeModal').modal('hide');
                }
                else
                    alert('请选择要自提的门店');
            });

            //-----------------------------------配送方式 end-------------------------------------------------------

            //统计
            var summery = {
                activity: 0, 			//优惠
                expressCost: result.isPost ? 0 : result.iPostage,  //运费
                total: 0, 				//总金额
                payfor: 0
            };
            var priceFormatFunc = function (x) {
                var f_x = parseFloat(x);
                if (isNaN(f_x)) {
                    alert('function:changeTwoDecimal->parameter error');
                    return false;
                }
                var f_x = Math.round(x * 100) / 100;
                var s_x = f_x.toString();
                var pos_decimal = s_x.indexOf('.');
                if (pos_decimal < 0) {
                    pos_decimal = s_x.length;
                    s_x += '.';
                }
                while (s_x.length <= pos_decimal + 2) {
                    s_x += '0';
                }
                return s_x;
            };

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
                    '<div class="good-price">￥' + item.fNewSalePrice.toFixed(2) + '</div>' +
                    '</dd>' +
                    '<dd class="col-xs-2 text-center line-0">' +
                    '<div class="good-number">X' + item.iQuantity + '</div>' +
                    '</dd>' +
                    '<dd class="col-xs-2 text-center line-0">' +
                    '<div class="good-sum">￥' + (parseFloat(item.fNewSalePrice.toFixed(2)) * item.iQuantity).toFixed(2) + '</div>' +
                    '</dd>' +
                    '</dl>';
                    $(".shopping-list .goods-items").append(dl);
                    summery.total += parseFloat(item.fNewSalePrice.toFixed(2)) * item.iQuantity;
                }
                $('.order_summary1.orderSummaryContainer').find('.totalPrice').html('商品金额（不含运费）：￥' + priceFormatFunc(summery.total));
            }
            else
                window.location.href = "/cart";

            var InitPayType = function (isCashOnDelivery) {
                $('.pay_list').find('ul').children().remove();
                for (var index = 0; index < result.oPayType.length; index++) {
                    if (!isCashOnDelivery && result.oPayType[index].id == 'FIRSTDELIVER') continue;
                    var $liChirdren = $('<li><span data-code="' + result.oPayType[index].id + '">' + result.oPayType[index].name + '</span></li>');
                    $liChirdren.data('itemData', result.oPayType[index]);
                    if (index == 0) {
                        $liChirdren.children('span').addClass('isdefault');
                        result.cPayType = result.oPayType[index].id;
                    }
                    $liChirdren.on('click', function () {
                        $(this).children('span').addClass('isdefault').parent().siblings().children('span').removeClass('isdefault');

                        var liData = $(this).data('itemData');
                        result.cPayType = liData.id;
                    });
                    $('.pay_list').find('ul').append($liChirdren);
                }
            };
            //支付方式
            if (result.oPayType && result.oPayType.length > 0) {
                var isCashOnDelivery = false;
                if (hasDefaultAddress)
                    isCashOnDelivery = result.oMemeber.memberAddress.filter(function (item) {
                        return item.bDefault && !item.isForbidden;
                    })[0].isCashOnDelivery;
                InitPayType(isCashOnDelivery);
            }
            var dataCollectionFunc = function () {
                //计算优惠
                if ($('.OrderActivities.orderDiscount.activitieContainer .inner').find('input').length > 0) {
                    summery.activity = result.preferentialId ? result.preferentialCutPrice : 0;
                }
                else
                    summery.activity = 0;
                //计算邮费
                $('.orderTabContent.expressContainer').find('input').each(function () {
                    if ($(this).is(':checked')) {
                        if ($(this).val() == '0')
                            summery.expressCost = $(this).data('expressPrice');
                        else
                            summery.expressCost = 0;
                    }
                });

                //计算优惠券
                if ($('.OrderActivities.orderCoupon.couponContainer').children('div').find('input').length > 0) {
                    summery.CouponPrice = result.couponId ? result.couponPriceTS : 0;
                }
                else
                    summery.CouponPrice = 0;

                summery.payfor = summery.total - summery.activity;

                if (summery.payfor < summery.CouponPrice)
                    summery.payfor = 0;
                else
                    summery.payfor -= summery.CouponPrice;

                if (!result.cDeliverType || result.cDeliverType != 'PICKUP')
                    summery.payfor += summery.expressCost;

                if (summery.payfor < 0)
                    summery.payfor = 0;

                return summery;
            };

            $('.order_summary1.orderSummaryContainer').find('.payforPrice').bind('valueChange', function (e) {
                var value = dataCollectionFunc();
                if ($('.integralContainer .input-point').val()) {
                    if (value.payfor >= result.integralOffset)
                        value.payfor = value.payfor - result.integralOffset;
                    else {
                        alert('输入的使用积分数超过订单金额，请重新输入');
                        $('.integralContainer .input-point').val('');
                        $('.integralContainer .integralOffset').html('抵扣￥0');
                        $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');
                    }
                }
                $(this).html('￥' + priceFormatFunc(value.payfor));
            });

            //初始化积分
            if (result.pointRule && result.pointRule.fOneYuanEquPoints && result.pointRule.fOnePointsEquYuan) {
                if (result.oMemeber && !result.oMemeber.hasOwnProperty('iPoints')) {
                    result.oMemeber.iPoints = 0;
                }
                $('.integralContainer').show();
                $('.integralContainer .integral').html(result.oMemeber.iPoints);
                $('.integralContainer .input-point').keydown(function (e) {
                    var code = e.keyCode;
                    if ((code <= 57 && code >= 48) || (code <= 105 && code >= 96) || (code == 8)) {
                        return true;
                    } else {
                        return false;
                    }
                });
                $('.integralContainer .input-point').keyup(function () {
                    this.value = this.value.replace(/[^\d]/g, '');
                    if ($(this).val()) {
                        if ($(this).val() > result.oMemeber.iPoints) {
                            alert('输入的使用积分数超过可用积分，请重新输入');
                            $(this).val('');
                            $('.integralContainer .integralOffset').html('抵扣￥0');
                            $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');
                        }
                        else {
                            var integralOffset = (parseFloat($(this).val()) / parseFloat(result.pointRule.fOneYuanEquPoints)) * result.pointRule.fOnePointsEquYuan;
                            var valueTotal = dataCollectionFunc();
                            if (integralOffset > valueTotal.payfor) {
                                alert('输入的使用积分数超过订单金额，请重新输入');
                                $(this).val('');
                                $('.integralContainer .integralOffset').html('抵扣￥0');
                                $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');
                                return;
                            }
                            result.integralOffset = integralOffset;
                            $('.integralContainer .integralOffset').html('抵扣￥' + integralOffset.toFixed(2));
                            $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');
                        }
                    }
                    else {
                        $('.integralContainer .integralOffset').html('抵扣￥0');

                        $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');
                    }
                });
            } else if (!result.pointRule || !result.pointRule.fOneYuanEquPoints || !result.pointRule.fOnePointsEquYuan) {
                $('.integralContainer').hide();
            }
            //初始化运费选择块
            $('.orderTabContent.expressContainer').find('input').each(function () {
                if (result.isPost) {
                    if ($(this).val() == '1') {
                        $(this).prop('checked', 'checked');
                        $(this).data('expressPrice', result.iPostage);
                    }
                    else {
                        $(this).data('expressPrice', result.iPostage);
                    }
                }
                else {
                    if ($(this).val() == '0') {
                        $(this).prop('checked', 'checked');
                        $(this).data('expressPrice', result.iPostage);
                        if (!result.cDeliverType || result.cDeliverType != 'PICKUP')
                            $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥' + priceFormatFunc(result.iPostage));
                        else
                            $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥0');
                    }
                    else
                        $(this).prop('disabled', 'disabled');
                }
            });
            $('.orderTabContent.expressContainer').find('input').on('change', function () {
                var data = $(this).data('expressPrice');
                if (data) {
                    if ($(this).val() == '0' && (!result.cDeliverType || result.cDeliverType != 'PICKUP'))
                        $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥' + data);
                    else
                        $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥0');
                }
                else
                    $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥0');

                //触发自定义事件
                $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');
            });
            //计算运费方法
            var getExpressFunc = function () {
                var expressParam = {
                    orderDetail: result.oOrderDetails
                };
                expressParam.price = summery.total;
                if ($('.OrderActivities.orderDiscount.activitieContainer .inner').find('input').length > 0) {
                    summery.activity = result.preferentialId ? result.preferentialCutPrice : 0;
                    expressParam.price -= summery.activity;
                }
                expressParam.pricePreferentialProId = result.preferentialId ? result.preferentialId : null;
                expressParam.addressId = result.iMemeberAddress || getaddressInfoFunc().id;
                expressParam.member = result.oMemeber;
                expressParam.dlyTypeId = result.ideliveryTypeid;
                expressParam.giftPreferItemId = result.activityIds ? result.activityIds : '';
                commonProxy.getExpress({ param: expressParam }, function (err, data) {
                    if (err) {
                        alert(err.message);
                        return;
                    }
                    result.isPost = data.isPost;
                    $('.orderTabContent.expressContainer').find('input').removeAttr('disabled');

                    $('.orderTabContent.expressContainer').find('input').each(function () {
                        if (data.isPost) {
                            if ($(this).val() == '1') {
                                $(this).prop('checked', 'checked');
                                $(this).data('expressPrice', data.postPrice[result.iCorpId]);
                            }
                            else
                                $(this).data('expressPrice', data.postPrice[result.iCorpId]);
                        }
                        else {
                            if ($(this).val() == '0') {
                                $(this).prop('checked', 'checked');
                                $(this).data('expressPrice', data.postPrice[result.iCorpId]);
                                if (!result.cDeliverType || result.cDeliverType != 'PICKUP')
                                    $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥' + priceFormatFunc(data.postPrice[result.iCorpId]));
                                else
                                    $('.order_summary1.orderSummaryContainer').find('.expressPrice').html('￥0');
                            }
                            else
                                $(this).prop('disabled', 'disabled');
                        }
                    });
                    $('.orderTabContent.expressContainer').find('input:checked').trigger('change');
                });
            };
            //配送方式
            if (result.odeliveryType && result.odeliveryType.length > 0) {
                $('.shopping-list .dis-models').find('ul').children().remove();
                for (var index = 0; index < result.odeliveryType.length; index++) {
                    var $liChirdren = $('<li class="mode-tab-item"><span class="m-txt" data-code="' + result.odeliveryType[index].id + '">' + result.odeliveryType[index].dt_name + '</span></li>');
                    $liChirdren.data('itemData', result.odeliveryType[index]);
                    if (index == 0) $liChirdren.addClass('curr');
                    $liChirdren.on('click', function () {
                        $(this).addClass('curr').siblings().removeClass('curr');

                        var liData = $(this).data('itemData');
                        result.ideliveryTypeid = liData.id;
                        result.ideliveryName = liData.dt_name;

                        getExpressFunc();
                    });
                    $('.shopping-list .dis-models').find('ul').append($liChirdren);
                }
            }

            if (!hasDefaultAddress)
                $ulStr.find('li').eq(0).show().children('.add_header').trigger('click');

            //优惠信息  --   当前用户优惠信息列表
            commonProxy.ActivityList({ orderDetailList: result.oOrderDetails, member: result.oMemeber, giftPreferItemId: (result.activityIds ? result.activityIds : '') }, function (err, data) {
                if (err || !data) {
                    alert('获取优惠信息失败：' + err.message);
                    return;
                }
                var discounts = [];
                var fires = [];
                data.forEach(function (item) {
                    switch (item.pType) {
                        case 0:
                            discounts.push(item);
                            break;
                        case 1:
                            fires.push(item);
                            break;
                    }
                });
                var html = self.render($('#OrderCouponTpl').html(), { discounts: discounts, fires: fires });
                $('.OrderActivities.orderDiscount .inner').html(html);

                //进行优惠核算
                $('.OrderActivities.orderDiscount.activitieContainer .inner').find('input').on('change', function (e) {
                    var id = $(this).attr('data-id');

                    $('.OrderActivities.orderDiscount.activitieContainer .inner').find('input').each(function () {
                        if ($(this).attr('data-id') != id)
                            $(this).prop('checked', false);
                    });

                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id == id) {
                            if ($(this).is(':checked')) {
                                result.preferentialId = id;
                                result.preferentialName = data[i].pName;
                                result.preferentialCutPrice = data[i].cutPrice;
                                $('.order_summary1.orderSummaryContainer').find('.OrderActivitiesCutPrice').html('￥' + priceFormatFunc(data[i].cutPrice.toFixed(2)));
                            }
                            else {
                                delete result.preferentialId;
                                delete result.preferentialName;
                                $('.order_summary1.orderSummaryContainer').find('.OrderActivitiesCutPrice').html('￥0');
                            }
                        }
                    }
                    getExpressFunc();
                    var totalValue = dataCollectionFunc();
                    getCouponListFunc(totalValue.activity, totalValue.expressCost);
                });

                if (data.length > 0) {
                    //触发默认优惠核算
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].isBest && data[i].isBest == true) {
                            $('.order_summary1.orderSummaryContainer').find('.OrderActivitiesCutPrice').html('￥' + priceFormatFunc(data[i].cutPrice.toFixed(2)));

                            result.preferentialId = data[i].id;
                            result.preferentialName = data[i].pName;
                            result.preferentialCutPrice = data[i].cutPrice;
                            getExpressFunc();
                            break;
                        }
                    }
                }
                else
                    $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');

                var getCouponListFunc = function (cutPrice, shippingAmount) {
                    //加载优惠券
                    var totalValue = dataCollectionFunc();
                    var couponParam = {
                        orderDetail: result.oOrderDetails,
                        payableAmounts: totalValue.payfor - totalValue.expressCost,
                        promotionAmount: cutPrice,
                        promotionAmountId: result.preferentialId,
                        shippingAmount: shippingAmount,
                        pageIndex: 1,
                        pageSize: 1000,
                        giftPreferItemId: result.activityIds ? result.activityIds : ''
                    };
                    commonProxy.getCoupons({ param: couponParam }, function (err, data) {
                        if (err || !data) {
                            alert('获取优惠券失败：' + err.message);
                            return;
                        }
                        if (data.availableMemberCoupon.length) {
                            for (var i = 0; i < data.availableMemberCoupon.length; i++) {
                                data.availableMemberCoupon[i].expireStartDate = data.availableMemberCoupon[i].expireStartDate.split(' ')[0];
                                data.availableMemberCoupon[i].expireEndDate = data.availableMemberCoupon[i].expireEndDate.split(' ')[0];
                            }
                        }
                        if (data.unavailableMemberCoupon.length) {
                            for (var i = 0; i < data.unavailableMemberCoupon.length; i++) {
                                data.unavailableMemberCoupon[i].expireStartDate = data.unavailableMemberCoupon[i].expireStartDate.split(' ')[0];
                                data.unavailableMemberCoupon[i].expireEndDate = data.unavailableMemberCoupon[i].expireEndDate.split(' ')[0];
                            }
                        }
                        var html = self.render($('#OrderCouponsTpl').html(), data);

                        $('.OrderActivities.orderCoupon.couponContainer').children('div').html(html);

                        //缓存数据
                        $('.OrderActivities.orderCoupon.couponContainer').children('div').data('CouponData', data.availableMemberCoupon);

                        $('.OrderActivities.orderCoupon.couponContainer').children('div').find('li').on('click', function (e) {
                            $(this).addClass('curr').siblings().removeClass('curr');
                            var index = $('.OrderActivities.orderCoupon').children('div').find('li').index(this);
                            $('.OrderActivities.orderCoupon').children('div').find('.coupon-tab-con').eq(index).addClass('active').siblings().removeClass('active');
                        });

                        $('.OrderActivities.orderCoupon.couponContainer').children('div').find('input').on('change', function (e) {
                            var id = $(this).attr('data-code');

                            $('.OrderActivities.orderCoupon.couponContainer').children('div').find('input').each(function () {
                                if ($(this).attr('data-code') != id) {
                                    $(this).prop('checked', false);
                                }
                            });

                            for (var i = 0; i < data.availableMemberCoupon.length; i++) {
                                if (id == data.availableMemberCoupon[i].couponCoding) {
                                    if ($(this).is(':checked')) {
                                        result.couponId = id;
                                        result.couponName = data.availableMemberCoupon[i].title;
                                        result.couponPrice = data.availableMemberCoupon[i].reduceAmount;
                                        result.couponTs = data.availableMemberCoupon[i].couponTs;
                                        var payData = dataCollectionFunc();
                                        if (data.availableMemberCoupon[i].maxReduceAmount < (payData.total - payData.activity))
                                            $('.order_summary1.orderSummaryContainer').find('.orderCouponCutPrice').html('￥' + priceFormatFunc(data.availableMemberCoupon[i].maxReduceAmount.toFixed(2)));
                                        else
                                            $('.order_summary1.orderSummaryContainer').find('.orderCouponCutPrice').html('￥' + (payData.total - payData.activity).toFixed(2));

                                        result.couponPriceTS = (data.availableMemberCoupon[i].maxReduceAmount < (payData.total - payData.activity)) ? data.availableMemberCoupon[i].maxReduceAmount : (payData.total - payData.activity);
                                    }
                                    else {
                                        delete result.couponId;
                                        delete result.couponName;
                                        delete result.couponPrice;
                                        delete result.couponPriceTS;
                                        $('.order_summary1.orderSummaryContainer').find('.orderCouponCutPrice').html('￥0');
                                    }
                                }
                            }
                            $('.order_summary1.orderSummaryContainer').find('.payforPrice').trigger('valueChange');
                        }).trigger('change');
                    });
                };
                var totalValue = dataCollectionFunc();
                getCouponListFunc(totalValue.activity, totalValue.expressCost);
            }, this);

            $('.order_summary1.orderSummaryContainer').find('.btn-order').on('click', function () {
                if ($(this).children('i').hasClass('up')) {
                    $(this).children('i').removeClass('up').addClass('down');
                    $(this).parent().find('.orderTabContent').addClass('hide');
                }
                else if ($(this).children('i').hasClass('down')) {
                    $(this).children('i').removeClass('down').addClass('up');
                    $(this).parent().find('.orderTabContent').removeClass('hide');
                }
            });

            this.userDefineLogic(result);

            $(".osubmit").find('button').on("click", function (e) {
                if ($('.address_list_opts').find('span.isdefault').length == 0) {
                    alert("收货地址为空");
                    return;
                }
                result = self.userDefineData(result);
                if(!result) return;
                //end校验结算自定义项
                result.cClientMemo = $('#remarkText').val();
                result.pointNum = $('.integralContainer .input-point').val() ? $('.integralContainer .input-point').val() : 0;
                result.isPost = $('.orderTabContent.expressContainer').find('input:checked').val() == '1' ? true : false;
                result.promotionCode = cb.rest.AppContext.inviteCode;
                result.promoter = cb.rest.AppContext.promotCode;
                result.cDeliverType = $('.distributionContent li').children('span.isdefault').attr('data-code');
                if (result.cDeliverType == 'PICKUP') {
                    result.storeId = $('.tips-storeContent').data('storeInfo') ? $('.tips-storeContent').data('storeInfo').storeId : null;
                    if (!result.storeId) {
                        alert('请选择自提点门店');
                        return;
                    }
                }
                var neworder = { "neworder": result };
                $(this).prop('disabled', 'disabled');
                commonProxy.submitOrder(neworder, function (err, result) {
                    if (err) {
                        if (typeof err == 'string')
                            err = JSON.parse(err);
                        alert(err.message);
                    }
                    else {
                        if (!cb.rest.AppContext.promotCode) {
                            cb.data.CookieParser.delCookie('inviteCode');
                            delete cb.rest.AppContext.inviteCode;
                        }
                        if (result.cPayType == "FIRSTDELIVER") {//货到付款
                            window.location.href = "member/orderdetail?orderId=" + result.cOrderNo;
                        } else {
                            if (result.fPayMoney > 0)
                                window.location.href = "submit_message?order_id=" + result.cOrderNo;
                            else
                                window.location.href = "member/myorder";
                        }
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