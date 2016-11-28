cb.views.register('ConsultingController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getconsulting: {url: 'member/Comments/query',method: 'get',options: {token: true,mask:true}}
	});
	view.prototype.once = function() {
		var self = this;
		var thisView = this.getView();
		var subnavbar = thisView.find('.subnavbar a.button');
		subnavbar.click(function() {
			subnavbar.removeClass('active');
			$$(this).addClass('active');
			self.param.type = $$(this).attr('data-type');
			self.param.pageIndex = 1;
			self.getconsulting(self.param, thisView);
		});
	}
	view.prototype.init = function() {
		var self=this;
		var query = this.getQuery();
		this.param = {
			productID: query.id,
			type: 1,
			commentStatus: 0,
			isShowReply: false,
			pageIndex: 1,
			pageSize: 10
		};
		var thisView = this.getView();
		thisView.find('.toolbar .btn-ok').attr('href', 'submitConsulting?id=' + query.id);
		this.getconsulting(this.param, thisView);
		$$(document).on('pageBack', '.page[data-page="submitConsulting"]', function() {
			self.getconsulting(self.param, thisView);
		})
	}
	view.prototype.getconsulting = function (param, thisView) {
	    var self = this;
	    this.proxy.getconsulting(param, function (err, result) {
			if (err) {
				myApp.toast(err.message, 'error').show(true);
			} else {
				if (result.models.length==0) {
				    result.models = [];
				}
				var consulList = this.dealData(result.models);
				var html = this.render(thisView.find('#consultingList').html(), {
				    data: consulList
				});
				thisView.find('.consulting-list').html(html);
				self.getView().find('.page-content.pull-to-refresh-content').on('refresh', function (e) {
				    self.getView().find('.infinite-scroll-preloader').hide();
				    myApp.pullToRefreshDone();
				});
			}
		}, this);
	}
	view.prototype.dealData = function (array) {
	    var isAllReplay = true;
	    var consulting = [];
	    array.forEach(function (item) {
			if (item.dTime) {
				item.dTime = item.dTime.split('.')[0];
			}
			if (item.dTimeReply) {
				item.dTimeReply = item.dTimeReply.split('.')[0];
			}
			if (!item.id) {
				item.id = '游客';
			}
			if (item.cCommentReply) {
			    item.isAllReplay = false;
			    consulting.push(item)
			}
	    })
	    return consulting;
	}

	return view;
});