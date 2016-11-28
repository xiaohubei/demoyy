cb.views.register('changePhoneViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
		getMemberByToken:{
			url: 'member/Members/getMemberByToken',
			method: 'GET',
			options: {
				token: true
			}
		},
		getAuthCode:{
			url: 'member/Register/retset_getAuthCode',
			method: 'GET',
			options: {
				token: true
			}
		},
		getSecendAuthCode:{
			url: 'member/Register/changePhone_getAuthCode',
			method: 'GET',
			options: {
				token: true
			}
		},
		checkVerify:{
			url: 'client/ClientBaseMember/checkVerifyCode',
			method: 'POST',
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
		saveInformation: {
			url: 'member/Register/changePhone_Save',
			method: 'POST',
			options: {
				token: true
			}
		}
	});
    view.prototype.init = function () {
    	var self =this;
    	var query = this.getQuery();
		var this_view = this.getView();
		this.getInfoList();
		this_view.find('input[name="phone"]').val(query.cPhone);
		cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
		this_view.find('#SecurityCodeNew').on('click',function(){
			self.getSecurityNewCode(this_view);
		});
		this_view.find('#SecurityCodeOld').on('click',function(){
			self.getSecurityOldCode(this_view,query.cPhone);
		});	
		this_view.find('#img-verification').on('click',function(){
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
		});
		this_view.find(".button.step-one").on('click',function(){
			self.checkStepOneAuth(this_view,query.cPhone);
		});
		this_view.find(".finish").on('click',function(){
			self.checkStepTwoAuth(this_view,query.cPhone);
		});
    };
	//获取手机验证码
	view.prototype.getSecurityOldCode = function(this_view,cPhone){
		var self = this;
		this.proxy.getAuthCode({'code':cPhone},function(err,data){			
			self._set_data("Code",data);
			// 倒计时时间
            var wait = 60;           
            self.countDown($$('#SecurityCodeOld')[0], wait);
		})
	};
	//等待手机验证码的过程
	view.prototype.countDown = function(obj,wait){
		var self = this;
        if (wait == 0) {
            obj.removeAttribute("disabled");
            obj.value = "免费获取验证码";
            wait = 60;
        } else {
            obj.setAttribute("disabled", true);
            obj.value = "重新发送(" + wait + ")";
            wait--;
            setTimeout(function () {
                self.countDown(obj, wait)
            },
            1000)
        }
    
	};
	//校验验证码的正确性
	view.prototype.checkStepOneAuth = function(this_view,cPhone){
		var self = this;
		var SmsNumber = this_view.find('#verifyName').val()
		if(SmsNumber == ''){
			myApp.toast('短信验证码不能为空', 'tips').show(true);			
			return;
		}else{
			var numberCode =self._get_data('Code');
			this.proxy.checkAuthCode({'authCode':SmsNumber,"verifyRandomCode":numberCode},function(err,data){
				if(err){
					myApp.toast('短信验证码不正确', 'tips').show(true);
					return;
				}else{
					this_view.find('.changePhone.step-one').hide();
                	this_view.find('.changePhone.step-two').show();
				}					
			})		
		}		
	};
	//获取个人信息资源
    view.prototype.getInfoList = function() {
		var self = this;
		this.proxy.getMemberByToken({}, function(err, result) {
			if (result) {
				self._set_data("informationData",result);
			} else {
				myApp.toast(err.message, 'tips').show(true);
			}
		})
	};
	//校验验证码的正确性
	view.prototype.checkStepTwoAuth = function(this_view){
		var self = this;
		var VerifyCode = this_view.find('#Mycaptcha').val();
		var SmsNumber_new = this_view.find('#MyverifyName').val();
		if(SmsNumber_new == ''){
			myApp.toast('短信验证码不能为空', 'tips').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		}else{
			var numberNewCode =self._get_data('newCode');		
				if(VerifyCode == ''){
					myApp.toast('图片校验码不能为空', 'tips').show(true);
					cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
					return;
				}else{
					self.proxy.checkVerify({'captcha':VerifyCode},function(err,data){
						if(data == false){
							myApp.toast('验证码不正确', 'tips').show(true);
							cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
							return;
						}else{
							var informationData = self._get_data('informationData');
							informationData.cPhone = self._get_data('newPhone');							
							self.proxy.saveInformation({
								mid:self._get_data('informationData').id,
								validCode:SmsNumber_new,
								phoneNum:informationData.cPhone,
								verifyKeyRandom:numberNewCode
							},function(err,data){
								if(err){
									myApp.toast(err.message, 'tips').show(true);
									cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
									return;
								}
								myApp.toast('恭喜，手机号码修改成功','success').show(true);
								myApp.mainView.router.back();	
							})
						}
					});
				}		
		}
		
	};
	//获取手机验证码
	view.prototype.getSecurityNewCode = function(this_view){
		var self = this;
		var smsNumberInput = this_view.find("input[name='Myphone']").val();		
		this._set_data('newPhone',smsNumberInput);
		if(smsNumberInput == ''){
			myApp.toast('手机号码不能为空','tips').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		}else{
			this.proxy.getSecendAuthCode({'code':smsNumberInput},function(err,data){
						if(err){
							myApp.toast(err.message,'error').show(true);
							return;
						}else{
							self._set_data("newCode",data);
							// 倒计时时间
				            var wait = 60;           
				            self.countDown($$('#SecurityCodeNew')[0], wait);
						}						
					})
		}		
	};
    return view;
});