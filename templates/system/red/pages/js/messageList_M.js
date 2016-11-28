cb.views.register('MessageDetailController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getData: {
			url: 'client/Bulletins/getDifBulletins',
			method: 'GET',
			options: {
				token: true
			}
		}
	});
	view.prototype.init = function() {
		var self = this;
		var query = this.getQuery();
		var thisView = this.getView();
		var type = query.type;
		var typeName;
		switch (type) {
			case 'system':
				typeName = '系统消息';
				break;
			case 'account':
				typeName = '账户消息';
				break;
			case 'order':
				typeName = '订单消息';
				break;
		}
		thisView.find('.message-type').html(typeName);
		self.param = {
			pageIndex: 1,
			pageSize: 10,
			bReaded: false,
			message_type: type
		}
		this.getData(self.param);
		//注册切换已读未读事件
		thisView.find('.buttons-row a').on('click', function() {
			thisView.find('.buttons-row a').removeClass('active');
			$$(this).addClass('active');
			if ($$(this).attr('data-type') == 'notReaded') {
				self.param.bReaded = false;
			} else {
				self.param.bReaded = true;
			}
			self.param.pageIndex = 1;
			self.getData(self.param);
		});
		//注册下拉刷新事件
		var pull2fresh = thisView.find('.pull-to-refresh-content');
		pull2fresh.on('refresh', function(e) {
			self.param.pageIndex = 1;
			self.getData(self.param);
			myApp.pullToRefreshDone();
		});
		//注册无限滚动事件
		var infinite = thisView.find('.infinite-scroll');
		infinite.on('infinite', function() {
			thisView.find('.infinite-scroll-preloader').show();
			var len = thisView.find('.media-list.msgDetail ul li').length;
			if (len == parseInt(self.totalCount)) {
				myApp.toast('内容已经加载完毕','tips').show(true);
				myApp.detachInfiniteScroll(infinite);
			} else {
				self.param.pageIndex = parseInt(self.param.pageIndex) + 1;
                self.getData(self.param,true);
			}
		});
	}
	view.prototype.getData = function(param, callback) {
		var thisView = this.getView();
		var self = this;
		this.proxy.getData(param, function (err, result) {
			if (err) {
				myApp.toast(err.message,'error').show(true);
				return;
			} else {
				self.totalCount = result.count;
				var html = self.render(thisView.find('script').html(), {
					bulletins: result.bulletins
				});
				if (callback) {
					thisView.find('.msgDetail ul').append(html);
				} else {
					thisView.find('.msgDetail ul').html(html);
					myApp.attachInfiniteScroll(thisView.find('.pull-to-refresh-content'));
				}
			}
		});
	}
	return view;
});