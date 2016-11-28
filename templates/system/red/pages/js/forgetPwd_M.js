cb.views.register('forgetPwdViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.userName = '';
    view.prototype.cPhone = '';
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        checkUserName: {
            url: 'member/Register/retset_checkUserName',
            method: 'POST',
            options: {
                token: false,
                mask: true
            }
        },
        sendValidCode: {
            url: 'member/Register/retset_getAuthCode',
            method: 'POST',
            options: {
                token: false
            }
        },
        checkValidCode: {
            url: 'member/Register/reset_checkAuthCode',
            method: 'POST',
            options: {
                token: false,
                mask: true
            }
        },
        updatePassword: {
            url: 'member/Register/reset_setPassword',
            method: 'POST',
            options: {
                token: false,
                mask: true
            }
        }
    });
    view.prototype.init = function () {
        var query = this.getQuery();
        var self = this;
        var this_view = this.getView();
        //返回按钮事件
        this_view.find('.link.forgetPwd-back').on('click', function () {
            cb.route.redirectLoginPage({
                opened: function () {
                    myApp.mainView.router.back();
                }
            });
        });

        var verificationImg = this_view.find('.img-forgetPwd-verification');
        var reflushImg = function () {
            cb.rest.loadImage(verificationImg, '/client/ClientBaseMember/captcha');
        };
        verificationImg.on('click', reflushImg);
        reflushImg();
        //定时更新验证码
        setInterval(function () {
            reflushImg();
        }, 60000)

        //第一个下一步按钮事件
        this_view.find('.button.step-one').on('click', function () {
            var userName = $$('.forgetPwd.step-one .input-forgetPwd-userName').val();
            var code = $$('.forgetPwd.step-one .input-forgetPwd-verification').val();
            if (!userName) {
                myApp.toast('请输入账户/手机/邮箱', 'tips').show(true);
                return;
            }
            if (!code) {
                myApp.toast('请输入验证码', 'tips').show(true);
                return;
            }
            self.proxy.checkUserName({ username: userName, captcha: code }, function (err, data) {
                if (err) {
                    reflushImg();
                    myApp.toast(err.message, 'error').show(true);
                    return;
                }
                self.userInfo = data;
                //cb.rest.AppContext.token = self.userInfo.token;
                if (!self.userInfo.cUserName)
                    self.userInfo.cUserName = $$('.forgetPwd.step-one .input-forgetPwd-userName').val();

                this_view.find('.forgetPwd.step-one').hide();
                this_view.find('.forgetPwd.step-two').show();

                if (data.cPhone)
                    $$('#input-phone').val(data.cPhone);

                if (data.cEmail)
                    $$('#input-email').val(data.cEmail);

                $$('div[data-page="ForgetPwd"] .forgetPwd-validateType li').on('click', function (e) {
                    $$(this).parent().children('li').removeClass('checked');
                    $$(this).addClass('checked');
                });

                //清空输入
                $$('.forgetPwd.step-one .input-forgetPwd-userName').val('');
                $$('.forgetPwd.step-one .input-forgetPwd-verification').val('');
            });
        });

        //获取验证码按钮
        this_view.find('.get-forgetPwd-DynamicCode').on('click', function () {
            var link = $$('div[data-page="forgetPwd"] .forgetPwd-validateType .checked').find('input').attr('type');

            var params = { code: self.userInfo.cUserName };
            if (link == 'email')
                params.bPhone = false;
            else
                params.bPhone = true;

            self.proxy.sendValidCode(params, function (err, data) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                    return;
                }
                $$('.get-forgetPwd-DynamicCode').attr('disabled', 'disabled');
                self.userInfo.verifyRandomCode = data;

                var index = 60;
                var setInter = window.setInterval(function () {
                    if (index <= 0) {
                        $$('.get-forgetPwd-DynamicCode').removeAttr('disabled');
                        $$('.get-forgetPwd-DynamicCode').text('获取验证码');
                        clearInterval(setInter);
                    }
                    else {
                        $$('.get-forgetPwd-DynamicCode').text(index + '秒后获取');
                        index--;
                    }
                }, 1000);
            });
        });

        this_view.find('.forgetPwd .button.step-two').on('click', function () {
            var params = {
                username: self.userInfo.cUserName,
                verifyRandomCode: self.userInfo.verifyRandomCode
            };
            var dynamicCode = this_view.find('.input-forgetPwd-DynamicCode').val();
            if (dynamicCode) {
                params.authCode = dynamicCode;
                var link = $$('div[data-page="forgetPwd"] .forgetPwd-validateType .checked').find('input').attr('type');
                if (link == 'email')
                    params.bPhone = false;
                else
                    params.bPhone = true;

                self.proxy.checkValidCode(params, function (err, data) {
                    if (err) {
                        myApp.toast('校验码输入错误', 'tips').show(true);
                        return;
                    }
                    this_view.find('.forgetPwd.step-two').hide();
                    this_view.find('.forgetPwd.step-three').show();

                    self.checkedCode = data;
                });
            }
            else
                myApp.toast('请输入验证码', 'tips').show(true);
        });

        this_view.find('.forgetPwd-changePwd li i').on('click', function () {
            if ($$(this).hasClass('icon-see-pwd')) {
                $$(this).removeClass('icon-see-pwd').addClass('icon-see-pwd-un');
                $$(this).parent().prev().find('input').attr('type', 'password');
            }
            else {
                $$(this).addClass('icon-see-pwd').removeClass('icon-see-pwd-un');
                $$(this).parent().prev().find('input').attr('type', 'text');
            }
        });

        this_view.find('.forgetPwd .button.step-three').on('click', function () {
            var newPwd = $$('.forgetPwd-new-pwd').val();
            if (!newPwd) {
                myApp.toast('请输入新密码', 'tips').show(true);
                return;
            }
            else if (newPwd != $$('.forgetPwd-reconfirm-pwd').val()) {
                myApp.toast('两次输入不一致！', 'error').show(true);
                return;
            }
            else if (newPwd.length < 6) {
                myApp.toast('密码长度至少6个字符！', 'error').show(true);
                return;
            }
            else if (newPwd.length > 32) {
                myApp.toast('密码长度至多32个字符！', 'error').show(true);
                return;
            }
            var params = {
                authRandomCode: self.checkedCode.authRandomCode,
                verifyRandomCode: self.checkedCode.verifyRandomCode,
                password: newPwd,
            };
            var link = $$('div[data-page="forgetPwd"] .forgetPwd-validateType .checked').find('input').attr('type');
            if (link == 'email')
                params.bPhone = false;
            else
                params.bPhone = true;

            self.proxy.updatePassword(params, function (err, data) {
                if (err) {
                    myApp.modal({
                        title: '<i class="icon icon-colse"></i>' +
                        		'<div class="common-tips-title error-tips">' +
                                  '<span class="font-23">找回密码失败～</span>' +
                                '</div>',
                        buttons: [
                  {

                      text: '去登陆',
                      onClick: function () {
                          cb.route.redirectLoginPage({
                              opened: function () {
                                  myApp.mainView.router.back();
                              }
                          });
                      }
                  },
                  {
                      text: '重新找回',
                      onClick: function () {
                          myApp.mainView.router.refreshPage();
                      }
                  }
                        ]
                    });
                    //关闭modal
                    $$('.icon.icon-colse').on('click', function () {
                        myApp.closeModal();
                        myApp.mainView.router.back();
                    });
                }
                else {
                    $$('.forgetPwd.step-three').hide();
                    myApp.modal({
                        title: '<div class="common-tips-title success-tips">' +
                                  '<span  class="font-23">找回密码成功！</span>' +
                                '</div>',
                        text: '<div class="common-tips-content">' +
                                 '<div class="tips-info">请牢牢记住您设置的新密码哦！</div>' +
                               '</div>',
                        buttons: [
                  {
                      text: '去登录',
                      onClick: function () {
                          //myApp.popup('.popup.popup-login');
                          cb.route.redirectLoginPage({
                              opened: function () {
                                  myApp.mainView.router.back();
                              }
                          });
                      }
                  }
                        ]
                    });
                }
            });
        });
    };
    return view;
});