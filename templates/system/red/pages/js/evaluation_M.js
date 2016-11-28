cb.views.register('EvaluationController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getevaluation: {url: 'member/Comments/query',method: 'get',options: {token: true,mask:true}}
	});
	view.prototype.once = function () {
		var self = this;
		var thisView = this.getView();
		var subnavbar = thisView.find('.evaluationBtn');
		subnavbar.click(function() {
			subnavbar.removeClass('active');
			$$(this).addClass('active');
			self.param.starLevel = $$(this).attr('starLevel');
			self.param.pageIndex = 1;
			self.getevaluation(self.param, thisView);
		});
	}
	view.prototype.init = function () {
		var query = this.getQuery();
		this.param = {
			productID: query.id,
			type: 2,
			commentStatus: 0,
			pageIndex: 1,
			pageSize: 10
		};
		var thisView = this.getView();
		thisView.find('.toolbar .btn-ok').attr('href', 'submitConsulting?id=' + query.id);
		this.getevaluation(this.param, thisView);
	}
	view.prototype.getevaluation = function (param, thisView) {
	    var _self = this;
	    this.proxy.getevaluation(param, function (err, result) {
			if (err) {
				myApp.toast(err.message, 'error').show(true);
			} else {
				if (result.models.length > 0) {
				    var data = _self.dealData(result.models);
				    var html = _self.render(thisView.find('#evaluationListTpl').html(), {
						data: data
					});
				    thisView.find('.evaluationList').html(html);
				} else {
				    thisView.find('.evaluationList').html('  <div  class="noDataTip"><i class="icon icon-no-consult"></i><p>您还未评价此商品</p></div>');
				}
				_self.getView().find('.page-content.pull-to-refresh-content').on('refresh', function (e) {
				    _self.getView().find('.infinite-scroll-preloader').hide();
				    myApp.pullToRefreshDone();
				});
			}
		});
	}
	view.prototype.register=function(thisView){
		
	}
	view.prototype.dealData = function (array) {
		array.forEach(function(item) {
			if (item.dTime) {
				item.dTime = item.dTime.split('.')[0];
			}
			if (item.dTimeReply) {
				item.dTimeReply = item.dTimeReply.split('.')[0];
			}
			var arr = [];
			var length = parseInt(item.iStars);
			for (var i = 0; i < 5; i++) {
				if (i < length) {
					arr.push(true)
				} else {
					arr.push(false)
				}
			}
			item.iStars = arr;
		});
		return array;
	}

	return view;
});