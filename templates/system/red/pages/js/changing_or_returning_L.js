cb.views.register('ChangingOrReturningViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
	
    var returnPageIndex = 1;
    var totalPage = 1;
    var returnStatus = "";
    view.prototype.init = function () {
        // 加载我的收藏信息
        this.getSaleReturnLists(returnPageIndex, returnStatus, "", "", "", "", function () {
            var _this = this;
            //tab页签切换
            $("#tabSwitch li").each(function(index){
                $(this).click(function(e){
                    debugger;
                    $("#tabSwitch li").removeClass("tabactive");
                    $(this).addClass("tabactive");
                    returnPageIndex = 1;
                    returnStatus = $(this).attr("data-status");
                    _this.getSaleReturnLists(returnPageIndex, returnStatus, "", "", "", "");
                })
            });
            // 查找
            $("#fat-btn").on('click', this, function (e) {
                returnPageIndex = 1;
                e.data.getSaleReturnLists(returnPageIndex, returnStatus, $("#orderNo").val(), $('#returnPrice').val(), $('#startTimes').val(), $('#endTimes').val());
            });

            // 上一页
            $("#prePage").on('click', this, function (e) {
                if (returnPageIndex == 1) {
                    alert("当前是第一页");
                    return;
                }
                returnPageIndex--;
                e.data.getSaleReturnLists(returnPageIndex, returnStatus, "", "", "", "");
            });
            // 下一页
            $("#nextPage").on('click', this, function (e) {
                if (returnPageIndex > totalPage || returnPageIndex == totalPage) {
                    alert("当前是最后一页");
                    return;
                } else {
                    returnPageIndex++;
                    e.data.getSaleReturnLists(returnPageIndex, returnStatus, "", "", "", "");
                }
            });

        }, this);

    };
    // 获取退货列表共用方法
    view.prototype.getSaleReturnLists = function (returnPageIndex, status, searchOrderNo, searchSaleReturnNo, startTime, endTime, callback) {
		var _this= this;
        var proxy = cb.rest.DynamicProxy.create({
            getSaleReturnList: { url: 'client/SaleReturns/getSaleReturnList', method: 'POST', options: {token: true }}});
        var postData = {
            pageIndex: returnPageIndex,
            pageSize: '5',
            status: status,
            searchOrderNo:searchOrderNo,
            searchSaleReturnNo: searchSaleReturnNo,
            startDate: startTime, endDate: endTime
        };
		//分页处理
        var dealWithPagenation = function (result){
            $("#pagenation").createPage({
                pageCount:Math.ceil(result.count/5),
                current:1,
                unbind:true,
                backFn:function (p){
					postData.pageIndex=p;
                   proxy.getSaleReturnList(postData, function (err, result) {
						if (err) {
							alert("获取退货列表失败" + err.message);
							return;
						} else {
							// 设置当前页码
							//$('#currentPageIndex').text(returnPageIndex);
							// 获得总页数
							//totalPage = Math.ceil(result.count / 5);
							dealWithList(result);
							
							
						}

					}, this);
                }
            });
        }
		var dealWithList=function(result){
			var lists = result.list;
                for (var i = 0; i < lists.length; i++) {
                    var orderTotalPrice = 0;
                    var returnTotalPrice = 0;
                    var singleProductPrice = 0;
                    var singleReturnPrice = 0;
                    // 将待退货改为退货中
					/*
                    if (lists[i].cSaleReturnStatus == "SALERETURNING") {
                        lists[i].cStatusName = "退货中";
                    }
					*/
                    // 是否可以评论
                    if (lists[i].cSaleReturnStatus == "ENDSALERETURN" && lists[i].iFeedBack == "-1") {
                        lists[i].isCanEvaluate = 1;
                    } else {
                        lists[i].isCanEvaluate = 0;
                    }
                    for (var j = 0; j < lists[i].oSaleReturnDetails.length; j++) {
                        // 获得退货订单总价
                        singleProductPrice = parseFloat(lists[i].oSaleReturnDetails[j].fSalePrice) * lists[i].oSaleReturnDetails[j].fReturnQuantity;
                        orderTotalPrice += parseFloat(singleProductPrice);
                        lists[i].orderTotalPrice = parseFloat(orderTotalPrice).toFixed(2);
                        // 计算退货总价
                        returnTotalPrice += parseFloat(lists[i].oSaleReturnDetails[j].fReturnMoney);
                        lists[i].returnTotalPrice = parseFloat(returnTotalPrice).toFixed(2);
                        lists[i].oSaleReturnDetails[j].productImg = lists[i].oSaleReturnDetails[j].oProductAlbum && lists[i].oSaleReturnDetails[j].oProductAlbum.imgUrl;//lists[i].oSaleReturnDetails[j].oProductAlbum.cFolder + "lm_" + lists[i].oSaleReturnDetails[j].oProductAlbum.cImgName;
                    }
                }
                var html = _this.render($("#returnDataTpl").html(), { returnList: lists });
                $("#returnDataLists").empty().append(html);
                if (callback)
                    callback.call(_this);
		}
        proxy.getSaleReturnList(postData, function (err, result) {
            if (err) {
                alert("获取退货列表失败" + err.message);
                return;
            } else {
                // 设置当前页码
                //$('#currentPageIndex').text(returnPageIndex);
                // 获得总页数
                //totalPage = Math.ceil(result.count / 5);
				dealWithList(result);
				dealWithPagenation(result);
				
                
            }

        }, this);

    };
    return view;
});