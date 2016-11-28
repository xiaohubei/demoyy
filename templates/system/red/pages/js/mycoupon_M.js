cb.views.register('CouponViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.totalCount='';
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getIntegralReturnList: {
            url: 'coupon/MemberCouponServer/getCouponList',
            method: 'post',
            options: {
                token: true,
                mask: true
            }
        },
        getCountCoupon: {
            url: 'coupon/MemberCouponServer/getCountCoupon',
            method: 'get',
            options: {
                token: true
            }
        }
    });
    var param ={    	
	    pageIndex: 1,
	    pageSize: 10,
	    status: 0,
	    orderBy: 'reduceAmount',
	    sequence: 1    
    };
    view.prototype.init = function () {
        var self = this;
        var thisView = this.getView();
        var pageContent = thisView.find('.pull-to-refresh-content.infinite-scroll');
        this.proxy.getCountCoupon(function (err, data) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            thisView.find('.buttons-row.myCouponTabNav').children('a').each(function () {
                $$(this).children('span').text(data[$$(this).attr('data-type')]);
            });
        });
        param.pageIndex =1;
		self.getMemberCouponList(thisView,param);
        thisView.find('.buttons-row.myCouponTabNav').children('a').on('click', function () {
            $$(this).parent().children().removeClass('active');
            $$(this).addClass('active');
            param.pageIndex =1;
            param.status = $$(this).attr('data-type');
            self.getMemberCouponList(thisView,param);
        });

        //注册下拉刷新事件
        pageContent.on('refresh', function (e) {
            var dataType = thisView.find('.buttons-row.myCouponTabNav').children('a.active').attr('data-type');
            param.status = dataType;
            param.pageIndex =1;
            self.getMemberCouponList(thisView,param,false,function () {
                myApp.pullToRefreshDone();
            });
        });
        //注册无限滚动事件
        var infinite = thisView.find('.infinite-scroll');
        pageContent.on('infinite', function () {
        	if(!self.proxyHasFinished) return;
        	self.proxyHasFinished = false;
			thisView.find('.infinite-scroll-preloader').show();
			var len = thisView.find('.couponListPage-container ul li').length;
			if (parseInt(self.totalCount) <= len) {
				myApp.detachInfiniteScroll(infinite);
			} else {
				param.pageIndex = parseInt(param.pageIndex)+1;
				self.getMemberCouponList(thisView,param,true);				
			}
		});
    };
    view.prototype.getMemberCouponList = function (thisView,param,isAppend,callback) {
        var self = this;
        this.proxy.getIntegralReturnList({ param: param }, function (err, data) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            if (data.count > 0) {
            	self.totalCount = data.count;
                for (var i = 0; i < data.CouponUsage.length; i++) {
                    if (param.status == '0')
                        data.CouponUsage[i].colorId = 'bg-' + data.CouponUsage[i].id % 4;
                    else if (param.status == '3' || param.status == '2')
                        data.CouponUsage[i].colorId = 'overdue';
                }
            }
            else
                data.CouponUsage = [];
            if(data.CouponUsage.length){
                for(var i=0; i<data.CouponUsage.length; i++){
                    data.CouponUsage[i].expireStartDate= data.CouponUsage[i].expireStartDate.substring(0,19)
                    data.CouponUsage[i].expireEndDate= data.CouponUsage[i].expireEndDate.substring(0,19)
                }
            };
            var couponHtml = self.render(self.getView().find('#couponTpl').html(), {
                couponList: data.CouponUsage
            });
            if(!isAppend){
            	if(data.CouponUsage.length == 0){
            		thisView.find('.couponListPage-container ul').html(couponHtml);
            		return;
            	}else{
            		thisView.find('.couponListPage-container ul').html(couponHtml);
            		myApp.attachInfiniteScroll(thisView.find('.pull-to-refresh-content'));
            	}            	
            }else{
            	thisView.find('.couponListPage-container ul').append(couponHtml);
            	/*myApp.detachInfiniteScroll();*/
            };
            self.proxyHasFinished = true;
            if(callback)callback();
        });
    };
    //将适用商品数组转换成字符串
    view.prototype.changArrToStr = function (arr) {
        if (arr && arr instanceof Array) {
            var IdStrs = arr.join();
        }
        return IdStrs
    };
    return view;
});