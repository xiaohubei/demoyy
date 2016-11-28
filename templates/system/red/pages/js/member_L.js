cb.views.register('MemberViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function (){
    	var _this= this;
    	var proxy = cb.rest.DynamicProxy.create({
            getUserOrders: {
                url: 'client/orders/getUserOrders',
                method: 'POST',
                options:{token:true}
            },
            getMemberInfo:{
            	url:'member/Members/getMemberByToken',
            	method:'GET',
            	options:{token:true}
            },
            getOrderStyleCount:{
            	url:'client/Orders/getOrderStyleCount',
            	method:'POST',
            	options:{token:true}
            },
            confirmTake:{
            	url:'client/Orders/confirmTake',
            	method:'POST',
            	options:{token:true}
            },
            getCountCoupon:{
                url:'coupon/MemberCouponServer/getCountCoupon',
                method:'get',
                options:{
                    token:true
                }
            }
        });
	    var totalOrders = 0;
        var aTab;
	    //获取订单
        proxy.getUserOrders({pageSize:5, pageIndex:1},function (error, result){
        	if(error){
                ModalTip({message:error.message},_this)
        		return;
        	};
        	if(result){
	        	totalOrders = result.count;
	        	$("#allorderlist").text(totalOrders);//更新全部订单总数
	        	$("#orderlist").html(dealWithOrderLists(result.orders));//加载全部订单显示
                //分页处理
                dealWithPagenation(result);
        	};
            aTab = $("#orderListsHeader").children();
        	TabSwitch( aTab,'click');//注册选项卡事件
            statusClickEvent($("#orderstatus")); //状态栏点击事件注册
        })
        //分页处理
        var dealWithPagenation = function (result,currentStatus){
            $("#pagenation").createPage({
                pageCount:Math.ceil(result.count/5),
                current:1,
                unbind:true,
                backFn:function (p){
                    proxy.getUserOrders({status:currentStatus, pageSize:5, pageIndex:p},function (error, result){
                        if(error){
                            ModalTip({message:error.message},_this)
                            return;
                        };
                        if(result){
                            totalOrders = result.count;
                            $("#allorderlist").text(totalOrders);//更新全部订单总数
                            $("#orderlist").html(dealWithOrderLists(result.orders));//加载全部订单显示
                        }
                    });
                }
            });
        }
        //获取会员信息
        proxy.getMemberInfo({},function (error, result){
            if(error){
                ModalTip({message:error},_this)
                return;
            };
            if(result){
                dealWithMemberInfo(result);//处理会员个人信息
            }
        });
        //获取优惠券信息
        proxy.getCountCoupon({},function (error, result){
            if(error){
                ModalTip({message:error},_this)
                return;
            };
            if(result){
                //我的优惠券
                $("#memberassert").find(".assertdiscount").text(result[0]);
            }
        });
    	//获取订单数
        proxy.getOrderStyleCount({},function (error, result){
        	if(error){
                ModalTip({message:"获取订单数量失败"+error},_this)
        		return;
        	};
        	if(result){
	        	dealWithOrderListsHeader($("#orderListsHeader"),result); //更新选项卡订单各个状态数量
	        	dealWithOrderStatus($("#orderstatus"),result);//更新订单各个状态数量
        	}
        });
        //状态栏更新
        var dealWithOrderStatus = function (parent,data){
        	var aChild = parent.find('p');
        	aChild.each(function(index){
        		for(var i =0; i<data.length; i++){
        			if($(this).attr("data-status")== data[i][0] ){
        				$(this).find(".font-red").text(data[i][1] );
        			};
	        	}
        	})
        }
        var dealWithOrderListsHeader = function (parent,data){
        	var aChild = parent.children();
        	aChild.each(function(index){
        		for(var i =0; i<data.length; i++){
        			if($(this).attr("data-status")== data[i][0] ){
        				$(this).find(".orderlist-num").text(data[i][1] );
        			};
        		};
        	})
        };
        var dealWithOrderLists = function (data){
            var txt =data.length ? $("#orderListTpl").html(): '<p style="margin:20px 0 0 20px; font-size:15px; height:200px">暂无订单</p>';
            var html =_this.render(txt, { orderlist:data });
            $("#orderlist").empty().append(html);
            confrimOrderLists();
        }
        //选项卡
        var TabSwitch = function (aNav,event){
        	aNav.each(function (index){
        		$(this).on(event, function (){
        			aNav.removeClass('active');
        			$(this).addClass('active');
                    TabSwitchGetData(this);
        		})
        	})
        };
        //TAB页签和状态烂点击的服务请求
        var TabSwitchGetData = function (This){
            var currentStatus = $(This).attr("data-status");
            postData = {pageSize:5, pageIndex:1, status:currentStatus };
            proxy.getUserOrders(postData, function (error, result){
                if(error)return;
                if(result)dealWithOrderLists(result.orders);
                dealWithPagenation(result,currentStatus);
            })
        }
        //状态栏的点击
        var statusClickEvent = function (data){
            var aChild = data.children();
            aChild.each(function(index){
                $(this).on('click', function(){
                    var status =$(this).attr("data-status");
                    if( status== 'UNREMARK') return;
                    aTab.removeClass('active');
                    aTab.eq(index+1).addClass('active');
                    TabSwitchGetData(this);
                })
            })
        }
        //处理会员信息
        var dealWithMemberInfo = function (data){
        	if(!data)return;
        	var memberInfo = $("#memberinfo"), memberassert = $("#memberassert");
        	memberInfo.find('.member-name').text(data.cUserName);
            // 头像
        	if (data.cPortrait && data.cPortrait != "") {
                data.cPortrait = cb.util.adjustImgSrc(data.cPortrait);
        	    $("#memberPortrait").attr("src", data.cPortrait);
        	} else {
        	    // 没有头像默认头像
        	    $("#memberPortrait").attr("src", "http://i.jd.com/commons/img/no-img_mid_.jpg");
        	}
        	memberInfo.find('.member-rank').find("span").text(data.cMemberLevelName);
        	memberassert.find('.assertscore').text(data.iPoints);
        };
        //确认收货
        var confrimOrderLists = function(){
        	var confrimOrderLists = $("#orderlist").find(".confrimOrder");
            confrimOrderLists.each(function (index){
            	$(this).on("click",function(){
            	confrimOrderTake($(this).attr("data-cOrderNo"));
            	});
            });
        }
        var confrimOrderTake = function (data){
        	if(!data)return;
            var callback = function (){
                proxy.confirmTake({cOrderNo:data},function (error, success){
                    if(error){
                        ModalTip({message:"确认收货失败"+error.message},_this);
                        return;
                    };
                    var callBack = function (){
                        window.location.href= window.location.href;
                    }
                    ModalTip({message:"确认收货成功",cb:callBack},_this);
                })
            }
            ModalTip({message:"你确定要确认收货么？",confirm:true, okCallback:callback},_this);
        }
        //处理图片的路径
        var dealWithImgPath = function(data){
        	for (var i = 0; i < data.length; i++) {
                var imageUrl = data[i].oOrderDetails[0].DefaultImage;
        		if(!imageUrl){
        			console.log("第"+i+"张图片，没有图片链接地址");
        		}
                data[i].DefaultImage = replaceBackslash(imageUrl);
        	}
        	return data;
        }
        //正反斜杠的替换
        var replaceBackslash = function (url){
        	if(!url)return;
            var re = /\\/g;
            url = url.replace(re,'/');
		    return url;
		}
    }
    return view;
})