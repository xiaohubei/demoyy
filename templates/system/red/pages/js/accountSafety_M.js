cb.views.register('safetyViewController', function(controllerName) {
	var view = function(widgets) {
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
	});
	view.prototype.init = function() {
		var self = this;
		var query = this.getQuery();
		var this_view = this.getView();
		this.getInfoList(this_view);
		$$(document).on('pageBack', '.page[data-page="bindMail"]', function () {
            self.getInfoList(this_view);
        });
        $$(document).on('pageBack', '.page[data-page="changeMail"]', function () {
            self.getInfoList(this_view);
        });
		this_view.find('.exit-button.btnLoginOut').on('click', function () {
		    var proxy = cb.rest.DynamicProxy.create(
                {
                    logout: { url: 'client/MemberLogin/logout', method: 'GET', options: { token: true } }
                });
		    	proxy.logout(function (err, result) {
		        if (err) {
		            myApp.toast(err.message, 'error').show(true);
		            return;
		        };
		        cb.util.localStorage.setItem('login_photo',self._get_data('informationData'));
		        //$$('#view-4').trigger('show');
		        cb.route.redirectLoginPage({
		            opened: function () {
		                myApp.mainView.router.back();
		            }
		        });
		    });
		});
	};
	//获取会员基本信息
	view.prototype.getInfoList = function(this_view) {
		var self = this;
		this.proxy.getMemberByToken({}, function(err, result) {
			if (result) {
			    var html = self.render(this_view.find('#tpl_infor').html(),result);
				this_view.find('.usesafeInfo-container').html(html);
				self.IshasMail(this_view, result);
				self._set_data("informationData", result.cPortrait);
			} else {
			    myApp.toast(err.message, 'error').show(true);
			}
		})
	};
	//根据是否有邮箱来判断来加载不同的页面
	view.prototype.IshasMail = function(this_view, result) {
		this_view.find('#mailCheck').on('click', function() {
			if (result.cEmail) {
				myApp.mainView.router.loadPage('member/changeMail?cPhone='+result.cPhone);
			} else {
				myApp.mainView.router.loadPage('member/bindMail?cPhone='+result.cPhone);
			}
		})

	}
	return view;
});