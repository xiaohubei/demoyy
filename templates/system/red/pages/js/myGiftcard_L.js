cb.views.register('MyGiftCardController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var _this =this;
        var currentStatus = 0;
        var pageSize = 5;
        var pagenationAfterSearch = false;
        var orderByData = "createDate";
        var proxy = cb.rest.DynamicProxy.create({
            getMemberGiftCardsList :{
            	url:'giftcard/ClientServer/getMemberGiftCardsList',
            	method:'POST',
            	options:{token:true}
            },
            getCountGiftCard :{
            	url:'giftcard/ClientServer/getCountGiftCard',
            	method:'POST',
            	options:{token:true}
            },
            getStoreSetting:{
                url: 'client/StoreSettingController/getStoreSetting',
                method: 'POST',
                options: {token: true}
            }
        });
        //是否启用去充值按钮
        var isGoRecharge = function (){
	        proxy.getStoreSetting({},function(err,success){
	    		debugger;
	    		if(err){
	    			console.log(err.message);
	    			return;
	    		}
	    		if(!success.storage_enableflag ){
		    		$("#cardList .goRecharge").addClass("disabled");
	    		}
	    	})
        }

        //获取各种状态的数量
        proxy.getCountGiftCard({},function(err,suc){
        	if(err){
        		console.log(err.message);
        		return;
        	};
        	$("#giftCardNav span").eq(0).text(suc[0]);
        	$("#giftCardNav span").eq(1).text(suc[1]);
        	$("#giftCardNav span").eq(2).text(suc[2]);
        	$("#giftCardNav span").eq(3).text(suc[9]);
        })
        //获取礼品卡
        //sequence : 0(asc),1(desc)
        var getMemberGiftCardsList = function(data){
        	var postData = {
        		status:currentStatus,
        		pageIndex:1,
        		pageSize:pageSize,
        		orderBy:'createDate',
        		sequence:1
        	};
        	if(data){
        		postData =$.extend(true, postData, data); ;
        	}
        	proxy.getMemberGiftCardsList({param:postData},function(err,suc){
		        if(currentStatus != 0){
		    		$("#orderBy").hide()
		    	}else{
		    		$("#orderBy").show()
		    	}
        		if(err){
        			console.log("获取储值卡详情失败"+err.message);
        			$("#cardList").empty().append('<p style="text-align:center;">获取储值卡详情失败'+err.message+'</p>');
        			return;
        		}
        		$('#giftCardNav li[data-type='+currentStatus+'] span').text(suc.count);

        		dealWithGiftCard(suc.MemberGiftCards);
        		dealWithPagenation(suc)
        	})
        }
        getMemberGiftCardsList();
        //礼品卡列表渲染
        var dealWithGiftCard = function(data){
        	if(!data.length){
        		$("#cardList").empty().append("<p style='text-align:center;'>没有礼品卡信息</p>");
        		return;
        	};
        	data.type=currentStatus;
            //正反斜杠
            for(var i=0; i<data.length; i++){
                data[i].cFolder = replaceBackslash(data[i].cFolder);
            };
        	var renderHtml = currentStatus == 0? $("#cardListTpl1").html():$("#cardListTpl2").html();
            var html = _this.render(renderHtml,{data: data});
            $("#cardList").empty().append(html);
            //是否启用礼品卡
            isGoRecharge();
        }
        //排序
        $("#orderBy button").click(function(e){
        	pagenationAfterSearch = true;
        	$("#orderBy button").removeClass("active down");
        	$(this).addClass("active down");
        	orderByData = $(this).attr("data-type");
        	getMemberGiftCardsList({orderBy:orderByData})
        });
        //tab页签切换
        $("#giftCardNav li").click(function(){
        	$("#orderBy button").removeClass("active down");
        	pagenationAfterSearch = false;
        	orderByData = "createDate";
        	currentStatus = $(this).attr("data-type")
        	getMemberGiftCardsList()
        });
        //格式化日期
        var formatDate = function (strDate, fmt) {
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
    	};
        //分页处理
		var dealWithPagenation = function(success) {
			$("#pagenation").createPage({
				pageCount: Math.ceil(success.count / pageSize),
				current: 1,
				unbind: true,
				backFn: function(p) {
					orderByData = pagenationAfterSearch ? orderByData : "createDate";
					proxy.getMemberGiftCardsList({param:{
							status:currentStatus,
			        		pageIndex:p,
			        		pageSize:pageSize,
			        		orderBy:orderByData,
			        		sequence:1
						}
        			}, function(err, success) {
						if (err) {
							alert("获取储值卡详情失败" + err.message);
							return;
						} else {
							dealWithGiftCard(success.MemberGiftCards);
						}
					}, this);
				}
			});
		}
		
        //正反斜杠匹配
        var replaceBackslash = function (url){
            if(!url)return;
            var re = /\\/g;
            url = url.replace(re,'/');
            return url;
        }
    };
    return view;
});