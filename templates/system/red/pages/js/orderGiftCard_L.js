cb.views.register('OrderViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function (widgets) {
        var self = this;
        var orderProxy = cb.rest.DynamicProxy.create({
            getOrderMode: { url: 'client/Orders/getNewOrder', method: 'GET', options: { token: true, refresh: true } }
        });

        orderProxy.getOrderMode({}, function (err, result) {
            if (err) {
                if (typeof err == 'string') JSON.parse(err);
                alert(err.message);
                window.location.href = "cart";
                return;
            }
            this.result = result;
            this.userDefineLogic(result);
            var commonProxy = cb.rest.DynamicProxy.create({
                submitOrder: {
                    url: 'client/Orders/submitOrder', method: 'POST', options: { token: true }
                },
            });
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
            //统计
            var summery = {
                total: 0,					//总金额
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
                          '      <a target="_blank" href="detail?goods_id=' + item.iProductId + '"><img src="' + item.DefaultImage.replace(/\\/g, "/") + '" style="width:54px;height:54px;"></a>' +
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
                summery.payfor = summery.total;
                $('.order_summary1.orderSummaryContainer').find('.totalPrice').html('商品金额（不含运费）：￥' + priceFormatFunc(summery.total));
                $('.order_summary1.orderSummaryContainer').find('.payforPrice').html('￥'+priceFormatFunc(summery.total));
            }
            else {
                window.location.href = "cart";
            }
            //支付方式
            if (result.oPayType && result.oPayType.length > 0) {
                $('.pay_list').find('ul').children().remove();
                for (var index = 0; index < result.oPayType.length; index++) {
                    if (result.oPayType[index].id == "FIRSTDELIVER") {
                        continue;
                    }
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
            }
            $(".osubmit").find('button').on("click", function (e) {

                result = self.userDefineData(result);
                if(!result) return;
                //end校验结算自定义项
                $(this).prop('disabled', 'disabled');
                result.cClientMemo = $('#remarkText').val();
                result.pointNum = $('.integralContainer .input-point').val() ? $('.integralContainer .input-point').val() : 0;
                result.isPost = $('.orderTabContent.expressContainer').find('input:checked').val() == '1' ? true : false;
                var neworder = { "neworder": result };
                commonProxy.submitOrder(neworder, function (err, result) {
                    if (err) {
                        if (typeof err == 'string')
                            err = JSON.parse(err);
                        alert(err.message);
                    }
                    else {

                        if (result.fPayMoney > 0)
                            window.location.href = "submit_message?order_id=" + result.cOrderNo;
                        else
                            window.location.href = "member/myorder";
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