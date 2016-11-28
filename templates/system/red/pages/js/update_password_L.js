cb.views.register('UpdatePasswordViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    // 短信验证码
    view.prototype.messageCode = 1;
    // 获取短信验证码传回来的校验码
    view.prototype.getMessagereturnCode = "";
    view.prototype.getMessagereturnCode1 = "";
    view.prototype.getMessagereturnCode2 = "";
    view.prototype.init = function () {
        var self = this;
        // 会员信息
        var model = {};
        var queryString = new cb.util.queryString();
        var valType = queryString.get("valType");
        //var cPhone = queryString.get("cPhone") || "";
        var cPhone = "";
        var memberId = "";
        var proxy = cb.rest.DynamicProxy.create({ getMemberByToken: { url: 'member/Members/getMemberByToken', method: 'POST', options: { token: true } } });
        // 加载个人信息
        proxy.getMemberByToken({}, function (err, result) {
            if (err) {
                alert("获取个人信息失败" + err.message);
                return;
            } else {
                cPhone = result.cPhone;
                memberId = result.id;
                // 修改密码
                if (valType == 1) {
                    $("#update_pwd_step1").show();
                    $("#update_pwd_step2").hide();
                    $("#update_pwd_step3").hide();
                    $("#val_mail_step1").hide();
                    $("#val_mail_step2").hide();
                    $("#val_mail_step3").hide();
                    $("#val_phone_step1").hide();
                    $("#val_phone_step2").hide();
                    $("#val_phone_step3").hide();
                    $("#updatePasswordPhoneNum1").empty().append(cPhone);
                    // 生成验证码
                    cb.rest.loadImage($('#valCode0'), '/client/ClientBaseMember/captcha');
                } else if (valType == 2) { // 修改邮箱
                    $("#update_pwd_step1").hide();
                    $("#update_pwd_step2").hide();
                    $("#update_pwd_step3").hide();
                    $("#val_mail_step1").show();
                    $("#val_mail_step2").hide();
                    $("#val_mail_step3").hide();
                    $("#val_phone_step1").hide();
                    $("#val_phone_step2").hide();
                    $("#val_phone_step3").hide();
                    $("#mailMobileSpan1").empty().append(cPhone);
                    cb.rest.loadImage($('#mailCode0'), '/client/ClientBaseMember/captcha');
                } else if (valType == 3) {// 修改手机 
                    $("#update_pwd_step1").hide();
                    $("#update_pwd_step2").hide();
                    $("#update_pwd_step3").hide();
                    $("#val_mail_step1").hide();
                    $("#val_mail_step2").hide();
                    $("#val_mail_step3").hide();
                    $("#val_phone_step1").show();
                    $("#val_phone_step2").hide();
                    $("#val_phone_step3").hide();
                    $("#valMobilePhoneNum1").empty().append(cPhone);
                    //cb.rest.loadImage($('#valMobileValCode1'), '/client/ClientBaseMember/captcha');
                } else {

                }
            }

        });

        // 刷新验证码
        $(".refCode").click(function () {
            cb.rest.loadImage($('#valCode0'), '/client/ClientBaseMember/captcha');
        });
        // 刷新验证码
        $(".refCode1").click(function () {
            cb.rest.loadImage($('#valCode1'), '/client/ClientBaseMember/captcha');
        });
        //// 刷新验证码
        //$(".valMobileRefCode1").click(function () {
        //    cb.rest.loadImage($('#valMobileValCode1'), '/client/ClientBaseMember/captcha');
        //});
        // 刷新验证码
        $(".valPhoneRefCode2").click(function () {
            cb.rest.loadImage($('#valMobileValCode2'), '/client/ClientBaseMember/captcha');
        });
        // 刷新验证码
        $(".mailRefCode").click(function () {
            cb.rest.loadImage($('#mailCode0'), '/client/ClientBaseMember/captcha');
        });
        // 刷新验证码
        $(".mailRefCode1").click(function () {
            cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
        });
        // 修改密码第一步获取短信验证码
        $("#sendMobileCode").click(function () {
            var proxy = cb.rest.DynamicProxy.create({
                retsetGetAuthCode: {
                    url: 'member/Register/retset_getAuthCode', method: 'GET', options: {
                        token: true,
                        mask: true
                    }
                }
            });
            if (valType != 1 && valType != 2 && valType != 3) {
                cPhone = $("#updatePasswordPhoneNum1").text();
            }
            proxy.retsetGetAuthCode({ 'code': cPhone }, function (err, result) {
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
        // 修改密码提交按钮1
        $(".update_password_btn_step1").click(function () {
            // 验证码
            if (!$('#valAuthCode').val()) {
                $("#validateCode").attr("class", "error-messages");
                $("#validateCode").empty().append("输入验证码");
                cb.rest.loadImage($('#valCode0'), '/client/ClientBaseMember/captcha');
                return;
            }
            // 图片验证码
            var proxy = cb.rest.DynamicProxy.create({ checkVerifyCode: { url: 'client/ClientBaseMember/checkVerifyCode', method: 'POST' } });
            proxy.checkVerifyCode({ captcha: $('#valAuthCode').val() }, function (checkVerifyCodEerr, checkVerifyCodeResult) {
                if (checkVerifyCodEerr) {
                    alert(checkVerifyCodEerr.message);
                    // 刷新验证码
                    cb.rest.loadImage($('#valCode0'), '/client/ClientBaseMember/captcha');
                    return;
                } else {
                    if (!checkVerifyCodeResult) {
                        $("#validateCode").attr("class", "error-messages");
                        $("#validateCode").empty().append("验证码错误");
                        // 刷新验证码
                        cb.rest.loadImage($('#valCode0'), '/client/ClientBaseMember/captcha');
                        return;
                    } else {
                        $("#validateCode").removeClass("class", "error-messages");
                        $("#validateCode").empty().append("");
                        var proxy = cb.rest.DynamicProxy.create({ checkAuthCode: { url: 'member/Register/reset_checkAuthCode', method: 'POST', options: { token: true, mask: true } } });
                        proxy.checkAuthCode({ 'authCode': $('#messageCode').val(), 'verifyRandomCode': self.getMessagereturnCode }, function (err, result) {
                            if (err) {
                                // 刷新验证码
                                cb.rest.loadImage($('#valCode0'), '/client/ClientBaseMember/captcha');
                                alert("短信验证码不正确");
                                return;
                            } else {
                                self.getMessagereturnCode1 = result.verifyRandomCode;
                                self.getMessagereturnCode2 = result.authRandomCode;
                                $("#update_pwd_step1").hide();
                                $("#update_pwd_step2").show();
                                $("#update_pwd_step3").hide();
                                $("#val_mail_step1").hide();
                                $("#val_mail_step2").hide();
                                $("#val_mail_step3").hide();
                                $("#val_phone_step1").hide();
                                $("#val_phone_step2").hide();
                                $("#val_phone_step3").hide();
                                // 刷新验证码
                                cb.rest.loadImage($('#valCode1'), '/client/ClientBaseMember/captcha');
                            }
                        });
                    }
                }
            });


        });
        // 修改密码提交按钮2
        $(".update_password_btn_step2").click(function () {
            if (!$('#password').val()) {
                $("#validateReg_passwd").attr("class", "error-messages");
                $("#validateReg_passwd").empty().append("本项必填");
                // 刷新验证码
                cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
                return;
            } else {
                $("#validateReg_passwd").removeClass("error-messages")
                $("#validateReg_passwd").empty().append("");
            }
            if ($('#password').val().length > 32 || $('#password').val().length < 6) {
                $("#validateReg_passwd").attr("class", "error-messages");
                $("#validateReg_passwd").empty().append("密码长度不能小于6位并且不能大于32位");
                // 刷新验证码
                cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
                return;
            } else {
                $("#validateReg_passwd").removeClass("error-messages")
                $("#validateReg_passwd").empty().append("");
            }
            if (!$('#rePassword').val()) {
                $("#validateReg_passwd_rFirst").attr("class", "error-messages");
                $("#validateReg_passwd_rFirst").empty().append("本项必填");
                // 刷新验证码
                cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
                return;
            } else {
                $("#validateReg_passwd_rFirst").removeClass("error-messages")
                $("#validateReg_passwd_rFirst").empty().append("");
            }
            if (!validatePassword()) {
                $("#validateReg_passwd_rFirst").attr("class", "error-messages");
                $("#validateReg_passwd_rFirst").empty().append("两次密码不一致");
                // 刷新验证码
                cb.rest.loadImage($('#registerValCode'), 'client/ClientBaseMember/captcha');
                return;
            } else {
                $("#validateReg_passwd_rFirst").removeClass("error-messages")
                $("#validateReg_passwd_rFirst").empty().append("");
            }
            if (!$('#valAuthCode1').val()) {
                $("#validateCode1").attr("class", "error-messages");
                $("#validateCode1").empty().append("输入验证码");
                cb.rest.loadImage($('#valCode1'), '/client/ClientBaseMember/captcha');
                return;
            }
            // 图片验证码
            var proxy = cb.rest.DynamicProxy.create({ checkVerifyCode: { url: 'client/ClientBaseMember/checkVerifyCode', method: 'POST' } });
            proxy.checkVerifyCode({ captcha: $('#valAuthCode1').val() }, function (checkVerifyCodEerr, checkVerifyCodeResult) {
                if (checkVerifyCodEerr) {
                    alert(checkVerifyCodEerr.message);
                    // 刷新验证码
                    cb.rest.loadImage($('#valCode1'), '/client/ClientBaseMember/captcha');
                    return;
                } else {
                    if (!checkVerifyCodeResult) {
                        $("#validateCode1").attr("class", "error-messages");
                        $("#validateCode1").empty().append("验证码错误");
                        // 刷新验证码
                        cb.rest.loadImage($('#valCode1'), '/client/ClientBaseMember/captcha');
                        return;
                    } else {
                        $("#validateCode1").removeClass("class", "error-messages");
                        $("#validateCode1").empty().append("");

                        // 获得个人信息
                        var proxy = cb.rest.DynamicProxy.create({ getMemberByToken: { url: 'member/Members/getMemberByToken', method: 'POST', options: { token: true } } });
                        proxy.getMemberByToken({}, function (err, result1) {
                            if (err) {
                                alert("获取个人信息失败" + err.message);
                            } else {
                                var proxy = cb.rest.DynamicProxy.create({ resetSetPassword: { url: 'member/Register/reset_setPassword', method: 'POST' } });
                                proxy.resetSetPassword({ 'authRandomCode': self.getMessagereturnCode2, 'password': $('#password').val(), 'verifyRandomCode': self.getMessagereturnCode1 }, function (err, result) {
                                    if (err) {
                                        alert(err.message);
                                        return;
                                    } else {
                                        $("#update_pwd_step1").hide();
                                        $("#update_pwd_step2").hide();
                                        $("#update_pwd_step3").show();
                                        $("#val_mail_step1").hide();
                                        $("#val_mail_step2").hide();
                                        $("#val_mail_step3").hide();
                                        $("#val_phone_step1").hide();
                                        $("#val_phone_step2").hide();
                                        $("#val_phone_step3").hide();
                                    }
                                });


                            }

                        });

                    }
                }
            });


        });
        // 手机安全中心认证第一步 获取手机短信验证码
        $("#valMobileSendMobileCode1").click(function () {
            var proxy = cb.rest.DynamicProxy.create({
                retsetGetAuthCode: {
                    url: 'member/Register/retset_getAuthCode', method: 'GET', options: {
                        token: true,
                        mask: true
                    }
                }
            });
            proxy.retsetGetAuthCode({ 'code': cPhone }, function (err, result) {
                if (err) {
                    alert('获取失败: ' + err.message);
                    return;
                } else {
                    self.getMessagereturnCode = result;
                    var sendMobileCodeBtn = document.getElementById("valMobileSendMobileCode1");
                    sendMobileCodeBtn.disabled = false;
                    // 倒计时时间
                    var wait = 60;
                    countDown(sendMobileCodeBtn, wait);
                }
            });
        });
        // 手机安全中心认证第一步 提交
        $(".val_phone_Btn_step1").click(function () {
            //// 验证码
            //if (!$('#valMobileValAuthCode1').val()) {
            //    $("#phoneValidateCode1").attr("class", "error-messages");
            //    $("#phoneValidateCode1").empty().append("输入验证码");
            //   cb.rest.loadImage($('#valMobileValCode1'), '/client/ClientBaseMember/captcha');
            //    return;
            //}
            // 图片验证码
            //var proxy = cb.rest.DynamicProxy.create({ checkVerifyCode: { url: 'client/ClientBaseMember/checkVerifyCode', method: 'POST' } });
            //proxy.checkVerifyCode({ captcha: $('#valMobileValAuthCode1').val() }, function (checkVerifyCodEerr, checkVerifyCodeResult) {
            //    if (checkVerifyCodEerr) {
            //        alert(checkVerifyCodEerr.message);
            //        // 刷新验证码
            //        cb.rest.loadImage($('#valMobileValCode1'), '/client/ClientBaseMember/captcha');
            //        return;
            //    } else {
            //        if (!checkVerifyCodeResult) {
            //            $("#phoneValidateCode1").attr("class", "error-messages");
            //            $("#phoneValidateCode1").empty().append("验证码错误");
            //            // 刷新验证码
            //            cb.rest.loadImage($('#valMobileValCode1'), '/client/ClientBaseMember/captcha');
            //            return;
            //        } else {
            //            $("#phoneValidateCode1").removeClass("class", "error-messages");
            //            $("#phoneValidateCode1").empty().append("");
                      
            //        }
            //    }
            //});
            var proxy = cb.rest.DynamicProxy.create({ checkAuthCode: { url: 'member/Register/reset_checkAuthCode', method: 'POST', options: { token: true, mask: true } } });
            proxy.checkAuthCode({ 'authCode': $('#valMobileMessageCode1').val(), 'verifyRandomCode': self.getMessagereturnCode }, function (err, result) {
                if (err) {
                    alert("短信验证码不正确");
                    // 刷新验证码
                   // cb.rest.loadImage($('#valMobileValCode1'), '/client/ClientBaseMember/captcha');
                    return;
                } else {
                    self.getMessagereturnCode1 = result.verifyRandomCode;
                    self.getMessagereturnCode2 = result.authRandomCode;
                    $("#update_pwd_step1").hide();
                    $("#update_pwd_step2").hide();
                    $("#update_pwd_step3").hide();
                    $("#val_mail_step1").hide();
                    $("#val_mail_step2").hide();
                    $("#val_mail_step3").hide();
                    $("#val_phone_step1").hide();
                    $("#val_phone_step2").show();
                    $("#val_phone_step3").hide();
                    // 刷新验证码
                    cb.rest.loadImage($('#valMobileValCode2'), '/client/ClientBaseMember/captcha');
                    $("#valMobileSpan").empty().append(cPhone);
                }
            });

        });
        // 手机安全中心认证第二步 修改手机号码并获得手机短信验证码
        $("#phoneValSendMobileCode2").click(function () {
            var proxy = cb.rest.DynamicProxy.create({ checkPhoneNum: { url: 'member/Register/signUP_checkNamePhone', method: 'POST' } });
            proxy.checkPhoneNum({ 'code': $("#myValMobile").val() }, function (checkPhoneNumErr, checkPhoneNumResult) {
                if (checkPhoneNumErr) {
                    alert('该号码已被使用');
                } else {
                    var proxy = cb.rest.DynamicProxy.create({
                        changePhone_getAuthCode: {
                            url: 'member/Register/changePhone_getAuthCode', method: 'POST', options: {
                                token: true,
                                mask: true
                            }
                        }
                    });
                    proxy.changePhone_getAuthCode({'code': $("#myValMobile").val() }, function (err, result) {
                        if (err) {
                            alert('获取短信验证码失败: ' + err.message);
                            return;
                        } else {
                            view.prototype.getMessagereturnCode = result;
                            var sendMobileCodeBtn = document.getElementById("phoneValSendMobileCode2");
                            sendMobileCodeBtn.disabled = false;
                            // 倒计时时间
                            var wait = 60;
                            countDown(sendMobileCodeBtn, wait);
                        }
                    });
                }
            });


        });
        // 手机安全中心认证第二步，提交
        $(".val_phone_Btn_step2").click(function () {
            // 验证码
            if (!$('#valPhoneAuthCode2').val()) {
                $("#validateCode2").attr("class", "error-messages");
                $("#validateCode2").empty().append("输入验证码");
                cb.rest.loadImage($('#valMobileValCode2'), '/client/ClientBaseMember/captcha');
                return;
            }
            // 验证码
            if (!$("#myValMobile").val()) {
                alert("手机验证码不能为空！");
                cb.rest.loadImage($('#valMobileValCode2'), '/client/ClientBaseMember/captcha');
                return;
            }
            // 图片验证码
            var proxy = cb.rest.DynamicProxy.create({ checkVerifyCode: { url: 'client/ClientBaseMember/checkVerifyCode', method: 'POST' } });
            proxy.checkVerifyCode({ captcha: $('#valPhoneAuthCode2').val() }, function (checkVerifyCodEerr, checkVerifyCodeResult) {
                if (checkVerifyCodEerr) {
                    alert(checkVerifyCodEerr.message);
                    // 刷新验证码
                    cb.rest.loadImage($('#valMobileValCode2'), '/client/ClientBaseMember/captcha');
                    return;
                } else {
                    if (!checkVerifyCodeResult) {
                        $("#validateCode2").attr("class", "error-messages");
                        $("#validateCode2").empty().append("验证码错误");
                        // 刷新验证码
                        cb.rest.loadImage($('#valMobileValCode2'), '/client/ClientBaseMember/captcha');
                        return;
                    } else {
                        $("#validateCode2").removeClass("class", "error-messages");
                        $("#validateCode2").empty().append("");
                        var proxy = cb.rest.DynamicProxy.create({ changePhone_Save: { url: 'member/Register/changePhone_Save', method: 'POST' } });
                        proxy.changePhone_Save({ mid: memberId, phoneNum: $("#myValMobile").val(), validCode: $('#valPhoneCode2').val(), verifyKeyRandom: view.prototype.getMessagereturnCode }, function (changePhone_SaveErr, changePhone_SaveResult) {
                            if (changePhone_SaveErr) {
                                alert(changePhone_SaveErr.message);
                                cb.rest.loadImage($('#valMobileValCode2'), '/client/ClientBaseMember/captcha');
                                return;
                            } else {
                                $("#update_pwd_step1").hide();
                                $("#update_pwd_step2").hide();
                                $("#update_pwd_step3").hide();
                                $("#val_mail_step1").hide();
                                $("#val_mail_step2").hide();
                                $("#val_mail_step3").hide();
                                $("#val_phone_step1").hide();
                                $("#val_phone_step2").hide();
                                $("#val_phone_step3").show();
                            }
                        });
                    }
                }
            });
        });
        // 邮箱安全中心认证第一步 获取手机短信验证码
        $("#mailSendMobileCode").click(function () {
            var proxy = cb.rest.DynamicProxy.create({
                retsetGetAuthCode: {
                    url: 'member/Register/retset_getAuthCode', method: 'POST', options: {
                        token: true,
                        mask: true
                    }
                }
            });
            proxy.retsetGetAuthCode({ 'code': cPhone }, function (err, result) {
                if (err) {
                    alert(err.message);
                    return;
                } else {
                    self.getMessagereturnCode = result;
                    var sendMobileCodeBtn = document.getElementById("mailSendMobileCode");
                    sendMobileCodeBtn.disabled = false;
                    // 倒计时时间
                    var wait = 60;
                    countDown(sendMobileCodeBtn, wait);
                }
            });
        });
        // 邮箱安全中心认证第一步 提交
        $(".val_mail_btn_step1").click(function () {
            // 验证码
            if (!$('#mailValAuthCode').val()) {
                $("#mailValidateCode").attr("class", "error-messages");
                $("#mailValidateCode").empty().append("输入验证码");
                cb.rest.loadImage($('#mailCode0'), '/client/ClientBaseMember/captcha');
                return;
            }
            var proxy = cb.rest.DynamicProxy.create({ getMemberInfoByToken: { url: 'member/Members/getMemberByToken', method: 'POST', options: { token: true } } });
            proxy.getMemberInfoByToken({}, function (err, result) {
                if (err) {
                    alert("获取个人信息失败" + err);
                } else {
                    model = result;
                }

            });
            // 图片验证码
            var proxy = cb.rest.DynamicProxy.create({ checkVerifyCode: { url: 'client/ClientBaseMember/checkVerifyCode', method: 'POST' } });
            proxy.checkVerifyCode({ captcha: $('#mailValAuthCode').val() }, function (checkVerifyCodEerr, checkVerifyCodeResult) {
                if (checkVerifyCodEerr) {
                    alert(checkVerifyCodEerr.message);
                    // 刷新验证码
                    cb.rest.loadImage($('#mailCode0'), '/client/ClientBaseMember/captcha');
                    return;
                } else {
                    if (!checkVerifyCodeResult) {
                        $("#mailValidateCode").attr("class", "error-messages");
                        $("#mailValidateCode").empty().append("验证码错误");
                        // 刷新验证码
                        cb.rest.loadImage($('#mailCode0'), '/client/ClientBaseMember/captcha');
                        return;
                    } else {
                        $("#mailValidateCode").removeClass("class", "error-messages");
                        $("#mailValidateCode").empty().append("");
                        var proxy = cb.rest.DynamicProxy.create({ checkAuthCode: { url: 'member/Register/reset_checkAuthCode', method: 'POST', options: { token: true, mask: true } } });
                        proxy.checkAuthCode({ 'authCode': $('#mailMessageCode').val(), 'verifyRandomCode': self.getMessagereturnCode }, function (err, result) {
                            if (err) {
                                alert(err.memberId);
                                // 刷新验证码
                                cb.rest.loadImage($('#mailCode0'), '/client/ClientBaseMember/captcha');
                                return;
                            } else {
                                self.getMessagereturnCode1 = result.verifyRandomCode;
                                self.getMessagereturnCode2 = result.authRandomCode;
                                // 获得个人信息
                                $("#update_pwd_step1").hide();
                                $("#update_pwd_step2").hide();
                                $("#update_pwd_step3").hide();
                                $("#val_mail_step1").hide();
                                $("#val_mail_step2").show();
                                $("#val_mail_step3").hide();
                                $("#val_phone_step1").hide();
                                $("#val_phone_step2").hide();
                                $("#val_phone_step3").hide();
                                // 刷新验证码
                                cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
                            }
                        });
                    }
                }
            });


        });
        // 邮箱验证
        $('#myEail').blur(function (e) {
            if (!$('#myEail').val()) {
                $("#checkEmail").attr("class", "error-messages");
                $("#checkEmail").empty().append("请输入邮箱");
                cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
                return;
            } else {
                if (checkEmail($('#myEail').val()) == 2) {
                    $("#checkEmail").attr("class", "error-messages");
                    $("#checkEmail").empty().append("邮箱格式不正确");
                    cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
                    return;
                } else {
                    $("#checkEmail").removeClass("error-messages")
                    $("#checkEmail").empty().append("");
                }

            }

        });
        // 邮箱安全中心认证证第二步提交
        $(".send_mail_btn_step2").click(function () {
            // 邮箱验证
            if (!$('#myEail').val()) {
                $("#checkEmail").attr("class", "error-messages");
                $("#checkEmail").empty().append("请输入邮箱");
                cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
                return;
            } else {
                if (checkEmail($('#myEail').val()) == 2) {
                    $("#checkEmail").attr("class", "error-messages");
                    $("#checkEmail").empty().append("邮箱格式不正确");
                    cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
                    return;
                } else {
                    $("#checkEmail").removeClass("error-messages")
                    $("#checkEmail").empty().append("");
                }
            }
            // 验证码
            if (!$('#mailValAuthCode1').val()) {
                $("#mailValidateCode2").attr("class", "error-messages");
                $("#mailValidateCode2").empty().append("输入验证码");
                cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
                return;
            }
            // 图片验证码
            var proxy = cb.rest.DynamicProxy.create({ checkVerifyCode: { url: 'client/ClientBaseMember/checkVerifyCode', method: 'POST' } });
            proxy.checkVerifyCode({ captcha: $('#mailValAuthCode1').val() }, function (checkVerifyCodEerr, checkVerifyCodeResult) {
                if (checkVerifyCodEerr) {
                    alert(checkVerifyCodEerr.message);
                    // 刷新验证码
                    cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
                    return;
                } else {
                    if (!checkVerifyCodeResult) {
                        $("#mailValidateCode2").attr("class", "error-messages");
                        $("#mailValidateCode2").empty().append("验证码错误");
                        // 刷新验证码
                        cb.rest.loadImage($('#mailCode1'), '/client/ClientBaseMember/captcha');
                        return;
                    } else {
                        $("#mailValidateCode2").removeClass("class", "error-messages");
                        $("#mailValidateCode2").empty().append("");
                        // 获得个人信息
                        var proxy = cb.rest.DynamicProxy.create({ getMemberByToken: { url: 'member/Members/getMemberByToken', method: 'POST', options: { token: true } } });
                        proxy.getMemberByToken({}, function (err, result) {
                            if (err) {
                                alert("获取个人信息失败" + err.message);
                            } else {
                                model = result;
                                // 修改邮箱
                                model.cEmail = $("#myEail").val();
                                model.cPhone = cPhone;
                                var proxy = cb.rest.DynamicProxy.create({ save: { url: 'member/Members/save', method: 'POST', options: { token: true } } });
                                proxy.save({ model: model }, function (err, result1) {
                                    if (err) {
                                        alert("修改失败" + err.message);
                                    } else {
                                        $("#update_pwd_step1").hide();
                                        $("#update_pwd_step2").hide();
                                        $("#update_pwd_step3").hide();
                                        $("#val_mail_step1").hide();
                                        $("#val_mail_step2").hide();
                                        $("#val_mail_step3").show();
                                        $("#val_phone_step1").hide();
                                        $("#val_phone_step2").hide();
                                        $("#val_phone_step3").hide();
                                    }

                                });
                            }

                        }, this);
                    }
                }
            });

        });
    };
    // 倒计时
    var countDown = function (o, wait) {
        if (wait == 0) {
            o.removeAttribute("disabled");
            o.value = "免费获取验证码";
            wait = 60;
        } else {
            o.setAttribute("disabled", true);
            o.value = "重新发送(" + wait + ")";
            wait--;
            setTimeout(function () {
                countDown(o, wait)
            },
            1000)
        }
    }
    // 邮箱验证
    var checkEmail = function (email) {
        var isEmail = 0;
        if (email != "") {
            var re = /^(\w-*\.*)+@(\w-?)+(\.\w{2,})+$/
            if (re.test(email)) {
                isEmail = 1;
            } else {
                isEmail = 2;
            }
        }
        return isEmail;
    }
    // 判断密码是否一致
    var validatePassword = function () {
        var passwd_re = $('#password').val();
        var passwd = $('#rePassword').val();
        if (passwd_re.toLowerCase() != passwd.toLowerCase()) {
            return false;
        } else {
            return true;
        }
    }
    return view;
});