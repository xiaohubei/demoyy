cb.views.register('myEvaluationController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getUnRemarkDetail: {url: 'client/Orders/getUnRemarkDetail',method: 'GET',options: {token: true,mask:true}},
		query: {url: 'member/Comments/query',method: 'GET',options: {token: true,mask:true}},
		saveBatch: {url: 'member/Comments/saveBatch',method: 'POST',options: {token: true,mask:true}}
	});
	view.prototype.once = function() {
		var self = this;
		var thisView = this.getView();
		thisView.find('.toolbar-inner a.submit-evaluation').click(function () {
			var order = self._get_data('order');
			var arr = [];
			var domLi = thisView.find('.evluationUl').children('li');
			for (var i = 0; i < domLi.length; i++) {
				var iOrderDetail_Id = domLi.eq(i).attr('data-iOrderDetail_Id');
				order.forEach(function(item) {
					if (item.iOrderDetail_Id == iOrderDetail_Id) {
						var json = {
							isAnonymous: $$('.toolbar .anonymous-evalute').prop('checked'),
							iProductSKU_Id: item.iSKUId,
							iOrderDetail_Id: item.iOrderDetail_Id,
							iOrder_Id: item.iOrder_Id,
							iProduct_Id: item.iProductId,
							iType: 20,
							iStars: domLi.eq(i).find('.evaluate-star .hasEvaluate').length,
							cComment: domLi.eq(i).find('.eva-content textarea').val()
						};
						arr.push(json);
					}
				});
			}
			var param = {
				isMember: true,
				models: arr
			}
			self.proxy.saveBatch(param, function(err, result) {
				if (result) {
					myApp.toast('评价成功', 'success').show(true);
					setTimeout(function() {
						myApp.mainView.router.back({query:{refreshPage:true}});
					}, 1000)
				} else if (err) {
					myApp.toast(err.message, 'error').show(true);
				}
			});
		});
	};
	view.prototype.getUnRemarkDetail = function (thisView){
		this.proxy[this.postService](this.postData ,function(err, result) {
			if (result) {
				var html = this.render(thisView.find('script').html(), {data: result.orders});
				thisView.find('.page-content ul').html(html);
				this.register(thisView);
				this._set_data('order', result.orders);
			} else {
				myApp.toast(err.message, 'error').show(true);
			}
		}, this);
	}
	view.prototype.register = function(thisView) {
		var self = this;
		thisView.find('.stars').on('click', function() {
			$$(this).addClass('hasEvaluate');
			$$(this).nextAll('li').removeClass('hasEvaluate');
			$$(this).prevAll('li').addClass('hasEvaluate');
			self.resetStatus(thisView);
		});
		thisView.find('textarea').keyup(function() {
			self.resetStatus(thisView);
		});
		thisView.find('textarea').on("paste",function() {
			setTimeout(function(){
				self.resetStatus(thisView);
			},100);
		});
	}
	view.prototype.resetStatus = function(thisView, context) {
		var flag = 0;
		var waitToEvaluateDom = thisView.find('.evluationUl').children('li');
		for(var i =0 ; i < waitToEvaluateDom.length ;  i++ ){
			var currentDom = waitToEvaluateDom.eq(i);
			var starLi = currentDom.find('.evaluate-star .hasEvaluate');
			var textArea = this.util.trimStr(currentDom.find('.eva-content textarea').val());
			if (starLi.length > 0 && textArea.length >= 10 && textArea.length < 250) {
				flag +=1;
			}
		};
		if(flag == waitToEvaluateDom.length){
			$$('.toolbar-inner a.submit-evaluation').removeClass('disabled');
		}else{
			$$('.toolbar-inner a.submit-evaluation').addClass('disabled');
		};
	};
    view.prototype.util = {
        trimStr : function (str){return str.replace(/(^\s*)|(\s*$$)/g,"");},
    };
	view.prototype.init = function() {
		var query = this.getQuery();
		var thisView = this.getView();
		var orderId = query.order_id;
		var id = query.id;
		if(orderId){
			this.postData = {cOrderNo: orderId, pageIndex: 1,pageSize: 10};
			this.postService = "getUnRemarkDetail";
		}else if(id){
			this.postData = {type:2,productID:id,commentStatus:0,pageIndex:1,pageSize:10};
			this.postService = "query";
		}
		this.getUnRemarkDetail(thisView);
	};
	return view;
});