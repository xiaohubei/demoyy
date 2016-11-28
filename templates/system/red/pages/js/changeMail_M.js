cb.views.register('changeMailViewController', function (controllerName) {
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
		checkAuthCode:{
			url: 'member/Register/reset_checkAuthCode',
			method: 'POST',
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
		saveInformation: {
			url: 'member/Members/save',
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
		this_view.find('#SecurityCode').on('click',function(){
			self.getSecurityCode(this_view,query.cPhone);
		});			
		this_view.find('#img-verification').on('click',function(){
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
		});
		 //第一步的按钮点击事件
	    this_view.find('.button.step-one').on('click',function(){
	    	self.getStep1checkAuth(this_view);
	    });
	    this_view.find('.step-three').on('click',function(){
	    	self.getStep2checkAuth(this_view);
	    });
    };
   
	//获取手机验证码
	view.prototype.getSecurityCode = function(this_view,cPhone){
		var self = this;
		this.proxy.getAuthCode({'code':cPhone},function(err,data){
			
			self._set_data("Code",data);
			// 倒计时时间
            var wait = 60;
            
            self.countDown(this_view.find('#SecurityCode')[0], wait);
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
	view.prototype.getStep1checkAuth = function(this_view){
		var self =this;	
		var SmsNumber = this_view.find('#verifyName').val();
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
					this_view.find('.changeMail.step-one').hide();
                	this_view.find('.changeMail.step-two').show();
				}					
			})
		};    
	};
	view.prototype.getStep2checkAuth = function(this_view){
		var self = this;		
		var VerifyCode = this_view.find('#Mycaptcha').val();
		
		if (VerifyCode == '') {
			myApp.toast('图片校验码不能为空', 'tips').show(true);
			cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
			return;
		} else {
			this.proxy.checkVerify({
				'captcha': VerifyCode
			}, function(err, data) {
				if (data == false) {
					myApp.toast('验证码不正确', 'tips').show(true);
					cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
					return;
				} else {
					var informationData = self._get_data('informationData');
					informationData.cEmail = this_view.find("input[name='Myphone']").val();
					self.proxy.saveInformation({
						model: informationData
					}, function(err, data) {
						if (err) {
							myApp.toast(err.message, 'tips').show(true);
							cb.rest.loadImage(this_view.find('#img-verification'), '/client/ClientBaseMember/captcha');
							return;
						} 
						myApp.toast('恭喜，邮箱修改成功','success').show(true);
						myApp.mainView.router.back();						
					})
				}
			});
		}		
	};
	view.prototype.getInfoList = function() {
		var self = this;
		this.proxy.getMemberByToken({}, function(err, result) {
			if (result) {
				self._set_data("informationData", result);
			} else {
				myApp.toast(err.message, 'tips').show(true);
			}
		})
	};
    return view;
});