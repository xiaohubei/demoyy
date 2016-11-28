cb.views.register('returnDetailController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var queryString = this.getQuery();
        var cSaleReturnNo = queryString["cSaleReturnNo"];
        var iDetailId = queryString["iDetailId"];
        var view = this.getView();
        var self = this;
        var postData,postUrl;
        this.returnEvaluation = false;
        //根据url的参数判断要发的请求
        if(cSaleReturnNo){
            postData = { cSaleReturnNo: cSaleReturnNo }
            postUrl = 'client/SaleReturns/getSaleReturnBySaleReturnNo'
        }else{
            postData = { iDetailId: iDetailId }
            postUrl = 'client/SaleReturns/getSaleReturnByDetailId'
        }
        var proxy = cb.rest.DynamicProxy.create({
            getSaleReturnBySaleReturnNo: { url:postUrl , method: 'POST', options: { token: true } },
            lookExpress: { url: 'client/Orders/lookExpressByLog', method: 'POST', options: { token: true } },
            getLogisticInfo: { url: 'client/Orders/getLogisticInfo', method: 'POST', options: { token: true } },
            submit: { url: 'client/SaleReturns/returnMemo', method: 'POST', options: { token: true } },
            returnGoods: { url: 'client/SaleReturns/returnGoods', method: 'POST', options: { token: true } },
            getLogisticsCorp: { url: 'client/Orders/getLogisticsCorp', method: 'POST', options: { token: true } },
            feedback: { url: 'client/SaleReturns/feedback', method: 'POST', options: { token: true } }
        });
        this.proxy = proxy;
        proxy.getSaleReturnBySaleReturnNo(postData, function (err, result) {
            if (err) {
                myApp.toast(err.message, '提示').show(true);
            } else {
                var data = result.oSaleReturnDetails[0];
                iDetailId = data.iDetailId;
                data.cOpposeMemo = result.cOpposeMemo || false; //驳回理由
                data.cRemark=result.oSaleReturnMemo.cRemark;//备注
                data.cSaleReturnStatus = result.cSaleReturnStatus; //退货状态
                data.imgUrl = data.oProductAlbum.imgUrl; //退货状态
                data.cStatusName = result.cStatusName;
                cSaleReturnNo = result.cSaleReturnNo;
                data.returnType = result.iReturnType ? "退货退款": "退款";
                proxy.lookExpress({ iLogisticId:data.iDeliveryCorpId,"cLogisticsNo":data.cLogisticsNo}, function (err, result) {
                    var txt = err? err.message : "";
                    if(result){

                        var txt = result.data ? self.render($$('#expressinfoTpl').html(), {data:result.data}) : result.message;
                    }
                    setTimeout(function(){
                        $$("#expressinfoDetail").html("").append(txt);
                    },300);
                });
                var html = this.render($$('#returnDetailTpl').html(), data );
                $$("#returndetail").html("").append(html);
                this.eventRegister(result);
                //已经完成订单显示评价按钮
                if (result.cSaleReturnStatus == "ENDSALERETURN" ) {
                    $$('#return-satisfaction').removeClass("hide");
                }
            }

        }, this);
    };
    view.prototype.eventRegister = function (result){
        var self = this;
        var returnGoodData = {};
        $$("#returndetail-postRemark .btn").click(function(e){
            var orderRemark = self.trimStr($$("#returndetail-postRemark  textarea").val());
            if(!orderRemark){
                myApp.toast("请输入备注信息后再提交！", '提示').show(true);
                return;
            }
            if(orderRemark.length > 255 ){
                myApp.toast("字数太多了,请少于255字", '提示').show(true);
                return;
            }
            self.proxy.submit({ cRemark: orderRemark, cSaleReturnNo: result.cSaleReturnNo},function(err, suc){
                if(err){
                    myApp.toast("提交备注失败 "+err.message, '提示').show(true);
                    return;
                }
                myApp.toast("提交备注成功！ ", '提示').show(true);
            })
        });
        $$("#return-satisfaction a").click(function(){
            if (result.cSaleReturnStatus == "ENDSALERETURN" && result.iFeedBack != '-1') {
                myApp.toast('已经评价过了','提示').show(true);
                return;
            }
            if (self.returnEvaluation) {
                myApp.toast('已经评价过了','提示').show(true);
                return
            }
            self.proxy.feedback({ cSaleReturnNo: result.cSaleReturnNo, ifeedback: parseFloat($$(this).attr("data-ifeedback"))}, function (err, result) {
                if (err) {
                    myApp.toast(err.message, '提示').show(true);
                } else {
                    self.returnEvaluation = true;
                    myApp.toast("评价完成 ", '提示').show(true);
                }

            });
        });
        //请退货
        this.getView().find(".returngood").click(function (e) {
            //获得退货状态 SUBMITSALERETURN 待审批 CONFIRMSALERETURNORDER 退货中 ENDSALERETURN 已完成 OPPOSESALERETURN 已驳回
            returnGoodData.detailId = $$(this).attr("data-detailid");
            returnGoodData.orderNo = $$(this).attr("data-corderno");
            self.proxy.getLogisticsCorp({}, function (err, result) {
                if (err) {
                    myApp.toast(err.message, '提示').show(true);
                    return;
                };
                self._set_data("logisticsCorp", result);
                self.returngood(result, returnGoodData);
            });
        });
    };
    view.prototype.returngood = function (data, returnGoodData) {
        var self = this;
        var exprsstxt = '';
        for (var i = 0; i < data.length; i++) {
            exprsstxt += '<option data-id="' + data[i].id + '">' + data[i].name + '</option>';
        }
        var txt = '<div class="returngood-popup">'
                    +'<div class="list-block">'
                    + '<div class="item-content ">'
                        + '<div class="item-inner ">'
                            + '<div class="item-title label" for="expresscompany">物流公司</div>'
                            + '<div class="item-input">'
                              + '<select type="text" class="form-control" id="expresscompany">'
                              + exprsstxt
                              + '<select>'
                            + '</div>'
                        + '</div>'
                    + '</div>'
                    + '</div>'
                    + '<div class="list-block ">'
                    + '<div class="item-content ">'
                        + '<div class="item-inner ">'
                            + '<label class="item-title label" for="expressnum">快递单号</label>'
                            + '<div class="item-input">'
                              + '<input type="number" class="form-control" id="expressnum" placeholder="请输入快递单号">'
                            + '</div>'
                        + '</div>'
                    + '</div>'
                    + '</div>'
                + '</div>';
        var callback = function () {
            var findLogisticCorpId = function (name) {
                var logisticsCorp = self._get_data("logisticsCorp");
                for (var i = 0; i < logisticsCorp.length; i++) {
                    if (logisticsCorp[i].name == name) {
                        return logisticsCorp[i].id;
                    }
                }
            }
            returnGoodData.logisticCorpId = findLogisticCorpId($$("#expresscompany").val());
            returnGoodData.logisticsNo = $$("#expressnum").val();
            if (!returnGoodData.logisticCorpId || !returnGoodData.logisticsNo) {
                myApp.toast("请输入快递公司或者快递单号 ", '提示').show(true);
                return;
            };
            self.proxy.returnGoods(returnGoodData, function (err, result) {
                if (err) {
                    myApp.toast(err.message, '提示').show(true);
                    return;
                };
                myApp.toast("操作成功,请等待卖家确认! ", '提示').show(true);
                setTimeout(function () {
                    myApp.mainView.router.back({query:{currentStatus:"SALERETURNING"}});
                }, 1000);
            });
        };
        myApp.confirm(txt, "提示", callback);
    };
    view.prototype.trimStr = function (str){
        return str.replace(/(^\s*)|(\s*$$)/g,"");
    };
    return view;
});