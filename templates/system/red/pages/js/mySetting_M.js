cb.views.register('mySettingController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
    	getMemberByToken: {
			url: 'member/Members/getMemberByToken',
			method: 'GET',
			options: {
				token: true
			}
		}
    })
    view.prototype.init = function (views) {
    	var self = this;
        var thisView = this.getView();
        this.proxy.getMemberByToken({}, function(err, result) {
			if (result) {
				self._set_data("informationData", result.cPortrait);
			} else {
				myApp.toast("获取我的信息失败" + err.message,'error').show(true);
			}
		})
        thisView.find('.exit-button.btnLoginOut').on('click', function () {
            var proxy = cb.rest.DynamicProxy.create(
                {
                    logout: { url: 'client/MemberLogin/logout', method: 'GET', options: { token: true } }
                });
            proxy.logout(function (err, result) {
                if (err) {
                    myApp.toast(err, 'error').show(true);
                    return;
                }
                cb.util.localStorage.setItem('login_photo',self._get_data('informationData'));
                cb.route.redirectLoginPage();
            });
        });
    };
    return view;
});