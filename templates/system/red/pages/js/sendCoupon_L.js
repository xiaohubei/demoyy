cb.views.register('CouponViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.getProxyData = function (widgetName) {
	    var queryString = new cb.util.queryString();
		if (widgetName == "search_detail") {
			return {
				categoryid: queryString.get("categoryid") || "",
				keyword: encodeURIComponent(queryString.get("keyword")) || ""
			};
		}
	};
	view.prototype.init = function() {
		cb.rest.ContextBuilder.promotion();
		var  param = {};
		var queryString = new cb.util.queryString();
		param.couponId = queryString.get('couponid');
		var reduceAmount = queryString.get('reduceAmount');
		var startAmount = queryString.get('startAmount');
		var expireStartDate = queryString.get('expireStartDate');
		var expireEndDate = queryString.get('expireEndDate');
		var addContent = "";
		addContent += '<div class="CouponInfo"><h3>亲,确认领取 '+reduceAmount+'元店铺优惠劵么?满'+startAmount+'元可以使用!</h3>';
		addContent += '<button type="submit" class="CouponSubmit">确认领取</button></div>';
		addContent += '<div class="successSend" style="display: none;"><h3>恭喜您领取成功</h3>';
		addContent += '<ul><li>优惠劵额：<span>'+reduceAmount+'元</span></li><li>使用门槛：<span>订单满'+startAmount+'元</span></li>';
		addContent += '<li>使用时间：<span>'+expireStartDate+'至'+expireEndDate+'</span></li></ul></div>';
		$('.sendCouponBackground').html(addContent);
        $(".CouponSubmit").on('click', function (e) {         	
	        var couponProxy = cb.rest.DynamicProxy.create({
            	senderCoupon: { url: 'coupon/MemberCouponServer/sendCoupon', method: 'POST', options: { token: true } }
            });
            couponProxy.senderCoupon({param:param}, function (err, result) {
            	if (!err) {
	            	$('.CouponInfo')[0].style.display='none';
            		$('.successSend')[0].style.display='block';
            	} else {
            		if(err.code == '999'){
            			alert('优惠券已被领完，请明天再来领取！');
            		}else{
            			alert(err.message);
            		}
            	}
            });
        });		
	}
	return view;
});