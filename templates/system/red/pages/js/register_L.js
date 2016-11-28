cb.views.register('RegisterViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	var createCodes;
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.phoneIsAble = true;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		registerGetAuthCode: { url: 'member/Register/signUP_getAuthCode', method: 'POST', options: { token: true, mask: true } } 
	});
	view.prototype.init = function () {
		var self = this;
		// 生成验证码
		cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
		// 刷新验证码
		$("#refCode").click(function() {
			// 刷新验证码
			cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
		});
		// 获取短信验证码
		$("#getMessageAuthenticationCode").click(function() {
		    if (phoneVerification() && view.prototype.phoneIsAble) {
			    self.proxy.registerGetAuthCode({ 'phone': $('#mobile').val() }, function (err, result) {
			        if (err) {
			            alert(err.message);
			            return;
					} else {
						var sendMobileCodeBtn = document.getElementById("getMessageAuthenticationCode");
						sendMobileCodeBtn.disabled = false;
						// 倒计时时间
						var wait = 60;
						countDown(sendMobileCodeBtn, wait);
					}
				});
		    } else {
		        if (!view.prototype.phoneIsAble) {
		            $("#phoneVerification").attr("class", "font-red");
		            $("#phoneVerification").empty().append("手机号码已注册过");
		        }
				return;
			}
		});
		// 用户名验证
		$('#reg_user').blur(function(e) {
			if (!$('#reg_user').val()) {
				$("#validateReg_user").attr("class", "font-red");
				$("#validateReg_user").empty().append("本项必填");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {

				$("#validateReg_referees").removeClass("font-red")
				$("#validateReg_referees").empty().append("");
				//  验证名字
				var proxy = cb.rest.DynamicProxy.create({
					checkNamePhone: {
						url: 'member/Register/signUP_checkNamePhone',
						method: 'POST'
					}
				});
				proxy.checkNamePhone({
					'code': $('#reg_user').val()
				}, function(err, result) {
					if (err) {
						if (err.code == '999') {
							$("#validateReg_user").attr("class", "font-red");
							$("#validateReg_user").empty().append("用户名已存在");
							// 刷新验证码
							cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
						}
						return;
					} else {
						$("#validateReg_user").removeClass("font-red")
						$("#validateReg_user").empty().append("");
					}
				});


			}
		});
		// 密码验证
		$('#reg_passwd').blur(function(e) {
			if (!$('#reg_passwd').val()) {
				$("#validateReg_passwd").attr("class", "font-red");
				$("#validateReg_passwd").empty().append("本项必填");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {
			    if ($('#reg_passwd').val().length < 6 || $('#reg_passwd').val().length > 32) {
					$("#validateReg_passwd").attr("class", "font-red");
					$("#validateReg_passwd").empty().append("密码长度不能小于6位并且不能大于32位");
					// 刷新验证码
					cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
					return;
				} else {
					$("#validateReg_passwd").removeClass("font-red")
					$("#validateReg_passwd").empty().append("");
				}

			}
		});
		// 密码相同验证
		$('#reg_passwd_r').blur(function(e) {
			if (!$('#reg_passwd_r').val()) {
				$("#validateReg_passwd_rFirst").attr("class", "font-red");
				$("#validateReg_passwd_rFirst").empty().append("本项必填");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {
				$("#validateReg_passwd_rFirst").removeClass("font-red")
				$("#validateReg_passwd_rFirst").empty().append("");
			}
			if (!validatePassword()) {
				$("#validateReg_passwd_rFirst").attr("class", "font-red");
				$("#validateReg_passwd_rFirst").empty().append("两次密码不一致");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {
				$("#validateReg_passwd_rFirst").removeClass("font-red")
				$("#validateReg_passwd_rFirst").empty().append("");
			}
		});
	    /*// 推荐人验证
		$('#referees').blur(function (e) {
		    if ($('#referees').val()) {
		        //  验证名字
		        var proxy = cb.rest.DynamicProxy.create({
		            checkNamePhone: {
		                url: 'member/Register/signUP_checkNamePhone',
		                method: 'POST'
		            }
		        });
		        proxy.checkNamePhone({
		            'code': $('#reg_user').val(),
		            recommend: $('#referees').val()
		        }, function (err, result) {
		            if (err) {
		                if (err.code == '999') {
		                    if (err.message == '推荐人不存在！') {
		                        $('#validateReg_referees').attr("class", "font-red");
		                        $('#validateReg_referees').empty().append(err.message);
		                    } 
		                    // 刷新验证码
		                    cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
		                }
		                return;
		            } else {
		                $("#validateReg_referees").removeClass("font-red")
		                $("#validateReg_referees").empty().append("");
		            }
		        });
		    }
		});*/
		// 手机号验证
		$('#mobile').blur(function(e) {
			var isPhone = phoneVerification();
			if (isPhone) {
				$("#validateReg_referees").removeClass("font-red")
				$("#validateReg_referees").empty().append("");
				//  验证手机是否注册
				var proxy = cb.rest.DynamicProxy.create({
					checkNamePhone: {
						url: 'member/Register/signUP_checkNamePhone',
						method: 'POST'
					}
				});
				proxy.checkNamePhone({
					'code': $('#mobile').val()
				}, function(err, result) {
					if (err) {
						if (err.code == '999') {
							$("#phoneVerification").attr("class", "font-red");
							$("#phoneVerification").empty().append("手机号码已注册过");
							// 刷新验证码
							cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
							view.prototype.phoneIsAble = false;
						}
						return;
					} else {
						$("#phoneVerification").removeClass("font-red")
						$("#phoneVerification").empty().append("");
						view.prototype.phoneIsAble = true;
					}
				});


			} else {
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			}
		});
		// 注册按钮
		$("#submit-btn").click(function () {
			// 用户名验证
			if (!$('#reg_user').val()) {
				$("#validateReg_user").attr("class", "font-red");
				$("#validateReg_user").empty().append("本项必填");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {
				//  验证名字
			    var proxy = cb.rest.DynamicProxy.create({checkNamePhone: {url: 'member/Register/signUP_checkNamePhone', method: 'POST'}});
				proxy.checkNamePhone({'code': $('#reg_user').val(),recommend: $('#referees').val()}, function(err, result) {
					if (err) {
						if (err.code == '999') {
							if ($('#referees').val() && err.message == '推荐人不存在！') {
								$('#validateReg_referees').attr("class", "font-red");
								$('#validateReg_referees').empty().append(err.message);
							} else {
								$("#validateReg_user").attr("class", "font-red");
								$("#validateReg_user").empty().append("用户名已存在");
							}

							// 刷新验证码
							cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
						}
						return;
					} else {
						$("#validateReg_user").removeClass("font-red")
						$("#validateReg_user").empty().append("");
					}
				});
			}
			// 密码验证
			if (!$('#reg_passwd').val()) {
				$("#validateReg_passwd").attr("class", "font-red");
				$("#validateReg_passwd").empty().append("本项必填");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {
				$("#validateReg_passwd").removeClass("font-red")
				$("#validateReg_passwd").empty().append("");
			}
			// 密码相同认证
			if (!$('#reg_passwd_r').val()) {
				$("#validateReg_passwd_rFirst").attr("class", "font-red");
				$("#validateReg_passwd_rFirst").empty().append("本项必填");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {
				$("#validateReg_passwd_rFirst").removeClass("font-red")
				$("#validateReg_passwd_rFirst").empty().append("");
			}
			if (!validatePassword()) {
				$("#validateReg_passwd_rFirst").attr("class", "font-red");
				$("#validateReg_passwd_rFirst").empty().append("两次密码不一致");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			} else {
				$("#validateReg_passwd_rFirst").removeClass("font-red")
				$("#validateReg_passwd_rFirst").empty().append("");
			}
			// 手机号验证
			var isPhone = phoneVerification();
			// 验证码验证
			if (!$('#iptsingup').val()) {
				$("#validateCode").attr("class", "font-red");
				$("#validateCode").empty().append("输入验证码");
				// 刷新验证码
				cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
				return;
			}
			// 检查短信验证码
			var proxy = cb.rest.DynamicProxy.create({checkAuthCode: {url: 'member/Register/signUP_checkAuthCode',method: 'POST'}});
			proxy.checkAuthCode({ 'authCode': $('#messageAuthenticationCode').val() }, function (err, result) {
			    debugger;
				if (!$('#messageAuthenticationCode').val()) {
					alert('短信验证码不能为空');
					cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
					return;
				}
				if (err) {
					alert("短信"+err.message);
					// 刷新验证码
					cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
					return;
				} else {
					//  验证名字
					var proxy = cb.rest.DynamicProxy.create({checkNamePhone: {url: 'member/Register/signUP_checkNamePhone',method: 'POST'}});
					proxy.checkNamePhone({ 'code': $('#reg_user').val(), recommend: $('#referees').val() },
                        function (checkNameErr, checkNameResult) {
						if (checkNameErr) {
							alert("用户名已存在");
							// 刷新验证码
							cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
							return;
						} else {
							if (isPhone) {
								//  验证手机
								var proxy = cb.rest.DynamicProxy.create({checkNamePhone: {url: 'member/Register/signUP_checkNamePhone',method: 'POST'}});
								proxy.checkNamePhone({'code': $('#mobile').val(),recommend: $('#referees').val()}, function(phoneErr, phoneResult) {
									if (phoneErr) {
										if (phoneErr.code == '999') {
											if ($('#referees').val() && err.message == '推荐人不存在！') {
												$('#validateReg_referees').attr("class", "font-red");
												$('#validateReg_referees').empty().append(err.message);
											} else {
												$("#phoneVerification").attr("class", "font-red");
												$("#phoneVerification").empty().append("手机已经注册过");
											}

											// 刷新验证码
											cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
										}
										return;
									} else {
										$("#phoneVerification").removeClass("font-red")
										$("#phoneVerification").empty().append("");
										// 检查图片验证码
										var proxy = cb.rest.DynamicProxy.create({checkVerifyCode: {url: 'client/ClientBaseMember/checkVerifyCode',method: 'POST'}});
										proxy.checkVerifyCode({captcha: $('#iptsingup').val()}, function(checkVerifyCodEerr, checkVerifyCodeResult) {
											if (checkVerifyCodEerr) {
												alert("图片"+checkVerifyCodEerr.message);
												// 刷新验证码
												cb.rest.loadImage($('#code'), 'client/ClientBaseMember/captcha');
												return;
											} else {
												if (!checkVerifyCodeResult) {
													$("#validateCode").attr("class", "font-red");
													$("#validateCode").empty().append("验证码错误");
													// 刷新验证码
													cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
													return;
												} else {
													$("#validateCode").removeClass("font-red")
													$("#validateCode").empty().append("");
													var inviteCode = cb.rest.AppContext.inviteCode;
													var promotCode = cb.rest.AppContext.promotCode;
													debugger;
													var proxy = cb.rest.DynamicProxy.create({register: {url: 'member/Register/singUp',method: 'POST'}});
													proxy.register({
														'userName': $('#reg_user').val(),
														'phone': $('#mobile').val(),
														'password': $('#reg_passwd').val(),
														'authCode': $('#messageAuthenticationCode').val(),
														'promotionCode': inviteCode,
														'promotingSetCode': promotCode,
														'recommend': $('#referees').val()
													}, function (registerErr, registerResult) {
														console.log($('#referees').val());
														if (registerErr) {
															alert('注册失败' + registerErr.message);
															// 刷新验证码
															cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
															return;
														} else {
														    var proxy = cb.rest.DynamicProxy.create({ login: { url: 'client/MemberLogin/authenticate', method: 'POST' } });
														    proxy.login({ username: $('#reg_user').val(), password: $('#reg_passwd').val(), captcha: $('#iptsingup').val() }, function (loginerr, loginresult) {
														        if (loginerr) {
														            alert(loginerr.message);
														            return;
														        } else {
														            //localStorage.setItem('userData', cb.data.JsonSerializer.serialize(result));
														            // 我的积分
														            if (!loginresult.iPoints) {
														                cb.rest.AppContext.iPoints = 0;
														                cb.data.CookieParser.setCookie('iPoints', 0);
														            } else {
														                cb.rest.AppContext.iPoints = loginresult.iPoints;
														                cb.data.CookieParser.setCookie('iPoints', loginresult.iPoints);
														            }
														            cb.data.CookieParser.setCookie('cUserName', loginresult.cUserName);
														            cb.data.CookieParser.setCookie('token', loginresult.token);
														            location.href = "home";
														        }

														    });
														    
														   
															
														}
													});
												}
											}

										});
									}
								});
							} else {
								// 刷新验证码
								cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
								return;
							}


						}
					});
				}
			});

		});
	    // 协议同意按钮
		$("input[type='checkbox'][name=license]").click(function () {
		    if ($("input[type='checkbox'][name=license]").is(':checked')) {
		        $("#submit-btn").removeAttr("disabled");
		    } else {
		        $("#submit-btn").prop("disabled", 'true');
		    }
		});

	};
	// 判断密码是否一致
	var validatePassword = function() {
			var passwd_re = $('#reg_passwd').val();
			var passwd = $('#reg_passwd_r').val();
			if (passwd_re.toLowerCase() != passwd.toLowerCase()) {
				return false;
			} else {
				return true;
			}
		}
	// 手机验证
	var phoneVerification = function() {
			var phoneVerificationFlag = false;
			if (!$('#mobile').val()) {
				$("#phoneVerification").attr("class", "font-red");
				$("#phoneVerification").empty().append("本项必填");
			} else {
				if (/^1\d{10}$/g.test($('#mobile').val())) {
					$("#phoneVerification").removeClass("font-red");
					$("#phoneVerification").empty().append("");
					phoneVerificationFlag = true;
				} else {
					$("#phoneVerification").attr("class", "font-red");
					$("#phoneVerification").empty().append("手机号码长度为11位");
				}

			}
			return phoneVerificationFlag;
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