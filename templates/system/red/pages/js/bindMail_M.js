cb.views.register('bindMailViewController', function(controllerName) {
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
		},
		getAuthCode: {
			url: 'member/Register/retset_getAuthCode',
			method: 'GET',
			options: {
				token: true
			}
		},
		checkAuthCode:{
			url: 'member/Register/reset_checkAuthCode',
			method: 'POST',
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
		},
		savePhone: {
			url: 'member/Members/save',
			method: 'POST',
			options: {
				token: true
			}
		}
	});
	view.prototype.init = function() {
		var self = this;
		var query = this.getQuery();
		var this_view = this.getView();
		this.getInfoList();
		this_view.find("input[name='phone']").val(query.cPhone);
		cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
		this_view.find('#MySecurityCode').on('click', function() {
			self.getSecurityCode(this_view,query.cPhone);
		});
		this_view.find('#img-verification').on('click', function() {
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
		});
		this_view.find("#saveMail").on('click', function() {
			self.saveMailInfo(this_view);
		})
	};
	//获取个人信息资源
	view.prototype.getInfoList = function() {
		var self = this;
		this.proxy.getMemberByToken({}, function(err, result) {
			if (result) {
				self._set_data("informationData", result);
			} else {
				myApp.toast(err.message, 'error').show(true);
			}
		})
	};
	//获取手机验证码
	view.prototype.getSecurityCode = function(this_view,cPhone) {
		var self = this;		
		this.proxy.getAuthCode({
			'code': cPhone
		}, function(err, data) {
			self._set_data("Code", data);
			// 倒计时时间
			var wait = 60;
			self.countDown(this_view.find('#MySecurityCode')[0], wait);
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

	};
	//校验验证码的正确性
	view.prototype.saveMailInfo = function(this_view) {
		var self = this;
		var VerifyCode = this_view.find('#Mycaptcha').val();
		var SmsNumber = this_view.find('#MyverifyName').val();
		var Mail = this_view.find('input[name="Myphone"]').val();
		if(Mail == ''){
			myApp.toast('设置的邮箱不能为空', 'error').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		}		
		if (SmsNumber == '') {
			myApp.toast('短信验证码不能为空', 'error').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		}else {
			var numberCode =self._get_data('Code');
			self.proxy.checkAuthCode({'authCode':SmsNumber,"verifyRandomCode":numberCode},function(err,data){
				if(err){
					myApp.toast(err.message, 'tips').show(true);
					cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
					return;
				}else if (VerifyCode == '') {
					myApp.toast('图片校验码不能为空', 'error').show(true);
					cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
					return;
				} else {
				self.proxy.checkVerify({
					'captcha': VerifyCode
				}, function(err, data) {
					if (data == false) {
						myApp.toast('验证码不正确', 'error').show(true);
						cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
						return;
					} else {
						var informationData = self._get_data('informationData');
						informationData.cEmail = Mail;
						self.proxy.savePhone({
							model: informationData
						}, function(err, data) {
							if (err) {
								myApp.toast('绑定邮箱失败', 'error').show(true);
								return;
							} else {
								myApp.toast('恭喜，绑定邮箱成功', 'success').show(true);
								myApp.mainView.router.back();							
							}
						});
					}
				});
			}
		});
	};
	};
	return view;
});