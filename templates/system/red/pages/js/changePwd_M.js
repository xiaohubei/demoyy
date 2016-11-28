cb.views.register('changePwdViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.userName = '';
	view.prototype.cPhone = '';
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getMemberByToken: {
			url: 'member/Members/getMemberByToken',
			method: 'GET',
			options: {
				token: true
			}
		},
		getAuthCode: {
			url: 'member/Register/modifypwd_getAuthCode',
			method: 'GET',
			options: {
				token: true
			}
		},
		updatePwd: {
			url: 'member/Register/modifyPassword',
			method: 'GET',
			options: {
				token: true
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
		cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
		this.getInfomation();
		this_view.find('#SecurityCode').on('click', function() {
			self.getSecurityCode(this_view);
		});
		this_view.find('#saveData').on('click', function() {
			self.savePwd(this_view);
		});
		this_view.find('#img-verification').on('click', function() {
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
		});
	};
	//获取个人相关信息
	view.prototype.getInfomation = function() {
			var self = this;
			this.proxy.getMemberByToken({}, function(err, result) {
				if (result) {
					self.userName = result.cUserName;
					self.cPhone = result.cPhone;
				} else {
					myApp.alert("获取我的信息失败" + err.message);
				}
			});
		}
		//获取手机验证码
	view.prototype.getSecurityCode = function(this_view) {
		var self = this;
		this.proxy.getAuthCode({
			'code': this.cPhone
		}, function(err, data) {
			// 倒计时时间
			self._set_data('verifyKeyRandom',data);
			var wait = 60;
			self.countDown($$('#SecurityCode')[0], wait);
		})
	};
	//等待手机验证码的过程
	view.prototype.countDown = function(obj, wait) {
			var self = this;
			if (wait == 0) {
				obj.removeAttribute("disabled");
				obj.value = "免费获取验证码";
				wait = 60;
			} else {
				obj.setAttribute("disabled", true);
				obj.value = "重新发送(" + wait + ")";
				wait--;
				setTimeout(function() {
						self.countDown(obj, wait)
					},
					1000)
			}

		}
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
			objData.captchaImag = this_view.find('#captcha').val();
			objData.verifyCode = this_view.find('#verifyName').val();
			return objData;
		}
		//各种校验成功之后保存密码
	view.prototype.checkVerifyCode = function(VerifyCode) {
			var self = this;
			var this_view = this.getView();
			this.proxy.checkVerify({
				'captcha': VerifyCode
			}, function(err, data) {
				if (data == false) {
					myApp.toast('图片验证码不正确', 'tips').show(true);
					cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
					return;
				} else {
					self.proxy.updatePwd({
							'validCode': self.collectionData(this_view).verifyCode,
							'password': self.collectionData(this_view).newpwd,
							'verifyKeyRandom':self._get_data('verifyKeyRandom')
						},
						function(err, data) {
							if (err) {
								myApp.toast(err.message,'error').show(true);
								cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
								return;
							} else {
								myApp.toast('密码修改成功！！','success').show(true);
								cb.route.redirectLoginPage({
			                        opened: function () {
			                            myApp.mainView.router.back();
			                        }
		                    	});
							}
						}
					)
				}
			});
		}
		//各种校验
	view.prototype.savePwd = function(this_view) {		
		if (this.collectionData(this_view).verifyCode == '') {
			myApp.toast('短信验证码不能为空', 'tips').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		}
		if (this.collectionData(this_view).newpwd == '') {
			myApp.toast('设置的密码不能为空', 'tips').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		}
		if(this.collectionData(this_view).newpwd.length < 6 ||this.collectionData(this_view).newpwd.length >32 ){
			myApp.toast('密码长度不能小于6位并且不能大于32位', 'tips').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		}
		if (!this.validatePassword(this.collectionData(this_view).newpwd, this.collectionData(this_view).confirmpwd)) {
			myApp.toast('两次密码不一致', 'tips').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		} else {
			this.checkVerifyCode(this.collectionData(this_view).captchaImag);
		}
	}

	return view;
});