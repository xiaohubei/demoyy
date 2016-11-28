cb.views.register('RegisterViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    // 初始化
    view.prototype.init = function (callback) {
        var self = this;
        self.sendFlag = true;
        var thisView = this.getView();
        var proxy = cb.rest.DynamicProxy.create({
            checkAuthCode: { url: 'member/Register/signUP_checkAuthCode', method: 'POST', options: { mask: true } },
            getAgreement: { url: 'client/Articles/getArticlesByType', method: 'GET', options: {mask:true} }
        });
        //self.getView().find('#registerBtn').addClass("disabled");
        // 后退
        self.getView().find('.registerReturn').on('click', function (callback) {
            cb.route.redirectLoginPage({
                opened: function () {
                    myApp.mainView.router.back();
                }
            });
        });
        cb.rest.loadImage($$('#registerImgValCode'), 'client/ClientBaseMember/captcha');
        // 发送验证吗
        self.getView().find('.messageSendBtn').on('click', function () {
            var phone = self.getView().find("#registerPhoneNumber").val();
            if (!phone) {
                myApp.toast("手机号不能为空", 'tips').show(true);
                return;
            }
            if (!/^1\d{10}$/g.test(phone)) {
                myApp.toast("请输入正确的手机号", 'tips').show(true);
                return;
            }
            var proxy = cb.rest.DynamicProxy.create({ registerGetAuthCode: { url: 'member/Register/signUP_getAuthCode', method: 'POST' } });
            proxy.registerGetAuthCode({ 'phone': phone }, function (err, result) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                } else {
                    if (self.getView().find('#registerBtn').hasClass("disabled")) {
                        self.getView().find('#registerBtn').removeClass("disabled");
                    }
                    var sendMobileCodeBtn = document.getElementById("registerMessageSend");
                    // 倒计时时间
                    var wait = 60;
                    if (self.sendFlag) {
                        self.countDownFunc(sendMobileCodeBtn, wait);
                    }
                }
            });

        });
        // 注册按钮
        self.getView().find('#registerBtn').click(function () {
            // 手机验证
            if (!self.getView().find("#registerPhoneNumber").val()) {
                myApp.toast("手机号不能为空", 'tips').show(true);
                return;
            }
            if (!/^1\d{10}$/g.test(self.getView().find("#registerPhoneNumber").val())) {
                myApp.toast("请输入正确的手机号", 'tips').show(true);
                return;
            }
            // 短信验证码为空验证
            if (!self.getView().find('#registerMessageCode').val()) {
                myApp.toast("短信验证码不能为空", 'tips').show(true);
                return;
            }
            // 密码验证
            if (!self.getView().find('#registerPassword').val()) {
                myApp.toast("密码不能为空", 'tips').show(true);
                return;
            }
            // 密码长度验证
            if (self.getView().find('#registerPassword').val().length < 6 || self.getView().find('#registerPassword').val().length > 32) {
                myApp.toast("密码长度不能小于6位并且不能大于32位", 'tips').show(true);
                // 刷新验证码
                return;
            }

            // 检查短信验证码
            proxy.checkAuthCode({ 'authCode': $$('#registerMessageCode').val() }, function (err, result) {
                if (err) {
                    myApp.toast("短信验证码错误", 'error').show(true);  
                    return;
                } else {
                    //  验证名字
                    var proxy = cb.rest.DynamicProxy.create({ checkNamePhone: { url: 'member/Register/signUP_checkNamePhone', method: 'POST' } });
                    proxy.checkNamePhone({ 'code': $$('#registerPhoneNumber').val(), recommend: $$('#registerReferrer').val() }, function (checkNameErr, checkNameResult) {
                        if (checkNameErr) {
                            myApp.toast("用户名已存在", 'tips').show(true);
                            return;
                        } else {
                            var inviteCode = cb.rest.AppContext.inviteCode;
                            var promotCode = cb.rest.AppContext.promotCode;
                            var proxy = cb.rest.DynamicProxy.create({ register: { url: 'member/Register/singUp', method: 'POST' } });
                            proxy.register({
                                'userName': $$('#registerPhoneNumber').val(),
                                'phone': $$('#registerPhoneNumber').val(),
                                'password': $$('#registerPassword').val(),
                                'authCode': $$('#registerMessageCode').val(),
                                'promotionCode': inviteCode,
                                'promotingSetCode': promotCode,
                                recommend: $$('#registerReferrer').val()
                            }, function (registerErr, registerResult) {
                                if (registerErr) {
                                    myApp.toast(registerErr.message, 'error').show(true);
                                    return;
                                } else {
                                    myApp.modal({
                                        title: '<div class="common-tips-title success-tips">' +
                                                  '<span  class="font-23">注册成功！</span>' +
                                                '</div>',
                                        text: '<div class="common-tips-content">' +
                                                 '<div class="tips-info">请牢牢记住您设置的密码哦！</div>' +
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
                        }
                    });
                }
            });

        });
        //点击服务条款
        thisView.find('.register-tip.btn-registerServerText').on('click', function () {
            myApp.mainView.router.loadPage({
                url: 'agreeMentPage'
            });
        });
    };

    // 倒计时
    view.prototype.countDownFunc = function (o, wait) {
        var _self = this;
        if (wait == 0) {
            $$(o).text("发送");
            _self.sendFlag = true;
        } else {
            _self.sendFlag = false;
            $$(o).text("重新发送(" + wait + ")");
            wait--;
            setTimeout(function () {
                _self.countDownFunc(o, wait)
            },
            1000)
        }
    };
    return view;
});