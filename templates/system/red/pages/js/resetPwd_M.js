cb.views.register('resetPwdViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.userName = '';
	view.prototype.cPhone = '';
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getAuthCode: {
			url: 'member/Register/retset_getAuthCode',
			method: 'GET',
			options: {
				token: true
			}
		},
		updatePwd: {
			url: 'member/Register/reset_setPassword',
			method: 'GET',
			options: {
				token: false
			}
		},
		checkVerify: {
			url: 'client/ClientBaseMember/checkVerifyCode',
			method: 'POST',
			options: {
				token: true
			}
		}
	});
	view.prototype.init = function() {
		var query = this.getQuery();
		var self = this;
		var this_view = this.getView();
		this_view.find('input[name="username"]').val(query.userName);
		this_view.find('#saveData').on('click', function() {
			self.savePwd(this_view, query.userName, query.smsnumber);
		});
	};
	//判断两次输入的密码是否一致
	view.prototype.validatePassword = function(newPwd, confirmPwd) {
		if (newPwd.toLowerCase() != confirmPwd.toLowerCase()) {
			return false;
		} else {
			return true;
		}
	}

	//收集相关密码数据
	view.prototype.collectionData = function(this_view) {
			var objData = {};
			objData.newpwd = this_view.find('#newPwd').val();
			objData.confirmpwd = this_view.find('#renewPwd').val();
			objData.verifyName = this_view.find('#captcha').val();
			return objData;
		}
		//各种校验
	view.prototype.savePwd = function(this_view, username, smsnumber) {
		var self = this;
		if (this.collectionData(this_view).newpwd == '') {
			myApp.toast('设置的密码不能为空', 'tips').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		}
		if (!this.validatePassword(this.collectionData(this_view).newpwd, this.collectionData(this_view).confirmpwd)) {
			myApp.toast('两次密码不一致!', 'tips').show(true);
			return;
		}
		self.proxy.updatePwd({
				'code': username,
				'password': self.collectionData(this_view).newpwd,
				'authCode': smsnumber
			},
			function(err, data) {
				if (err) {
					myApp.toast(err.message, 'error').show(true);
					return;
				} else {
					myApp.alert('恭喜，密码修改成功', '',function(){
					    cb.route.redirectLoginPage();
					});
				}
			}
		)
	}

	return view;
});