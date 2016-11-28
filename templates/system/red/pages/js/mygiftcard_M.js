cb.views.register('myGiftCardController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getMemberGiftCardsList :{url:'giftcard/ClientServer/getMemberGiftCardsList',method:'POST',options:{token:true, mask: true}},
        getCountGiftCard :{url:'giftcard/ClientServer/getCountGiftCard',method:'POST',options:{token:true, mask: true}},
        getStoreSetting:{url: 'client/StoreSettingController/getStoreSetting',method: 'POST',options: {token: true, mask: true}}
    });
    view.prototype.isShowRechargeBtn = function(){
        this.proxy.getStoreSetting({},function(err,success){
            if(err){
                myApp.toast(err.message, "error").show(true);
                return;
            }
            if(!success.storage_enableflag ){
                $$("#cardList .btn-giftcardPay").addClass("disabled");
            }
        },this)
    };
    view.prototype.showGiftcardCount = function(){
        this.proxy.getCountGiftCard({},function(err,suc){
            if(err){
                myApp.toast(err.message, "error").show(true);
                return;
            }
            $$("#tabSwitch span").eq(0).text(suc[0]);
            $$("#tabSwitch span").eq(1).text(suc[1]);
            $$("#tabSwitch span").eq(2).text(suc[2]);
            $$("#tabSwitch span").eq(3).text(suc[9]);
        },this);
    };
    view.prototype.getMemberGiftCardsList = function(data, isAppend, callback){
        //排序 : 0(asc),1(desc)
        var postData = data || {
            status:this._get_data("currentStatus"),
            pageIndex:this._get_data("pageIndex"),
            pageSize:this._get_data("pageSize"),
            orderBy:'createDate',
            sequence:1
        };
        this.proxy.getMemberGiftCardsList({param:postData},function(err,suc){
            if(err){
                myApp.toast(err.message, "error").show(true);
                $$("#cardList").html('<p style="text-align:center;">获取储值卡详情失败!</p>');
                return;
            }
            this.totalCount = suc.count;
            this.dealWithGiftCard(suc.MemberGiftCards, isAppend, callback);
        },this)
    };
    view.prototype.dealWithGiftCard = function(data, isAppend, callback){
        var self = this;
        var currentStatus = this._get_data("currentStatus");
        for(var i=0; i<data.length; i++){
            data[i].cFolder = this.util.replaceBackslash(data[i].cFolder);
            data[i].expireEndDate = this.util.formatDate(data[i].expireEndDate);
            data[i].type = currentStatus;
        };
        if(currentStatus == 0){
            var renderHtml = $$("#cardListTpl1").html();
        }else{
            var renderHtml = $$("#cardListTpl4").html();
        }
        //debugger;
        var html = self.render(renderHtml,{data:data,type:currentStatus});
        if(!isAppend) {
            $$("#cardList").html(html);
        }else{
            $$("#cardList").append(html);
        }
        self.proxyHasFinished = true;
        if(callback)callback();
        self.isShowRechargeBtn();
    };
    view.prototype.infiniteScroll = function(){
        if(!this.proxyHasFinished) return;
        this.proxyHasFinished = false;
        var pageSize = this._get_data("pageSize");
        var listLength = $$('#cardList').children('li').length;
        if (listLength == parseInt(this.totalCount)) {
            myApp.detachInfiniteScroll( $$('#mygiftcardContanier'));
            return;
        };
        var params = {
            pageSize: pageSize,
            pageIndex: listLength / pageSize + 1,
            status:this._get_data("currentStatus")
        };
        this.getMemberGiftCardsList(params,true);
    };
    view.prototype.eventRegister = function(){
        var self = this;
        var pageSize = this._get_data("pageSize");
        var pageIndex = this._get_data("pageIndex");
        var currentStatus = this._get_data("currentStatus");
        this._set_data("pageSize",pageSize);
        this._set_data("pageIndex",pageIndex);
        this._set_data("orderByData","createDate");
        $$("#tabSwitch a").click(function(){
            $$("#tabSwitch a").removeClass("active");
            $$(this).addClass("active");
            self._set_data("orderByData","createDate");
            myApp.attachInfiniteScroll( $$('#mygiftcardContanier'));
            self._set_data("currentStatus",$$(this).attr("data-type"));
            self.getMemberGiftCardsList();
        });
        $$('#mygiftcardContanier').on('infinite', function (e) {
            self.infiniteScroll();
        });
        $$("#mygiftcardContanier").on('refresh', function(e){
            myApp.attachInfiniteScroll( $$('#mygiftcardContanier'));
            var postData = {
                status:self._get_data("currentStatus"),
                pageIndex:pageIndex,
                pageSize:pageSize,
                sequence:1,
                orderBy:self._get_data("orderByData")
            };
            var callback = function(){
                myApp.pullToRefreshDone();
            };
            self.getMemberGiftCardsList( postData, false, callback );
        });
    };
    view.prototype.init = function () {
        var self = this;
        this._set_data("currentStatus", "0");
        this._set_data("pageSize",5);
        this._set_data("pageIndex",1);
        this.showGiftcardCount();
        this.getMemberGiftCardsList();
        this.eventRegister();
    };
    view.prototype.afterFromPageBack = function(data){
        if (data.fromPage.name  !== 'goRecharge') return;
        if(data.query.refreshPage)
            this.getMemberGiftCardsList();
    };
    view.prototype.util = {
        trimStr: function (str){return str.replace(/(^\s*)|(\s*$)/g,"");},
        replaceBackslash: function (url){
            if(!url)return;
            var re = /\\/g;
            url = url.replace(re,'/');
            return url;
        },
        formatDate : function (strDate, fmt) {
            if (!strDate) return strDate;
            if (!fmt) fmt = 'yyyy-MM-dd';
            strDate = strDate.split(" ");
            strDate = strDate[0].replace(/-/g, '/');
            var date = new Date(strDate);
            var o = {
                "M+": date.getMonth() + 1,
                "d+": date.getDate(),
                "h+": date.getHours(),
                "m+": date.getMinutes(),
                "s+": date.getSeconds(),
                "q+": Math.floor((date.getMonth() + 3) / 3),
                "S": date.getMilliseconds()
            };
            if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (var k in o)
                if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            return fmt;
        }
    };
    return view;
});