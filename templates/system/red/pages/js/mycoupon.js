cb.views.register('MyCouponController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.init = function() {
		var returnPageIndex = 1;
		var searchStatus = 'reduceAmount';
		var usedStatus = '';
		var _this = this;
		var proxy = cb.rest.DynamicProxy.create({
			getIntegralReturnList: {
				url: 'coupon/MemberCouponServer/getCouponList',
				method: 'post',
				options: {
					token: true
				}
			},
			deleteCouponList: {
				url: 'coupon/MemberCouponServer/deleteCoupon',
				method: 'post',
				options: {
					token: true
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
		//获取优惠券列表
		var getIntegralReturnList = function(usedStatus, searchStatus) {
			var couponParam = {
				status: usedStatus,
				pageIndex: returnPageIndex,
				pageSize: 5,
				orderBy: searchStatus,
				sequence: 1
			}
			proxy.getIntegralReturnList({
				param: couponParam
			}, function(err, data) {
				if (err) {
					alert("获取优惠券列表失败" + err);
					return;
				} else {
					dealIntegralList(data, usedStatus);
					dealWithPagenation(data,searchStatus,usedStatus);
				}
			}, this);
		};
		//删除优惠券
		var deleteCouponList = function(couponId) {
			proxy.deleteCouponList({
				id: couponId
			}, function(err, data) {
				if (err) {
					alert("删除失败，请刷新后重试" + err);
					return;
				} else {
					alert("删除成功");
					location.reload();
					return;
				}
			})
		};
		//获取优惠券列表总数
		var getCountCoupon = function() {
			proxy.getCountCoupon(function(err, data) {
				if (err) {
					alert("获取失败" + err);
					return;
				} else {
					$("#unused_num").text(data[0]);
					$("#alreadyUsed_num").text(data[2]);
					$("#expireUsed_num").text(data[3]);
				}
			});
		}
		var dealIntegralList = function(result, usedStatus) {
			if (usedStatus == 0) {
				var lists = result.CouponUsage;
				if(!lists)return;
				var tplstring = document.getElementById("couponTpl");
				var html = _this.render(tplstring.innerHTML, {
					returnList: lists
				});
				$("#couponList").empty().append(html);
				$("#unused_num").text(result.count);
			} else if (usedStatus == 2) {				
				var lists = result.CouponUsage;
				if(!lists)return;
				var tplstring = document.getElementById("alreadyUsedTpl");
				var html = _this.render(tplstring.innerHTML, {
					alreadyUsedList: lists
				});
				$("#alreadyUsedList").empty().append(html);
				$("#alreadyUsed_num").text(result.count);

			} else if (usedStatus == 3) {
				
				var lists = result.CouponUsage;
				if(!lists)return;
				var tplstring = document.getElementById("expireUsedTpl");
				var html = _this.render(tplstring.innerHTML, {
					expireUsedList: lists
				});
				$("#expireUsedList").empty().append(html);
				$("#expireUsed_num").text(result.count);
			}

		};
		//分页处理
		var dealWithPagenation = function(result,searchStatus,usedStatus) {
			$("#pagenation").createPage({
				pageCount: Math.ceil(result.count / 5),
				current: 1,
				unbind: true,
				backFn: function(p) {
					var couponParam = {
						status: usedStatus,
						pageIndex: p,
						pageSize: 5,
						orderBy: searchStatus,
						sequence: 1
					}
					proxy.getIntegralReturnList({
						param: couponParam
					}, function(err, data) {
						if (err) {
							alert("获取优惠券列表失败" + err);
							return;
						} else {
							dealIntegralList(data, usedStatus);
						}
					}, this);
				}
			});
		}

		getIntegralReturnList(0, searchStatus);
		getCountCoupon();
		$("#unused").click(function() {
			if(!_this._get_data('searchStatu')){
				_this._set_data('searchStatu','reduceAmount');
			}
			getIntegralReturnList(0,_this._get_data('searchStatu'));
		});
		$("#alreadyUsed").click(function() {
			getIntegralReturnList(2);
		});
		$("#expireUsed").click(function() {
			getIntegralReturnList(3);
		});
		$("#couponList").click(function(e) {
			var couponIds = [];
			var tagId = $(e.target).attr('data-tag');
			var useProductId = $(e.target).attr('data-product');	
			if (tagId) {
				if(window.confirm('你确定要删除么！')){
					deleteCouponList(tagId);
				}else{
					return false;
				}				
			};
			if (useProductId) {
				couponIds = $(e.target).attr('data-ids');
				if (couponIds == "null") {
					window.open("../list?isGiftCard=false");
				} else {
					window.open("../list?categoryid="+couponIds+"&isGiftCard=false");
				}

			}
		});
		$("#searchBtn").click(function(event) {
			var evt = event.srcElement || event.target;
			$(evt).addClass('active down').siblings().removeClass('active down');
			var tagId = $(evt).attr('data-tag');
			var searchStatu = '';
			switch (tagId) {
				case "btn1":
					getIntegralReturnList(0, "reduceAmount");
					searchStatu = 'reduceAmount';
					break;
				case "btn2":
					getIntegralReturnList(0, "expireStartDate");
					searchStatu = 'expireStartDate';
					break;
				case "btn3":
					getIntegralReturnList(0, "expireEndDate");
					searchStatu = 'expireEndDate';
					break;
				default:
					searchStatu = 'reduceAmount';
					break;
			};
			_this._set_data('searchStatu',searchStatu);
		});

	};
	return view;
});