cb.views.register('MyOrderController', function (controllerName) {
    var view = function (widgets) {cb.views.BaseView.call(this, widgets);};
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        searchMemberSelfOrders:{url: 'client/orders/searchMemberSelfOrders', method: 'POST',options: {token: true}},
        getOrderList:{url: 'client/orders/getUserOrders', method: 'POST',options: {token:true,mask:true}},
        getOrdersNum:{url: 'client/Orders/getOrderStyleCount',method:'post',options:{token:true}},
        batchConfirmTake:{url:'client/Orders/batchConfirmTake',method:'POST',options:{token:true}},
        closeOrder:{url:'client/Orders/closeOrder',method:'POST',options:{token:true}},
        orderMemo:{url:'client/Orders/orderMemo',method:'POST',options:{token:true}},
        getLogisticsCorp:{url:'client/Orders/getLogisticsCorp',method:'POST',options:{token:true}},
        returnGoods:{url:'client/SaleReturns/returnGoods',method:'POST',options:{token:true}},
        getReasonContentList: {url:'client/OrderCancelReason/getReasonContentList',method: 'GET',options: { token: true }},
        getDetail:{ url: 'client/Orders/getDetail', method: 'GET', options: { token: true, autoLogin: false }}
    });
    view.prototype.getOrderList = function ( isAppend, callback){
        this.proxyHasFinished = false;
        this.postData.status = this.postData.status == "all" ?"" : this.postData.status;
        if(!isAppend){
            var currentStatus = this._get_data("currentStatus");
            $$("#tabSwitch").find('a').removeClass("active");
            $$("#tabSwitch").find('a[data-filter='+currentStatus+']').addClass("active");
        };
        this.proxy[this.service]( this.postData, function (err, result) {
            if (err) {
                myApp.toast("获取我的订单失败" +err.message,'error').show(true);
                return;
            };
            if(result){
                if(!result.orders.length){
                    myApp.detachInfiniteScroll($$('#orderList-container'));
                    $$('#orderList-container .infinite-scroll-preloader').remove();
                }
                this.totalCount = result.count;
                this.dealWithOrderLists(result, isAppend, callback);
            };
        },this);
    };
    view.prototype.searchMemberSelfOrders = function (postData){
        var currentStatus = this._get_data("currentStatus");
        $$("#tabSwitch").find('a').removeClass("active");
        $$("#tabSwitch").find('a[data-filter='+currentStatus+']').addClass("active");
        this.proxy.searchMemberSelfOrders(postData, function (err, result) {
            if (err) {
                myApp.toast("获取我的订单失败" +err.message,'error').show(true);
                return;
            };
            this.dealWithOrderLists(result);
        },this);
    };
    view.prototype.dealWithOrderLists = function(result,isAppend, callback){
        var self = this;
        self.orderList = result.orders;
        var currentStatus = this._get_data("currentStatus");
        $$('#orderList-container .infinite-scroll-preloader').remove();
        var orderListTpl =$$("#orderListTpl").html() ;
        for(var i = 0; i<result.orders.length; i++){
            result.orders[i].isGiftCard = result.orders[i].oOrderDetails[0].isGiftCard;
            var order = result.orders[i];
            for(var j=0; j<order.oOrderDetails.length; j++){
                order.oOrderDetails[j].cNextStatus = order.cNextStatus;
                order.oOrderDetails[j].cOrderNo = order.cOrderNo;
                order.oOrderDetails[j].cOrderPayType = order.cOrderPayType;
            }
        };
        var orderListHtml =this.render(orderListTpl, { orderList: result.orders});
        if(!isAppend){
            $$("#orderList").html("");
        };
        if (result.orders.length==0 && $$("#orderList").html() !="" ){

        }else{
            $$("#orderList").append(orderListHtml);
        }
        this.isShowSearchIcon();
        this.proxyHasFinished = true;
        if(callback)callback();
        this.eventRegister();
    };
    view.prototype.getCancelOrderReason = function(callback){
        var self = this;
        if(self.cancelOrderReason) return;
        this.proxy.getReasonContentList({type:"orderclose"},function(err, result){
            if(err){
                console.log(err.message);
                return;
            };
            self.cancelOrderReason = result;
            var s = '';
            for(var i=0; i<result.length; i++){
                s+= '<li>\
                        <label class="label-checkbox item-content">\
                            <div class="item-inner">\
                                <div class="item-title">'+result[i].reason+'</div>\
                            </div>\
                            <input type="radio" name="my-checkbox" value='+result[i].reason+'>\
                            <div class="item-media">\
                                <i class="icon icon-form-checkbox"></i>\
                            </div>\
                        </label>\
                    </li>';
            };
            var cancelPopup = $$(document.body).find('.popup-cancelreason');
            cancelPopup.find('ul').html(s);
            cancelPopup.find('.confirm-popup').on("click", function (e){
                var reason;
                var inputDom = cancelPopup.find("ul input");
                for(var i=0; i<inputDom.length ; i++){
                    if(inputDom[i].checked) reason = inputDom[i].value;
                };
                if(!reason) {
                    myApp.toast("请选择取消原因"," 提示").show(true);
                    return;
                }
                callback(reason);
                myApp.closeModal('.popup-cancelreason');
            });
            cancelPopup.find('.close-popup').on("click", function (e){
                self.operateEventStart = false;
                myApp.closeModal('.popup-cancelreason');
            });
        },this);
    };
    view.prototype.getOrdersNum = function (){
        this.proxy.getOrdersNum({pageIndex: 1,pageSize: 10}, function(err,result){
            if(err){
                console.log(err.message);
                return;
            };
            var statusList = result;
            var $tabNav = $$("#tabSwitch");
            for(var i = 0; i < statusList.length; i++){
                switch(statusList[i][0]){
                    case 'PAYMONEY':
                        if(statusList[i][1]){
                            $tabNav.find('a[data-filter="PAYMONEY"] span').text(statusList[i][1]);
                        }
                        break;
                    case 'DELIVERGOODS':
                        if(statusList[i][1]){
                            $tabNav.find('a[data-filter="DELIVERGOODS"] span').text(statusList[i][1]);
                        break;
                        }
                    case 'TAKEDELIVERY':
                        if(statusList[i][1]){
                            $tabNav.find('a[data-filter="TAKEDELIVERY"] span').text(statusList[i][1]);
                        break;
                        }
                    case 'UNREMARK':
                        if(statusList[i][1]){
                            $tabNav.find('a[data-filter="UNREMARK"] span').text(statusList[i][1]);
                        break;
                        }
                };
            };
        });
    };
    view.prototype.eventRegister = function (){
        var self = this;
        var pageIndex = this._get_data("pageIndex");
        var pageSize = this._get_data("pageSize");
        var currentStatus = this._get_data("currentStatus");
        var orderId = this._get_data("orderId");
        //取消订单
        this.operateEvent($$('#orderList').find(".cancel"),"click","closeOrder","取消订单");
        //确认收货
        this.operateEvent($$("#orderList").find(".confirm"),"click","batchConfirmTake","你确定要确认收货么？");
        //付款
        var payforClick = function(){
            var cOrderNo = $$(this).parent().attr("data-corderno");
            myApp.mainView.router.loadPage({
                url: './payment',
                query: {
                    cOrderNo: cOrderNo
                }
            });
        };
        //$$(document).off('click', $$('#orderList').find(".payfor") , payforClick)
        $$(document).on('click', $$('#orderList').find(".payfor") , payforClick)
        //搜索订单
        var searchBtnClick = function(){
            self.postData={
                pageSize:pageSize,
                pageIndex:pageIndex,
                status:currentStatus,
                searchOrderNo:self.util.trimStr($$("#searchOrderNo").val()),
            };
            if(self.proxyHasFinished)self.getOrderList();
        }
        //$$(document).off('click',$$("#searchBtn"), searchBtnClick)
        $$(document).on('click',$$("#searchBtn"), searchBtnClick)
        //无限滚动
        $$('#orderList-container').on('infinite', function (e) {
            if(!self.proxyHasFinished) return;
            var listLength = $$('#orderList').children('.list-wrap').length;
            if (listLength == parseInt(self.totalCount)) {
                myApp.detachInfiniteScroll($$('#orderList-container'));
                $$('#orderList-container .infinite-scroll-preloader').remove();
                return;
            };
            if(self.keyword){
                self.postData ={
                    keyword:self.keyword,
                    pageIndex: listLength / pageSize + 1,
                    pageSize: pageSize
                };
                self.service = "searchMemberSelfOrders";
            }else{
                self.postData = {
                    pageIndex: listLength / pageSize + 1,
                    pageSize: pageSize,
                    status: self._get_data("currentStatus"),
                    searchOrderNo: orderId
                }
                self.service = "getOrderList";
            }
            if(self.proxyHasFinished) self.getOrderList(true);
        });
        //下拉刷新
        $$('#orderList-container').on('refresh', function(e){
            if(self.keyword){
                self.postData ={
                    keyword:self.keyword,
                    pageIndex: pageIndex,
                    pageSize: pageSize
                };
                self.service = "searchMemberSelfOrders";
            }else{
                self.postData = {
                    pageIndex: pageIndex,
                    pageSize: pageSize,
                    status: self._get_data("currentStatus"),
                    searchOrderNo: orderId
                }
                self.service = "getOrderList";
            }
            var callback = function(){
                myApp.pullToRefreshDone();
            };
            if(self.proxyHasFinished)self.getOrderList( false, callback);
        });
        //再逛逛
        $$("#orderList .gohome").click(function () {
            myApp.showToolbar('.homeNavBar');
            $$('#homeView').trigger('show');
        });
    };
    view.prototype.operateEvent = function (lists, event, service, message){
        var self = this;
        var clickHandler = function(){
            if(self.operateEventStart) return;
            self.operateEventStart = true;
            self.orderListOperatePostData = {cOrderNo:$$(this).parent().attr("data-cOrderNo")}
            self.orderListOperate(service, message, $$(this));
        };
        lists.each(function(index){
            //$$(this)[0].removeEventListener(event, clickHandler);
            $$(this)[0].addEventListener(event, clickHandler);
        });
    };
    view.prototype.orderListOperate = function ( service, message, $$this){
        var self = this;
        if(!self.orderListOperatePostData)return;
        var okCallback = function(data){
            if(service == "batchConfirmTake") $$this.attr("disabled", true);
            if(service == "closeOrder") self.orderListOperatePostData.reason = data;
            self.proxy[service]( self.orderListOperatePostData, function(err, success){
                self.operateEventStart = false;
                if(err){
                    myApp.toast(err.message, "error").show(true);
                    console.log(err.message);
                    if(service == "batchConfirmTake") $$this.attr("disabled", false);
                    return;
                };
                myApp.toast("操作成功！","提示").show(true);
                setTimeout(function(){
                    self._set_data("currentStatus", "all");
                    if(self.keyword){
                        self.postData ={
                            keyword:self.keyword,
                            pageIndex: self._get_data("pageIndex"),
                            pageSize: self._get_data("pageSize")
                        };
                        self.service = "searchMemberSelfOrders";
                    }else{
                        self.postData = {
                            pageIndex: self._get_data("pageIndex"),
                            pageSize: self._get_data("pageSize"),
                            status: self._get_data("currentStatus"),
                            searchOrderNo: self._get_data("orderId")
                        }
                        self.service = "getOrderList";
                    }
                    if(self.proxyHasFinished) self.getOrderList();
                }, 1000 );
            });
        };
        var cancelCallback = function (){
            self.operateEventStart = false;
        };
        if(service == "closeOrder"){
            this.getCancelOrderReason(okCallback);
            myApp.popup('.popup-cancelreason');
        }else{
            myApp.confirm(message, "提示" , okCallback, cancelCallback);
        };
    };
    view.prototype.tabSwitch = function (nav, cont, event){
        var aNav = nav.children();
        var self = this;
        aNav.each(function (index){
            $$(this).on(event, function (){
                myApp.attachInfiniteScroll($$('#orderList-container'));
                aNav.removeClass('active');
                $$(this).addClass('active');
                var currentStatus = $$(this).attr('data-filter');
                self._set_data("currentStatus",currentStatus);
                self.keyword = "";
                if(self.keyword){
                    self.postData ={
                        keyword:self.keyword,
                        pageIndex: self._get_data("pageIndex"),
                        pageSize: self._get_data("pageSize")
                    };
                    self.service = "searchMemberSelfOrders";
                }else{
                    self.postData = {
                        pageIndex: self._get_data("pageIndex"),
                        pageSize: self._get_data("pageSize"),
                        status: currentStatus,
                        searchOrderNo: self._get_data("orderId")
                    }
                    self.service = "getOrderList";
                }
                if(self.proxyHasFinished) self.getOrderList();
            })
        })
    };
    view.prototype.util = {
        trimStr : function (str){return str.replace(/(^\s*)|(\s*$$)/g,"");},
        replaceBackslash : function (url){
            if(!url)return;
            var re = /\\/g;
            url = url.replace(re,'/');
            return url;
        }
    };
    view.prototype.dealWithImgPath = function(data){
        for (var i = 0; i < data.length; i++) {
            for(var j=0; j<data[i].oOrderDetails.length; j++){
                var imageUrl = data[i].oOrderDetails[j].DefaultImage;
                if(!imageUrl){
                    console.log("第"+i+"个订单的"+j+"商品没有图片");
                };
                data[i].oOrderDetails[j].ImgUrl = this.util.replaceBackslash(imageUrl)
            };
        };
        return data;
    };
    view.prototype.isShowSearchIcon = function (){
        var len = $$('#orderList').children('.list-wrap').length;
        if(len){
            $$('#btnSearchOrder').find('i').show();
        }else{
            $$('#btnSearchOrder').find('i').hide();
        };
    }
    view.prototype.init = function () {
        var queryString = this.getViewData().query;
        var orderId = queryString["orderId"];
        var currentStatus = queryString["status"] ? queryString["status"] :"all";
        var pageIndex = 1;
        var pageSize = 5;
        this.keyword = queryString["keyword"];
        this._set_data("closeOrderReason","你确认要取消订单吗？");
        this._set_data("pageIndex",pageIndex);
        this._set_data("pageSize",pageSize);
        this._set_data("currentStatus",currentStatus);
        this._set_data("orderId",orderId);
        this.service = "getOrderList";
        this.postData = {};
        if(this.keyword){
            this.postData ={
                keyword:this.keyword,
                pageIndex: pageIndex,
                pageSize: pageSize
            };
            this.service = "searchMemberSelfOrders";
        }else{
            this.postData = {
                pageIndex: pageIndex,
                pageSize: pageSize,
                status: currentStatus,
                searchOrderNo: orderId
            }
        }
        //this.isShowSearchIcon();
        this.getOrderList();
        this.tabSwitch($$("#tabSwitch"), $$("#orderList"), 'click');
    };
    return view;
});