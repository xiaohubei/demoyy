cb.views.register('ReturnDetailViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    // 是否评价
    var returnEvaluation = false;
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        var cSaleReturnNum = queryString.get("cSaleReturnNo");
        var iDetailId = queryString.get("iDetailId");
        var _this = this;
        var postData,postUrl;
        //根据url的参数判断要发的请求
        if(cSaleReturnNum){
            postData = { cSaleReturnNo: cSaleReturnNum }
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
            feedback: { url: 'client/SaleReturns/feedback', method: 'POST', options: { token: true } }
        });

        proxy.getSaleReturnBySaleReturnNo(postData, function (err, result) {
            if (err) {
                alert(err.message);
            } else {
                var data = result.oSaleReturnDetails[0];
                iDetailId = data.iDetailId;
                data.cOpposeMemo = result.cOpposeMemo; //驳回理由
				data.cRemark=result.oSaleReturnMemo.cRemark;//备注
                data.returnStatus = result.cSaleReturnStatus; //退货状态
                // 获得退货状态
                cSaleReturnNum = result.cSaleReturnNo;
                data.returnType = result.iReturnType ? "退货退款": "退款";
                proxy.lookExpress({ iLogisticId:data.iDeliveryCorpId,"cLogisticsNo":data.cLogisticsNo}, function (err, result) {
                    var txt = err? err.message : "";
                    if(result){

                        var txt = result.data ? _this.render($('#expressinfoTpl').html(), {data:result.data}) : result.message;
                    }
                    setTimeout(function(){
                        $("#expressinfoDetail").empty().append(txt);
                    },300);
                });
                var html = this.render($('#returnDetailsTpl').html(), { value: data , returnStep:result.oSaleReturnStatuses});
                $("#returnDetail").empty().append(html);
                //状态进度条调整
                statusChange(result);
                //事件注册
                eventRegister(result);
                var returnStatus = result.cSaleReturnStatus;
                $("#returnEvaluationBtn span").click(function(){
                    if (returnStatus != "ENDSALERETURN" || result.iFeedBack != '-1') {
                        return;
                    }
                    if (returnEvaluation) {
                        alert("已经评价过了");
                        return
                    }
                    proxy.feedback({ cSaleReturnNo: cSaleReturnNum, ifeedback: parseFloat($(this).attr("data-ifeedback"))}, function (err, result) {
                        if (err) {
                            alert(err.message);
                        } else {
                            returnEvaluation = true;
                            alert("评价完成");
                        }

                    });
                });
            }

        }, this);

        var statusChange = function (result){
            var returnStatus = result.cSaleReturnStatus;
            $('#returnStep1').addClass("done");
            if(returnStatus != "ENDSALERETURN"){
                if (returnStatus == "CONFIRMSALERETURNORDER") {
                    $('#returnStep2').addClass("done");
                } else if (returnStatus == "OPPOSESALERETURN") {
                    //已驳回
                    $("#returnStep2").find(".s-text").text("已驳回");
                    $('#returnStep2').addClass("done");
                } else if (returnStatus == "BUYERRETURN") {
                    //退款中
                    $('#returnStep2').addClass("done");
                    $('#returnStep3').addClass("done");
                } else if (returnStatus == "SALERETURNING") {
                    //退货中
                    $('#returnStep2').addClass("done");
                }
            }else{
                //已经完成
                if (result.iFeedBack == '-1') {
                    $('.satisfactionBtn').removeClass("satisfactionBtnChange");
                    $('.noNatisfactionBtn').removeClass("satisfactionBtnChange");
                }
                $("#returnLastText").empty().append("完成");
                $('#returnStep2').addClass("done");
                $('#returnStep3').addClass("done");
                $('#returnStep4').addClass("done");
                $('#returnStep5').addClass("done");
            }
        }

        var eventRegister = function (result){
        	$("#postRemark").click(function(e){
                var orderRemark = $.trim($("#orderRemark").val());
                if(!orderRemark){
                    alert("请输入备注信息后再提交！");
                    return;
                }
                if(orderRemark.length > 255 ){
                    alert("字数太多了,请少于255字");
                    return;
                }
        		proxy.submit({ cRemark: orderRemark,cSaleReturnNo: cSaleReturnNum},function(err, suc){
                    if(err){
                        console.log("提交备注失败 "+err.message);
                        return;
                    }
                    alert("提交备注成功！");
                    window.location.href = "changing_or_returning";
                })
        	});
        }


    };
    return view;
});