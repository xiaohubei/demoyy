cb.views.register('MyEvaluationController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        var orderId = queryString.get("orderId");
        var _this= this;
        var totalCount = 0;
        var pageIndex = 1;
        var pageSize = 5;
        var currentStatus='';
        var pagenationAfterSearch = false;
        var returnGoodData = {
            logisticCorpId:'',
            logisticsNo:'',
            detailId:'',
            orderNo:''
        };
        var closeOrderMsg = '你确认要取消订单吗？';
        var proxy = cb.rest.DynamicProxy.create({
            getOrderList:{url: 'client/orders/getUserOrders',method: 'POST',options: {token: true}},
            getOrdersNum:{url: 'client/Orders/getOrderStyleCount',method:'post',options:{token:true}},
            batchConfirmTake:{url:'client/Orders/batchConfirmTake',method:'POST',options:{token:true}},
            closeOrder:{url:'client/Orders/closeOrder',method:'POST',options:{token:true}},
            orderMemo:{url:'client/Orders/orderMemo',method:'POST',options:{token:true}},
            getLogisticsCorp:{url:'client/Orders/getLogisticsCorp',method:'POST',options:{token:true}},
            returnGoods:{url:'client/SaleReturns/returnGoods',method:'POST',options:{token:true}},
            getReasonContentList: {url:'client/OrderCancelReason/getReasonContentList',method: 'GET',options: { token: true }}
        });
        //获取订单列表
        var getOrderList = function (data){
            var postData = {pageSize:pageSize,pageIndex:pageIndex,status:currentStatus};
            postData = data ? $.extend(postData,data):postData;
            proxy.getOrderList( postData, function (err, result) {
               if (err) {
                    ModalTip({message:"获取我的订单失败" +err.message}, _this);
                    return;
                } else {
                    if(!currentStatus){
                        $("#allList").text(result.count);
                    }
                    dealWithOrderLists(result);
                    dealWithPagenation(result);
                }
            });
        }
        //各个状态数量获得
        proxy.getOrdersNum({pageIndex: pageIndex,pageSize: pageSize}, function(err,result){
            if(err){
                ModalTip({message:err.message},_this);
                return;
            }else{
                var statusList = result;
                for(var i =0;i<statusList.length;i++){
                    switch(statusList[i][0]){
                        case 'PAYMONEY':
                            $("#waitPayment").text(statusList[i][1]);
                            break;
                        case 'DELIVERGOODS':
                            $("#waitDeliver").text(statusList[i][1]);
                            break;
                        case 'TAKEDELIVERY':
                            $("#waitRecive").text(statusList[i][1]);
                            break;
                        case 'UNREMARK':
                            $("#endOrder").text(statusList[i][1]);
                            break;
                    }
                }
            }
        });

        //订单页面渲染
        var dealWithOrderLists = function(result){
            var txt =result.orders.length ?  $("#orderListTpl").html(): '<p class="noorder">暂无订单!</p>';
            var html =_this.render(txt, { orderList: result.orders});
            $("#orderList").empty().append(html);
            if(currentStatus){
                $("#tabSwitch").find('li[data-status='+currentStatus+']').find('span').eq(1).text(result.count);
            }
            eventRegister();
        };
        //获取取消订单原因
        var getCancelOrderReason = function(data){
            proxy.getReasonContentList({type:"orderclose"},function(error, result){
                if(error){
                    cosole.log(error.message);
                    return;
                };
                var s = '';
                for(var i=0; i<result.length; i++){
                    s+= '<option value="'+result[i].reason+'">'+result[i].reason+'</option>';
                };
                closeOrderMsg = '<div class="row" style="width:auto;"> \
                                <p class="col-lg-3" style="margin-top: 8px;font-size: 16px;">取消原因</p>\
                                <div class="col-lg-6">\
                                    <select id="closeOrderReason" class="form-control">\
                                        '+s+'\
                                    </select>\
                                </div>\
                            </div>';
            });

        }
        //事件注册全选功能
        var eventRegister = function (){
            //全选
            checkedAll();
            getCancelOrderReason();
            //取消订单
            operateEvent2($("#orderList").find(".closeOrder"),"click","closeOrder");
            //批量确认收货
            operateEvent($("#orderList").find(".confrimOrder"),"click","batchConfirmTake","你确定要确认收货么？");
            //请退货
            $(".returngood").click(function(e){
                //获得退货状态 SUBMITSALERETURN 待审批 CONFIRMSALERETURNORDER 退货中 ENDSALERETURN 已完成 OPPOSESALERETURN 已驳回
                returnGoodData.detailId = $(this).attr("data-detailid");
                returnGoodData.orderNo = $(this).attr("data-corderno");;
                proxy.getLogisticsCorp({}, function (error, result){
                    if(error){
                        ModalTip({message:error.message}, _this);
                        return;
                    }
                    returngood(result);
                })

            });
        }
        //全选功能实现
        var checkedAll = function (data){
            //初始化默认全选不选中
            $("#checkAll").prop('checked',false);
            //全选功能
            var isAllChecked = false;
            var lists =  $("#orderList").find(".checkItem");
            $("#checkAll").click(function(){
                isAllChecked = !isAllChecked;
                for(var i = 0; i<lists.length; i++){
                    lists[i].checked = isAllChecked;
                };
            });
            lists.click(function(){
                for(var i=0; i<lists.length; i++){
                    if(lists[i].checked == false){
                        isAllChecked = false;
                        $("#checkAll").prop('checked',false);
                        return;
                    }
                }
                $("#checkAll").prop('checked','checked');
            })
        }
        var closeModal = function (data){
            $('#myModal').modal('hide');
        }
        var dealWithImgPath = function(data){
            for (var i = 0; i < data.length; i++) {
                for(var j=0; j<data[i].oOrderDetails.length; j++){
                    var imageUrl = data[i].oOrderDetails[j].DefaultImage;
                    if(!imageUrl){
                        console.log("第"+i+"个订单的"+j+"商品没有图片");
                    };
                    data[i].oOrderDetails[j].ImgUrl = replaceBackslash(imageUrl)
                }
            }
            return data;
        }
        var operateEvent = function (lists,event,service,message){
            lists.each(function(index){
                $(this).on(event,function(index){
                    if($(this).css("cursor") == "not-allowed"){
                        ModalTip({message:"确认收货中请等待"},_this);
                        return;
                    }
                    orderListOperate({cOrderNo:$(this).attr("data-cOrderNo")},service,message,$(this));
                });
            });
        }
        var operateEvent2 = function (lists,event,service,message){
            lists.each(function(index){
                $(this).on(event,function(index){
                    message = message || closeOrderMsg;
                    orderListOperate({cOrderNo:$(this).attr("data-cOrderNo")},service,message);
                });
            });
        }
        var replaceBackslash = function (url){
            if(!url)return;
            var re = /\\/g;
            url = url.replace(re,'/');
            return url;
        }
        var orderListOperate = function (postData, service, message,self){
            if(!postData)return;
            var callback = function(){
                if(service == "batchConfirmTake"){
                    $(self).css("cursor", "not-allowed");
                    $(self).children().css("cursor", "not-allowed");
                }
                postData.reason = $("#closeOrderReason option:selected").text();
                proxy[service](postData,function(error, success){
                    if(error){
                        ModalTip({message:"操作失败！" + error.message}, _this);
                        if(service == "batchConfirmTake"){
                            $this.css("cursor", "pointer");
                            $this.children().css("cursor", "pointer");
                        }
                        return;
                    };
                    var successcallBack = function(data){
                        window.location.href = window.location.href;
                    }
                    ModalTip({message:"操作成功！！", cb:successcallBack},_this);
                });
            }
            ModalTip({message:message,confirm:true, okCallback:callback},_this);
        }
        $("#batchConfirm").click(function(){
            batchConfirmOrder(this)
        });
        var batchConfirmOrder = function (self){
            var data = $("#orderList").find(".checkItem");
            var data = collectCheckedOrder(data);
            if(!data.length){
                ModalTip({message:"请至少选择一条数据"},_this);
                return;
            };
            if(!isTakeDelivery(data)){
                ModalTip({message:"你选中的商品中有的商品不能确认收货，请重新选择！"},_this);
                return;
            };
            var postData = {cOrderNo: collectCheckedId(data) };
            if($(self).css("cursor") == "not-allowed") return;
            orderListOperate(postData,"batchConfirmTake","你确定要批量确认收货么？",self)
        }
        //合并付款
        $("#batchPayment").click(function(){
            batchPaymentOrder(this)
        });
        //批量付款
        var batchPaymentOrder = function (){
            var data = $("#orderList").find(".checkItem");
            var postData = collectCheckedOrder(data);
            if(!postData.length){
                ModalTip({message:"请至少选择一条数据"},_this)
                return;
            }
            ModalTip({message:"功能开发中..."},_this)
        }
        //收集选中的订单
        var collectCheckedOrder = function(data){
            if(!data)return;
            var postData = [];
            for(var i=0; i<data.length; i++){
                if(data[i].checked){
                    postData.push(data[i])
                }
            };
            return postData;
        };
        //收集选中订单的Id
        var collectCheckedId = function(data){
            var postDataId=[];
            for(var i = 0; i<data.length; i++){
                postDataId.push($(data[i]).attr("data-cOrderNo"))
            }
            return postDataId;
        };
        //选中的是否都是确认收货状态
        var isTakeDelivery = function (data){
            if(!data)return;
            var cango = true;
            for(var i = 0 ;i<data.length; i++){
                if($(data[i]).attr("data-status") !="TAKEDELIVERY"){
                    cango = false;
                    break;
                }
            }
            return cango;
        }
        //菜单切换功能实现
        var TabSwitch = function (nav, cont, event){
            var aNav = nav.children();
            aNav.each(function (index){
                $(this).on(event, function (){
                    pagenationAfterSearch = false;
                    aNav.removeClass('tabactive');
                    $(this).addClass('tabactive');
                    currentStatus = $(this).attr('data-status');
                    getOrderList();
                })
            })
        };
        //去掉收尾空格
        var trimStr =function (str){return str.replace(/(^\s*)|(\s*$)/g,"");}
        //查询功能
        $("#ordersearch").click(function(){
            pagenationAfterSearch = true;
            var data={
                searchOrderNo:trimStr($("#searchOrderNum").val()),
                product:trimStr($("#productname").val()),
                startDate:trimStr($("#startDate").val()),
                endDate:trimStr($("#endDate").val()),
                searchReceiver:trimStr($("#receiver").val()),
            };
            getOrderList(data);
        })
        //分页处理
        var dealWithPagenation = function (result){
            $("#pagenation").createPage({
                pageCount:Math.ceil(result.count/pageSize),
                current:1,
                unbind:true,
                backFn:function (p){
                    var postData= pagenationAfterSearch ?{
                            pageSize:pageSize,
                            pageIndex:p,
                            status:currentStatus,
                            searchOrderNo:trimStr($("#searchOrderNum").val()),
                            product:trimStr($("#productname").val()),
                            startDate:trimStr($("#startDate").val()),
                            endDate:trimStr($("#endDate").val()),
                            searchReceiver:trimStr($("#receiver").val()),
                        }:{
                            pageSize:pageSize,
                            pageIndex:p,
                            status:currentStatus,
                        };
                    proxy.getOrderList(postData,function (error, result){
                        if(error){
                            ModalTip({message:error},_this)
                            return;
                        };
                        if(result){
                            totalOrders = result.count;
                            $("#allorderlist").text(totalOrders);//更新全部订单总数
                            $("#orderlist").html(dealWithOrderLists(result));//加载全部订单显示
                        }
                    });
                }
            });
        }
        //请退货
        var returngood = function (data){
            var exprsstxt = '';
            for(var i=0; i<data.length; i++){
                exprsstxt +='<option data-id="'+data[i].id+'">'+data[i].name+'</option>';
            }
            var txt = '<form class="form-horizontal">'
                    +'<div class=" form-group col-md-12">'
                        +'<label class="col-sm-3 control-label" for="expresscompany">物流公司</label>'
                        +'<div class="col-sm-9 p-0">'
                          +'<select type="text" class="form-control" id="expresscompany">'
                          +exprsstxt
                          +'<select>'
                        +'</div>'
                    +'</div>'
                    +'<div class=" form-group col-md-12">'
                        +'<label class="col-sm-3  control-label" for="expressnum">快递单号</label>'
                        +'<div class="col-sm-9 p-0">'
                          +'<input type="number" class="form-control" id="expressnum" placeholder="请输入快递单号">'
                        +'</div>'
                    +'</div>'
                +'</form>';
            var callback = function (){
                returnGoodData.logisticCorpId = $("#expresscompany").find("option:selected").attr("data-id");;
                returnGoodData.logisticsNo = $("#expressnum").val();
                if(!returnGoodData.logisticCorpId  || !returnGoodData.logisticsNo){
                    ModalTip({message:'请输入快递公司或者快递单号'},_this);
                    return;
                };
                proxy.returnGoods(returnGoodData, function (error, result){
                    if(error){
                        ModalTip({message:error.message}, _this);
                        return;
                    };
                    ModalTip({message:"操作成功,请等待卖家确认!",cb:function(){
                        window.location.href = window.location.href;
                    }}, _this);
                });

            }
            ModalTip({message:txt, title:'请退货',okCallback:callback}, _this);
        };
        //初始化
        getOrderList({searchOrderNo:orderId});
        TabSwitch($("#tabSwitch"),$("#orderList"),'click');
    };
    return view;
});