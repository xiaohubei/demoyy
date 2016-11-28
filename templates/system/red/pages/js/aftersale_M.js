cb.views.register('aftersaleViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getSaleReturnList: {url: 'client/SaleReturns/getSaleReturnList', method: 'POST', options: {token:true,mask:true }}
    });
    view.prototype.getSaleReturnList = function(data,isPullRefresh,cb){
        var currentStatus = this._get_data("currentStatus");
        var thisView = this.getView();
        if(currentStatus){
            thisView.find('.myOrderTabNav').find("a").removeClass("active");
            thisView.find('.myOrderTabNav').find('a[data-filter='+currentStatus+']').addClass("active");
        }
        this.proxyHasFinished = false;
        var postData = {
            pageIndex: 1,
            pageSize: this._get_data("pageSize"),
            status: currentStatus
        };
        postData = data || postData;
        this.proxy.getSaleReturnList(postData, function (err, result) {
            $$('#returnList-container .infinite-scroll-preloader').remove();
            if (err) {
                myApp.alert("获取退货列表失败" + err.message, "提示");
                return;
            } else {
                if(result.list.length < this._get_data("pageSize")){
                    myApp.detachInfiniteScroll($$('#returnList-container'));
                    $$('#returnList-container .infinite-scroll-preloader').remove();
                }
                this.totalCount = result.count;
                this.dealWithList(result,isPullRefresh,cb);
            }
        },this);
    };
    view.prototype.dealWithList=function(result,isPullRefresh,cb){
        $$('#returnList-container .infinite-scroll-preloader').remove();
        if(cb)cb();
        var lists = result.list;
        if(!isPullRefresh)$$("#returningList").html("");
        var html = this.render($$("#returningListTpl").html(),{returnList:lists});
        $$("#returningList").html(html);
        this.proxyHasFinished = true;
        this.eventRegister();
    };
    view.prototype.TabSwitch = function (nav, cont, event){
        var self = this;
        var aNav = nav.children();
        aNav.each(function (index){
            $$(this).on(event, function (){
                myApp.attachInfiniteScroll($$('#returnList-container'));
                aNav.removeClass('active');
                $$(this).addClass('active');
                self._set_data("currentStatus", $$(this).attr('data-filter'));
                if(self.proxyHasFinished)self.getSaleReturnList();
            })
        })
    };
    view.prototype.eventRegister = function (){
        var self = this;
        var pageSize = self._get_data("pageSize");
        //无限滚动
        $$('#returnList-container').on('infinite', function (e) {
            if(!self.proxyHasFinished) return;
            self.proxyHasFinished = false;
            var listLength = $$('#returningList').children('.list-wrap').length;
            if (listLength == parseInt(self.totalCount)) {
                myApp.detachInfiniteScroll($$('#returnList-container'));
                return;
            };
            params = {
                pageSize: pageSize,
                pageIndex: listLength / pageSize + 1,
                status:self._get_data("currentStatus")
            };
            self.getSaleReturnList(params,true);
        });

        //下拉刷新
        $$('#returnList-container').on('refresh', function(e){
            var postData = {
                pageIndex: 1,
                pageSize: pageSize,
                status:self._get_data("currentStatus")
            };
            var callback = function(){
                myApp.pullToRefreshDone();
            };
            if(self.proxyHasFinished)self.getSaleReturnList(postData,false,callback);
        });
        //再逛逛
        $$("#returningList .gohome").click(function () {
            myApp.showToolbar('.homeNavBar');
            $$('#homeView').trigger('show');
        });
    };
    view.prototype.init = function () {
        var currentStatus = this._get_data("currentStatus");
        this._set_data("currentStatus", currentStatus);
        this._set_data("pageSize", "10");
        this.getSaleReturnList();
        this.TabSwitch($$("#tabSwitch"),$$("#returningList"),'click');
    };
    view.prototype.afterFromPageBack = function(data){
        if (data.fromPage.name !== 'returndetail') return;
        var currentStatus = data.query.currentStatus;
        if(currentStatus){
            this._set_data("currentStatus", currentStatus);
            this.getSaleReturnList();
        };
    };
    return view;
});