cb.views.register('IntegralViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.totalCount='';
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getMemberByToken: {
			url: 'member/Members/getMemberByToken',
			method: 'get',
			options: {
			    token: true,
                mask:true
			}
		},
		getIntegralList: {
			url: 'member/MemberPoint/getPointDetail',
			method: 'GET',
			options: {
			    token: true,
			    mask: true
			}
		}
	});
	var param = {
		addType: 0,
		isGetLoginMember: true,
		pageIndex: 1,
		pageSize: 20
	};
	view.prototype.init = function() {
		var self = this;
		var this_view = this.getView();
		this.getMemberByToken();
		param.addType =0;
		param.pageIndex=1;
		this.getIntegralReturnList(this_view,param);
		this_view.find('.account-infor-secend').on('click', function() {
			param.addType = 1;
			param.pageIndex = 1;
			self.getIntegralReturnList(this_view,param);
			this_view.find('.account-infor-secend-right').removeClass('active');
			$$(this).addClass('active');
		});
		this_view.find('.account-infor-secend-right').on('click', function() {
			param.addType = 2;
			param.pageIndex = 1;
			self.getIntegralReturnList(this_view,param);
			this_view.find('.account-infor-secend').removeClass('active');
			$$(this).addClass('active');
		});
		this_view.find('.all-income').on('click', function() {
			param.addType = 0;
			param.pageIndex = 1;
			self.getIntegralReturnList(this_view,param);
		});		
		$$("#account-info").click(function(e) {
				var status = $$(e.target).attr('data-status');
				if (status == null) {
					return;
				}
				var StatusArray = [];
				StatusArray.push(status.split('-'));
				if (StatusArray[0][0] == 'R') {
					myApp.mainView.router.loadPage({
						url: "member/return_detail?cSaleReturnNo=" + status
					});
				} else if (StatusArray[0][0] == 'O') {
					myApp.mainView.router.loadPage({
						url: "member/orderdetail?orderId=" + status
					});
				}
			})
			//注册下拉刷新事件
		var ptrContent = this_view.find('.pull-to-refresh-content');
		ptrContent.on('refresh', function(e) {
			param.pageIndex = 1;
			self.getIntegralReturnList(this_view,param);
			myApp.pullToRefreshDone();
		});
		//注册无限滚动事件
		var infinite = this_view.find('.infinite-scroll');
		infinite.on('infinite', function() {
			this_view.find('.infinite-scroll-preloader').show();
			var len = this_view.find('.media-list.msgDetail ul li').length;
			if (parseInt(self.totalCount) <= len) {
				myApp.detachInfiniteScroll(infinite);
			} else {
				param.pageIndex = parseInt(self.pageIndex)+1;
				self.getIntegralReturnList(this_view,param,true);			
			}
		});
	};
	//获取会员信息
	view.prototype.getMemberByToken = function() {
		this.proxy.getMemberByToken(function(err, data) {
			if (err) {
			    myApp.toast(err.message,'error').show(true);
				return;
			} else {
				$$("#availableCoupon").text(data.iPoints);
			}
		});
	};
	//获取所有积分明细 
	//type=0代表获取全部积分明细         type=1代表收入  type=2代表支出
	view.prototype.getIntegralReturnList = function(this_view,param,callback) {
		var self = this;
		this.proxy.getIntegralList(param, function(err, data) {
			if (data) {
				self.totalCount = data.modelsCount;
				var result = data.models;
				if (!$$.isArray(result)){
					this_view.find('.msgDetail ul').html('暂无数据');
					return;
				} 
            	result.forEach(function (item) {
	                if (!item.cSourceCode) return;
	                if(item.cSourceCode.indexOf('O')>-1){
	                	item.status ='O';
	                }else if(item.cSourceCode.indexOf('R')>-1){
	                	item.status ='R';
	                }
            	});
				if (result) {
		            if(result.length){
		                for(var i=0; i<result.length; i++){
		                    result[i].dPointChangeTime= result[i].dPointChangeTime.substring(0,19)
		                }
		            };
					var html = self.render(this_view.find('#integralTpl').html(), {
						integralList: result
					});
					if (callback) {
						this_view.find('.msgDetail ul').append(html);
					} else {
						this_view.find('.msgDetail ul').html(html);
						myApp.attachInfiniteScroll(this_view.find('.pull-to-refresh-content'));
					};
				}else{
					this_view.find('.msgDetail ul').html('暂无数据');
				}
			}
		});
	};

	return view;
});