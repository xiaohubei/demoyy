cb.views.register('ForgetPasswordViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	// 获取短信验证码传回来的校验码
	view.prototype.getMessagereturnCode = "";
	view.prototype.getMessagereturnCode1 = "";
	view.prototype.getMessagereturnCode2 = "";
	view.prototype.init = function () {
	    var self = this;
		var queryString = new cb.util.queryString();
		var userName = queryString.get("userName") || "";
		$("#username").val(userName);
		// 获取验证码
		cb.rest.loadImage($('#valCode'), 'client/ClientBaseMember/captcha');
		// 刷新验证码
		$(".refCode").click(function() {
			cb.rest.loadImage($('#valCode'), 'client/ClientBaseMember/captcha');
		});
		// 提交按钮1
		$("#forget_password_btn_step1").click(function() {
			// 用户名验证
			if (!$('#username').val()) {
				$("#validateuserName").attr("class", "font-red");
				$("#validateuserName").empty().append("本项必填");
				// 刷新验证码
				cb.rest.loadImage($('#valCode'), 'client/ClientBaseMember/captcha');
				return;
			}
			// 验证码
			if (!$('#valAuthCode').val()) {
				$("#validateCode").attr("class", "font-red");
				$("#validateCode").empty().append("输入验证码");
				cb.rest.loadImage($('#valCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {
			   
			    var proxy = cb.rest.DynamicProxy.create({ retset_checkUserName: { url: 'member/Register/retset_checkUserName', method: 'POST' } });
			    proxy.retset_checkUserName({ 'username': $('#username').val(), 'captcha': $('#valAuthCode').val() }, function (valErr, valResult) {
			        if (valErr) {
			            if (valErr.message == "没有找到会员！") {
			                $("#validateuserName").attr("class", "font-red");
			                $("#validateuserName").empty().append(valErr.message);
			                $("#validateCode").removeClass("font-red")
			                $("#validateCode").empty().append("");
			            } else if (valErr.message == "验证码不正确！") {
			                $("#validateCode").attr("class", "font-red");
			                $("#validateCode").empty().append(valErr.message);
			            } else {
			                alert(valErr.message);
			            }
			            cb.rest.loadImage($('#valCode'), 'client/ClientBaseMember/captcha');
			        } else {
			            $("#validateCode").removeClass("font-red")
			            $("#validateCode").empty().append("");
			            $("#validateuserName").removeClass("font-red")
			            $("#validateuserName").empty().append("");
			            $(".forget_password_step1").hide();
			            $(".forget_password_step2").show();
			            $('#step2_userName').empty().append(valResult.cPhone);

			        }
			    });
			}
		});
		// 提交按钮2
		$("#forget_password_btn_step2").click(function() {
			if ($('#messageValCode').val() == '') {
				alert("请输入手机验证码");
				return;
			} else {
			    var proxy = cb.rest.DynamicProxy.create({ checkAuthCode: { url: 'member/Register/reset_checkAuthCode', method: 'POST', options: { token: true, mask: true } } });
			    proxy.checkAuthCode({ 'authCode': $('#messageValCode').val(), 'verifyRandomCode': self.getMessagereturnCode }, function (err, result) {
			        if (err) {
			            alert(err.message);
			            return;
			        } else {
			            self.getMessagereturnCode1 = result.verifyRandomCode;
			            self.getMessagereturnCode2 = result.authRandomCode;
			            	$(".forget_password_step1").hide();
			            	$(".forget_password_step2").hide();
			            	$(".forget_password_step3").show();
			            	$("#forget_pwd_name").val($("#username").val());
			        }
			    });
			}
		});
		// 提交按钮3
		$("#forget_password_btn_step3").click(function() {						
			if(!$('#password').val()){
        		$("#validateReg_passwd").attr("class", "error-messages");
                $("#validateReg_passwd").empty().append("本项必填");
                return;
        	}else {
			    if ($('#password').val().length < 6 || $('#password').val().length > 32) {
        			$("#validateReg_passwd").attr("class", "error-messages");
        			$("#validateReg_passwd").empty().append("密码长度不能小于6位并且不能大于32位");
                	return;
        		}else{
        			$("#validateReg_passwd").removeClass("error-messages")
                	$("#validateReg_passwd").empty().append("");
        		}               
            }
			if (!$('#repassword').val()) {
                $("#validateReg_passwd_rFirst").attr("class", "error-messages");
                $("#validateReg_passwd_rFirst").empty().append("本项必填");
                return;
            } else {
                $("#validateReg_passwd_rFirst").removeClass("error-messages")
                $("#validateReg_passwd_rFirst").empty().append("");
            }
            if (!validatePassword()) {
                $("#validateReg_passwd_rFirst").attr("class", "error-messages");
                $("#validateReg_passwd_rFirst").empty().append("两次密码不一致");
                return;
            } else {
                $("#validateReg_passwd_rFirst").removeClass("error-messages")
                $("#validateReg_passwd_rFirst").empty().append("");
            }
			var proxy = cb.rest.DynamicProxy.create({resetSetPassword: {url: 'member/Register/reset_setPassword',method: 'POST'}});
			proxy.resetSetPassword({'authRandomCode': self.getMessagereturnCode2,'password': $('#password').val(),'verifyRandomCode': self.getMessagereturnCode1}, function (err, result) {
				if (err) {
				    alert(err.message);
					return;
				} else {
					$(".forget_password_step1").hide();
					$(".forget_password_step2").hide();
					$(".forget_password_step3").hide();
					$(".forget_password_step4").show();
				}
			});
		});
		// 获取手机校验码
		$("#sendMobileCode").click(function() {
			var proxy = cb.rest.DynamicProxy.create({retsetGetAuthCode1: {url: 'member/Register/retset_getAuthCode',method: 'POST',options: {token: true,mask:true}}});
			proxy.retsetGetAuthCode1({ 'code': $('#username').val() }, function (err, result) {
			    if (err) {
					alert(err.message);
					return;
				} else {
			        self.getMessagereturnCode = result;
					var sendMobileCodeBtn = document.getElementById("sendMobileCode");
					sendMobileCodeBtn.disabled = false;
					// 倒计时时间
					var wait = 60;
					countDown(sendMobileCodeBtn, wait);
				}
			});
		});
	};
	// 判断密码是否一致
    var validatePassword = function () {
        var passwd_re = $('#repassword').val();
        var passwd = $('#password').val();
        if (passwd_re.toLowerCase() != passwd.toLowerCase()) {
            return false;
        } else {
            return true;
        }
    }
	// 生成验证码
	var createCode = function() {
			// 生成验证码
			cb.rest.loadImage($('#valCode'), 'client/ClientBaseMember/captcha');
		}
		// 倒计时
	var countDown = function(o, wait) {
		if (wait == 0) {
			o.removeAttribute("disabled");
			o.value = "免费获取验证码";
			wait = 60;
		} else {
			o.setAttribute("disabled", true);
			o.value = "重新发送(" + wait + ")";
			wait--;
			setTimeout(function() {
					countDown(o, wait)
				},
				1000)
		}
	}
	return view;
});