cb.views.register('myStorageCardController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getDetail:{url:'member/StorageCard/getDetail',method:'get',options:{token:true, refresh:true}},
        cardDetail:{url:'member/StorageCard/cardDetail',method:'get',options:{token:true, refresh:true}},
        getStoreSetting:{url: 'client/StoreSettingController/getStoreSetting',method: 'POST',options: {token: true, refresh:true}}
    });
    view.prototype.getStoreSetting = function (){
        this.proxy.getStoreSetting({},function(err,success){
            if(err){
                console.log(err.message);
                return;
            }
            if(!success.storage_enableflag ){
                $("#goRecharge").addClass("disabled");
            }
        })
    }
    view.prototype.cardDetail = function(){
        this.proxy.cardDetail({},function(err,success){
            if(err){
                console.log("获取充值卡余额失败" + err.message);
                return;
            }
            if(success.length){
                var fBalance = success[0].fBalance ? Math.abs(success[0].fBalance.toFixed(2)) : 0;
                $("#storageBalance").text(fBalance);
            }
        })
    }
    view.prototype.getDetail = function(data){
        postData = {iType:this.currentStatus,pageIndex:1,pageSize:10};
        if(data){
            postData =$.extend(true, postData, data);
        }
        this.proxy.getDetail(postData,function(err,success){
            if(err){
                console.log("获取储值卡详情失败"+err);
                return;
            };
            this.dealWithStorageCard(success.models);
            this.dealWithPagenation(success)
        },this)
    }
    view.prototype.dealWithStorageCard = function(data){
        var html = "";
        if(!data){
            html = '<p style="position: relative;left: 50%;margin-top: 20px;">暂无数据</p>';
            $("#storageCardList").empty().append(html);
            return;
        };
        for(var i=0; i<data.length; i++){
            data[i].fSum = Math.abs(data[i].fSum);
            data[i].fBalance = Math.abs(data[i].fBalance);
        }
        html = this.render($("#storageCardTpl").html(),{data: data});
        $("#storageCardList").empty().append(html);
    }
    view.prototype.eventRegister = function (){
        var self = this;
        $("#storageCardNav li").click(function(){
            self.pagenationAfterSearch = false;
            self.currentStatus = $(this).attr("data-iType")
            self.getDetail();
        });
        $("#mainsearch").click(function(){
            self.pagenationAfterSearch = true;
            self.getDetail({dBegin: $("#timeStart").val()+" 00:00:00.000",dEnd: $("#timeEnd").val()+" 23:59:59.000"});
        })
    }
    view.prototype.dealWithPagenation = function(success) {
        var self = this;
        $("#pagenation").createPage({
            pageCount: Math.ceil(success.modelsCount / 10),
            current: 1,
            unbind: true,
            backFn: function(p) {
                var postData = self.pagenationAfterSearch ? {
                        iType:self.currentStatus,
                        pageSize: 10,
                        pageIndex: p,
                        dBegin: $("#timeStart").val()+" 00:00:00.000",
                        dEnd: $("#timeEnd").val()+" 00:00:00.000",
                        }:{
                            iType:self.currentStatus,
                            pageSize: 10,
                            pageIndex: p
                        };
                self.proxy.getDetail(postData, function(err, success) {
                    if (err) {
                        alert("获取储值卡详情失败" + err);
                        return;
                    } else {
                        self.dealWithStorageCard(success.models);
                    }
                }, this);
            }
        });
    }
    view.prototype.init = function () {
        this.currentStatus = "";
        this.pagenationAfterSearch = false;
        this.getStoreSetting();//是否启用去充值按钮
        this.cardDetail();//储值卡余额
        this.getDetail();//初始化，默认加载所有的信息
        this.eventRegister();
    };
    return view;
});