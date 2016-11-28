cb.views.register('MessageSettingController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getData: {
			url: 'client/Bulletins/getMessageTypeList',
			method: 'GET',
			options: {
				token: true
			}
		},
		saveData: {
			url: 'client/Bulletins/updateDifBulletins',
			method: 'POST',
			options: {
				token: true
			}
		}
	});
	
	view.prototype.init = function() {
		var self = this;
		var thisView = this.getView();
		this.proxy.getData({}, function(err, result) {
			if (result) {
			    var html = this.render(thisView.find('#messageSettingTpl').html(), {
					data: result
				});
				thisView.find('form').html(html);
				this.resister(thisView);
			} else {
				myApp.toast(err.message, 'error').show(true);
			}
		}, this);
	}
	view.prototype.resister = function(thisView) {
		var self=this;
		thisView.find('.label-switch .checkbox').on('click', function() {
			var isCheck = (!$$(this).prev('input').prop('checked'));
			var param = [{
				id:$$(this).attr('data-id'),
				isUsed:isCheck,
				type:$$(this).attr('data-type')
			}];
			self.proxy.saveData({ subMessageTypes: param }, function (err, result) {
				if (result) {}else{
					myApp.toast(err.message, 'error').show(true);
				}
			}, this);
		});
	}
	return view;
});