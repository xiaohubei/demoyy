cb.views.register('myStorageCardController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getDetail: { url: 'member/StorageCard/getDetail', method: 'get', options: { token: true ,mask:true} },
        cardDetail: { url: 'member/StorageCard/cardDetail', method: 'get', options: { token: true } },
        getStoreSetting: { url: 'client/StoreSettingController/getStoreSetting', method: 'POST', options: { token: true } }
    });
    view.prototype.isShowRehargeBtn = function () {
        this.proxy.getStoreSetting({}, function (err, success) {
            if (err) {
                myApp.toast(err.message,'error').show(true);
                return;
            }
            if (!success.storage_enableflag) {
                $$("#goRecharge").addClass("disabled");
            }
        });
    };
    view.prototype.showStorageBalance = function () {
        this.proxy.cardDetail({}, function (err, success) {
            if (err) {
                myApp.toast('获取充值卡余额失败', 'error').show(true);
                return;
            }
            if (success.length) {
                $$("#storageBalance").text(Math.abs(success[0].fBalance ? success[0].fBalance.toFixed(2) : 0.00));
            }
        });
    };
    view.prototype.getDetail = function (data, isAppend) {
        postData = data
                 ? data
                 : {
                     iType: this._get_data("currentStatus"),
                     pageIndex: this._get_data("pageIndex"),
                     pageSize: this._get_data("pageSize")
                 };
        this.proxyHasFinished = false;
        this.proxy.getDetail(postData, function (err, success) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            };
            success.models = success.models || [];
            if(success.models.length < this._get_data("pageSize")){
                myApp.detachInfiniteScroll(this.getView().find('.infinite-scroll'));
            }
            this.totalCount = success.modelsCount;
            this.dealWithStorageCard(success, isAppend);
        }, this);
    };
    view.prototype.dealWithStorageCard = function (data, isAppend) {
        var txt = data.models.length ? $$("#storageDetailTpl").html() : '<p class="noorder">暂无相关数据!</p>';
        if (!data.models.length) {
            if (this._get_data("currentStatus") == "1")
                txt = '<p class="noorder">暂无充值数据!</p>';
            else if (this._get_data("currentStatus") == "2")
                txt = '<p class="noorder">暂无消费数据!</p>';
            else if (this._get_data("currentStatus") == "0")
                txt = '<p class="noorder">暂无充值/消费数据!</p>';
        }
        data.models.isRecharge = this._get_data("currentStatus") == "1" ? true : false;
        var html = this.render(txt, { data: data.models, isRecharge:data.models.isRecharge });
        if (!isAppend) {
            $$("#detailList").html("");
        };
        if (data.length == 0 && $$("#detailList").html() != "") {
        } else {
            $$("#detailList").append(html);
        };
        this.proxyHasFinished = true;
    };
    view.prototype.eventRegister = function () {
        var self = this;
        $$("#storagelist-tabselct .tabselct").click(function () {
            $$(this).parent().children('.tabselct').removeClass('active');
            $$(this).addClass('active');
            //重新监听无限滚动事件
            myApp.attachInfiniteScroll(self.getView().find('.infinite-scroll'));
            self._set_data("currentStatus", $$(this).attr("data-iType"));
            if(self.proxyHasFinished) self.getDetail(null, false);
        });
        this.getView().find('.infinite-scroll').on('infinite', function (e) {
            if(!self.proxyHasFinished) return;
            var currentStatus = self._get_data("currentStatus");
            var pageSize = self._get_data("pageSize");
            var listLength = $$('#detailList').children('li').length;
            if (listLength == parseInt(self.totalCount)) {
                myApp.detachInfiniteScroll(self.getView().find('.infinite-scroll'));
                return;
            };
            params = {
                iType: currentStatus,
                pageSize: pageSize,
                pageIndex: Math.ceil(listLength / pageSize) + 1,
                status: currentStatus
            };
            if(self.proxyHasFinished) self.getDetail(params, true);
        });
        this.getView().find(".allDetail").click(function(e){
            self._set_data("currentStatus", "0");
            self.getDetail();
        })
    };

    view.prototype.init = function () {
        var self = this;
        this._set_data("currentStatus", "0");
        this._set_data("pageSize", "7");
        this._set_data("pageIndex", "1");
        this.isShowRehargeBtn();
        this.showStorageBalance();
        this.getDetail();
        this.eventRegister();
    };
    view.prototype.afterFromPageBack = function(data){
        //if (data.fromPage.name  !== 'goRecharge') return;
        this._set_data("currentStatus", "0");
        this.isShowRehargeBtn();
        this.showStorageBalance();
        this.getDetail();
    };
    return view;
});