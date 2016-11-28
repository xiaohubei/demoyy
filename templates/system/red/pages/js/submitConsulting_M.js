cb.views.register('SubmitConsultingController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		saveConsulting: {
			url: 'member/Comments/save',
			method: 'post',
			options: {
				token: true
			}
		}
	});
	view.prototype.once = function() {
		var self = this;
		var query = this.getQuery();
		var thisView = this.getView();
		var id = query.id;
		thisView.find('.btn-submit').click(function () {
			var content = thisView.find('.consulting-content textarea').val();
			if (content && content !== '') {
				var param = {
					model: {
						iType: thisView.find('.consulting-type .attrItem.active').attr('data-type'),
						iProduct_Id: id,
						cComment: cb.util.html2Escape(content)
					}
				};
				self.proxy.saveConsulting(param, function(err, result) {
					if (result) { //保存成功
						myApp.toast('发表咨询成功', 'success').show(true);
						setTimeout(function() {
							myApp.mainView.router.back();
						}, 1000)
					} else {
						myApp.toast(err.message, 'error').show(true);
					}
				});
			} else {
				myApp.toast('请输入咨询内容', 'tips').show(true);
			}
		});
	}
	view.prototype.init = function() {
		var self = this;
		var query = this.getQuery();
		var thisView = this.getView();
		var id = query.id;
		thisView.find('.attrItem').click(function() {
			$$(this).parent('.lsSpecItem').children('.attrItem').removeClass('active');
			$$(this).addClass('active');
		});
	};
	return view;
});