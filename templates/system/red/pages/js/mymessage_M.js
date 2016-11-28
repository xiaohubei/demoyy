cb.views.register('MessageListController', function(controllerName) {
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
		},
		changeToReaded: {
			url: 'client/Bulletins/modifyBulletinStatus',
			method: 'POST',
			options: {
				token: true
			}
		}
	})
	view.prototype.init = function() {
		var self = this;
		var thisView = this.getView();
		this.data = {
			pageIndex: 1,
			pageSize: 10,
			message_type: 'all'
		}
		thisView.find('.buttons-row a.tab-link').click(function() {
			$$('.buttons-row a').removeClass('active');
			$$(this).addClass('active');
			myApp.attachInfiniteScroll(thisView.find('.infinite-scroll'));
            self.getData(thisView,$$(this));
		});
		self.register(thisView);
		self.getData(thisView,thisView.find('.buttons-row a.tab-link').eq(0));
	};
	view.prototype.getData = function(thisView,target) {
		var index = target.index();
		var messageType = ['all', 'order', 'account', 'system'];
		this.data.message_type = messageType[index];
		this.data.pageIndex = 1;
		this.proxy.getData(this.data, function (err, result) {
		    if (err) {
		        myApp.toast(err.message, 'error').show(true);
		        return;
		    }
		    if (result) {
				this._set_data('allCount', result.count);
				var data = result.bulletins;
				var html = this.render(thisView.find('script').html(), {
					data: data
				});
				thisView.find('.msg-list').html(html);
				this.changeToRead(result, thisView);
			}
		}, this);
	}
	view.prototype.changeToRead = function(result, thisView) {
		var ids = [];
		result.bulletins.forEach(function(item) {
			if (!item.bReaded) {
				ids.push(item.id);
			}
		})
		if (ids.length == 0) {
			//如果全部是已读信息 就没有必要在标记为已读 
		} else {
			this.proxy.changeToReaded({
				bIdList: ids
			}, function(err, result) {
			    if (err) {
			        myApp.toast(err.message, 'error').show(true);
			        return;
			    }
			}, this);
		}
	}
	view.prototype.register = function(thisView) {
		var self = this;
		var infinite = thisView.find('.infinite-scroll');
		infinite.on('infinite', function() {
			var length = thisView.find('.msg-list dl').length;
			if (length < self._get_data('allCount')) {
				thisView.find('.infinite-scroll-preloader').show();
				self.data.pageIndex++;
				self.proxy.getData(self.data, function(err, result) {
					if (result) {
						this._set_data('allCount', result.count);
						var data = result.bulletins;
						if (data.length == 0) return;
						var html = this.render(thisView.find('#messageItemTpl').html(), {
							data: data
						});
						thisView.find('.msg-list').append(html);
						self.changeToRead(result, thisView);
					} else {
						myApp.toast(err.message,'error').show(true);
					}
				}, self);
			} else {
				thisView.find('.infinite-scroll-preloader').hide();
				myApp.toast('没有新消息了','tips').show(true);
				myApp.detachInfiniteScroll(infinite)
			}
		});
	}
	return view;
});