cb.views.register('orderDetailController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var _this = this;
        //获取url参数
        var queryString = new cb.util.queryString();
        var cOrderNo = queryString.get("orderId");
        var closeOrderMsg;
        var proxy = cb.rest.DynamicProxy.create({
            getOrderDetail: {
                url: 'client/orders/getDetail',
                method: 'POST',
                options: { token: true }
            },
            getExpressData: {
                url: 'client/orders/lookExpress',
                method: 'GET',
                options: { token: true }
            },
            cancelOrder: {
                url: 'client/Orders/closeOrder',
                method: 'POST',
                options: { token: true }
            },
            confirmTake: {
                url: 'client/Orders/batchConfirmTake',
                method: 'POST',
                options: { token: true }
            },
            getReasonContentList: {
                url: 'client/OrderCancelReason/getReasonContentList',
                method: 'GET',
                options: { token: true }
            }
        });
        //格式化数据
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
        var tipsContainer = $('.wrap-right.orderDetailManage .wrap-right-top').children('.order-tips');
        var logisticsTipsContainer = $('.wrap-right.orderDetailManage .wrap-right-bottom').children('.tips');
        var btnManageContainer = $('.wrap-right.orderDetailManage .wrap-right-top').children('.order-manage');

        proxy.getOrderDetail({ cOrderNo: cOrderNo }, function (err, data) {
            if (err) {
                if (typeof err == 'string')
                    err = JSON.parse(err);
                alert(err.message);
                window.location.href = 'myorder';
                return;
            }
            
            //提交订单  待支付状态
            if (data.cStatusCode == 'SUBMITORDER') { //
                var payCreateTime = new Date(data.dOrderDate.replace(/-/g, '//'));
                if (data.oOrderStatuses && data.oOrderStatuses.length > 0)
                    payCreateTime = new Date(data.oOrderStatuses[0].dCreated.replace(/-/g, '//'));

                var payEndTime = payCreateTime.setDate(payCreateTime.getDate() + 1);
                var timeSpan = payEndTime - (new Date(data.dServerDate.replace(/-/g, '//'))).getTime();
                var payInterval = setInterval(function () {
                    if (timeSpan <= 0) {
                        clearTimeout(payInterval);
                        tipsContainer.html("订单支付已超时！");
                        timeSpan = 0;
                    }
                    var leave1 = timeSpan % (24 * 3600 * 1000);    //计算天数后剩余的毫秒数
                    var hours = Math.floor(leave1 / (3600 * 1000));//计算相差分钟数
                    var leave2 = leave1 % (3600 * 1000);        //计算小时数后剩余的毫秒数
                    var minutes = Math.floor(leave2 / (60 * 1000));//计算相差秒数
                    var leave3 = leave2 % (60 * 1000);      //计算分钟数后剩余的毫秒数
                    var seconds = Math.round(leave3 / 1000);
                    timeSpan -= 1000;
                    tipsContainer.find('.timeSpan.payforTime').html(hours + "时 " + minutes + " 分" + seconds + " 秒");
                }, 1000);

                btnManageContainer.children('span').remove();
                if (data.cOrderPayType == 'FIRSTPAY') {
                    btnManageContainer.append('<span class="active payfor" data-control="payfor">付款</span><span class="message hide" data-control="message">留言</span><span class="cancelOrder" data-control="cancelOrder">取消订单</span><span class="remark" data-control="remark">备注</span>');
                } else if (data.cOrderPayType == 'FIRSTDELIVER') {
                    $('.wrap-right.orderDetailManage').find('.order-tips').hide();
                    btnManageContainer.append('<span class="message hide" data-control="message">留言</span><span class="active cancelOrder" data-control="cancelOrder">取消订单</span><span class="remark" data-control="remark">备注</span>');
                }
                //隐藏物流容器
                $('.wrap-right.orderDetailManage').find('.wrap-right-bottom').hide();
            }
            //已付款  待发货状态
            if (data.cStatusCode == 'PAYMONEY') {
                tipsContainer.html("订单状态： 买家已付款，等待商家发货！");
                btnManageContainer.append('<span class="active remind hide" data-control="remind">提醒卖家发货</span><span class="active returnGoods hide" data-control="returnGoods">退货/换货</span><span class="remark" data-control="remark">订单备注</span>');
                //隐藏物流容器
                $('.wrap-right.orderDetailManage').find('.wrap-right-bottom').hide();
            }

            //已发货 待收货状态位
            if (data.cStatusCode == 'DELIVERGOODS') {

                tipsContainer.html("订单状态： 卖家已发货，请等待收货！");
                btnManageContainer.append('<span class="active remind" data-control="confirmReceive">确认收货</span><span class="buyAgain hide" data-control="buyAgain">再次购买</span><span class="deferredReceive hide" data-control="deferredReceive">延期收货</span>');
                $('.wrap-right.orderDetailManage').find('.wrap-right-bottom').show();

                var createTime = new Date(data.dSendDate.replace(/-/g, '//'));
                if (data.oOrderStatuses && data.oOrderStatuses.length > 0)
                    createTime = new Date(data.oOrderStatuses[data.cOrderPayType=='FIRSTPAY'?2:1].dCreated.replace(/-/g, '//'));

                var endTime = createTime.setDate(createTime.getDate() + 15);
                var timeSpan = endTime - (new Date(data.dServerDate.replace(/-/g, '//'))).getTime();
                var reciveInterval = setInterval(function () {

                    if (timeSpan <= 0) {
                        timeSpan = 0;                        
                        clearTimeout(reciveInterval);
                        //window.location.href = window.location.href;
                    }
                    var days = Math.floor(timeSpan / (24 * 3600 * 1000));
                    var leave1 = timeSpan % (24 * 3600 * 1000);    //计算天数后剩余的毫秒数
                    var hours = Math.floor(leave1 / (3600 * 1000));//计算相差分钟数
                    var leave2 = leave1 % (3600 * 1000);        //计算小时数后剩余的毫秒数
                    var minutes = Math.floor(leave2 / (60 * 1000));//计算相差秒数
                    var leave3 = leave2 % (60 * 1000);      //计算分钟数后剩余的毫秒数
                    var seconds = Math.round(leave3 / 1000);
                    timeSpan -= 1000;
                    $('.wrap-right.orderDetailManage').find('.timeSpan.confirmTime').html(days + '天' + hours + "小时" + minutes + " 分" + seconds + " 秒");
                }, 1000);
            }
            //确认收货  待评价
            if (data.cStatusCode == 'TAKEDELIVERY' || data.cStatusCode == 'ENDORDER') {
                tipsContainer.html("订单状态： 已完成！");
                btnManageContainer.append('<span class="active" data-control="evaluate">评价</span><span class="buyAgain hide" data-control="buyAgain">再次购买</span><span class="remark" data-control="remark">备注</span>');
                $('.wrap-right.orderDetailManage').find('.wrap-right-bottom').show();
                logisticsTipsContainer.html('订单已经确认收货！');
            }

            //初始化进度条
            initProcessBar(data);
            //判断商品是否是礼品卡
            if (!data.oOrderDetails[0].isGiftCard){
                //加载物流信息
                loadExpressInfo(data);
            }

            //初始化退款原因项
            loadReasonContent();

            regeistEvent(data);

            //初始化订单描述  中左
            var orderDescHtml = this.render($('#orderDescTpl').html(), data);
            $('.warp-left.orderDescContainer').html(orderDescHtml);

            //初始化订单明细  中
            var orderDetailHtml = this.render($('#orderDetailTableTpl').html(), data);
            $('.container-main.orderDetailContainer .item-block').find('.item-list').html(orderDetailHtml);

            //初始化订单footer 下
            var orderDetailFooterHtml = this.render($('#orderTotalDescTpl').html(), data);
            $('.orderDetail-container .container-footer').html(orderDetailFooterHtml);
            
            
            if (data.oOrderDetails[0].isGiftCard) {
                $('.warp-left-center').find('.addr-item').hide();
                $('.orderDetail-container .detail-desc .right').children('.field-content.noGift').addClass('hide');                
            }
            this.userdefinedInfo(data);
        }, this);
        //初始化进度
        var initProcessBar = function (data) {
            //初始化订单状态
            var orderStatusHtml = _this.render($('#orderStatusTpl').html(), data);
            $('.stepflex.sflex05.orderStatusProgress').html(orderStatusHtml);
            
            var isComplete = true,completeTime=null;
            if (data.oOrderDetails.length) {
                for (var i = 0; i < data.oOrderDetails.length; i++) {
                    if (data.oOrderDetails[i].iCommentId == 0) {
                        isComplete = false;
                    }
                    else {
                        var comment_time = data.oOrderDetails[i].dCommentTime ? data.oOrderDetails[i].dCommentTime : null;
                        if (!completeTime)
                            comment_time ? completeTime = comment_time : null;
                        else {
                            if (comment_time) {
                                if (comment_time > completeTime) {
                                    completeTime = comment_time;
                                } 
                            }
                        }
                    }
                }
            }
            if (data.oOrderStatuses && data.oOrderStatuses.length > 0) {
                for (var index = 0; index < data.oOrderStatuses.length-1; index++) {
                    var item = data.oOrderStatuses[index];
                    if (item.iCorpId == data.iCorpId && item.iOrderId == data.id) {
                        if (item.cCode == data.cStatusCode) {
                            if ((item.cCode == 'ENDORDER')) {
                                $('.stepflex.orderStatusProgress').children('dl').eq(index - 1).addClass('doing').prevAll().addClass('doing');
                            }
                            else {
                                $('.stepflex.orderStatusProgress').children('dl').eq(index).addClass('doing').prevAll().addClass('doing');
                            }
                        }
                        $('.stepflex.orderStatusProgress').children('dl').eq(index).addClass('doing').prevAll().addClass('doing');
                        $('.stepflex.orderStatusProgress').children('dl').eq(index).find('.s-text.timeSpan').html(item.dCreated);
                    }
                }
            }
            if (isComplete) {
                $('.stepflex.orderStatusProgress').children('dl').addClass('doing');
                $('.stepflex.orderStatusProgress').children('dl').eq(index).find('.s-text.timeSpan').html(completeTime);
            }

            var evaluateCount = 0;
            for (var index = 0; index < data.oOrderDetails.length; index++) {
                if (data.oOrderDetails[index].iCommentId != 0)
                    evaluateCount++;
            }
            if (evaluateCount == data.oOrderDetails.length) {
                $('.stepflex.orderStatusProgress').children('dl').addClass('doing');
                tipsContainer.html("订单状态： 已评价！");
                btnManageContainer.find('span[data-control="evaluate"]').remove();
            }
            
        };
        //加载物流信息
        var loadExpressInfo = function (data) {
            if (data.cLogisticsNo) {
                proxy.getExpressData({ cOrderNo: cOrderNo }, function (err, data) {
                    if (err) {
                        err = typeof (err) == "string" ? err : err.message;
                        ModalTip({ message: err }, _this);
                        return;
                    }
                    var expressHtml = '<div class="logisticsInfo">物流：<span>' + data.corp_name + '</span>     快递单号：<span>' + data.nu + '</span></div><ul class="logisticsInfoList">';
                    if (data.status != '200') {
                        //ModalTip({ message: data.corp_name + '：' + data.message }, _this);
                        $('.logistics.logisticsContainer').html({ message: data.corp_name + '：' + data.message });
                        return;
                    }
                    for (var i = 0; i < data.data.length; i++) {
                        var item = data.data[i];
                        expressHtml += '<li><span class="time">' + item.time + '</span><span class="info">' + item.context + '</span></li>';
                    }
                    expressHtml += '</ul>';
                    $('.logistics.logisticsContainer').html(expressHtml);

                    $('.container-main.orderDetailContainer .item-title').find('.column.t-express').html(data.corp_name);
                    $('.container-main.orderDetailContainer .item-title').find('.column.t-expressNo').html('快递单号：' + data.nu);
                    $('.container-main.orderDetailContainer .item-title').find('.column.t-logisticsInfo').html(data.data[0].time + '  ' + data.data[0].context);
                });
            } else {
                //var html = '<div class="logisticsInfo">商家正在通知快递揽件</div><ul class="logisticsInfoList"><li><span class="time">暂无物流信息</span></li></ul>';
                var html = '<div class="logisticsInfo">暂无物流信息</div>';
                $('.logistics.logisticsContainer').html(html);
            }
        };

        var loadReasonContent = function () {
            proxy.getReasonContentList({ type: "orderclose" }, function (err, data) {
                if (err) {
                    alert(err.message);
                    return;
                }
                var s = '';
                for (var i = 0; i < data.length; i++) {
                    s += '<option value="">' + data[i].reason + '</option>';
                };
                closeOrderMsg = '<div class="row" style="width:auto;"> \
                                <p class="col-lg-3" style="margin-top: 8px;font-size: 16px;">取消原因</p>\
                                <div class="col-lg-6">\
                                    <select id="closeOrderReason" class="form-control">\
                                        '+ s + '\
                                    </select>\
                                </div>\
                            </div>';
            });
        };

        var regeistEvent = function (data) {
            $('.wrap-right.orderDetailManage .wrap-right-top').children('.order-manage').find('span').on('click', function (e) {
                var $this = $(this);
                $(this).addClass('active').siblings().removeClass('active');
                var controlType = $(this).attr('data-control');
                switch (controlType) {
                    case "payfor":
                        window.location.href = '../submit_message?order_id=' + data.cOrderNo;
                        break;
                    case "message":
                        alert('留言');
                        break;
                    case "cancelOrder":
                        var callback = function () {
                            proxy.cancelOrder({ cOrderNo: data.cOrderNo, reason: $("#closeOrderReason option:checked").text() }, function (err, data) {
                                if (err) {
                                    ModalTip({ message: err.message }, _this);
                                    return;
                                }
                                window.location.href = 'myorder';
                            });
                        };
                        ModalTip({ message: closeOrderMsg, confirm: true, okCallback: callback }, _this);
                        break;
                    case "remind":
                        alert('提醒卖家发货');
                        break;
                    case "returnGoods":
                        window.location.href = 'myreturn?detailid=' + data.id;
                        break;
                    case "confirmReceive":
                        if($this.css("cursor") == "not-allowed") return;
                        var callback = function () {
                            $this.css("cursor", "not-allowed");
                            proxy.confirmTake({ cOrderNo: data.cOrderNo }, function (err, data) {
                                if (err) {
                                    ModalTip({ message: err.message }, _this);
                                    $this.css("cursor", "pointer")
                                    return;
                                }
                                window.location.href = 'myorder';
                            });
                        };
                        ModalTip({ message: '您确定要确认收货此订单么？', confirm: true, okCallback: callback }, _this);
                        break;
                    case "buyAgain":
                        alert('再次购买');
                        break;
                    case "deferredReceive":
                        alert('延期收货');
                        break;
                    case "evaluate":
                        window.location.href = 'myevaluation?order_id=' + data.cOrderNo;
                        break;
                    case "remark":
                        window.location.href = 'orderremark?order_id=' + data.cOrderNo;
                        break;
                };
            });
        };
    }
    //by xinggj
    view.prototype.userdefinedInfo = function (result){
        if(!result.oOrderCustomItems)return;
        var userdefinedHtml = this.render($("#userDefinedTpl").html(), {data: result.oOrderCustomItems});
        $('.user-definedinfo').html(userdefinedHtml);
    };
    return view;
})