cb.views.register('LoginViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.createCodes = "";
    view.prototype.init = function () {
        var _this = this;
        // 获得IE的版本号，判断是不是IE10
        var version = document.documentMode;
        this.getView().keydown(function (e) {
            if (e.keyCode !== 13) return;
            if (version != 10) {
                $('.btn-login').trigger("click");
            }
        });
        // 生成验证码
        cb.rest.loadImage($('#code'), 'client/ClientBaseMember/captcha');
        // 刷新验证码
        $("#code").click(function () {
            cb.rest.loadImage($('#code'), 'client/ClientBaseMember/captcha');
        });
        $(".btn-login").click(function () {
            loginClick(_this);
        });
        $("#forget_password").click(function () {
            var queryString = new cb.util.queryString();
            var cPhone = queryString.get("cPhone") || "";
            location.href = "forget_password?userName=" + $("#uname").val();
        });

    };
    var loginClick = function (_this) {
        // 用户名
        debugger;
        if (!$('#uname').val()) {
            ModalTip({ message: "请输入用户名" }, _this);
            // 刷新验证码
            cb.rest.loadImage($('#code'), 'client/ClientBaseMember/captcha');
            return;
        }
        // 验证码
        if (!$('#password').val()) {
            ModalTip({ message: "请输入密码" }, _this);
            // 刷新验证码
            cb.rest.loadImage($('#code'), 'client/ClientBaseMember/captcha');
            return;
        }
        // 验证码
        /*if (!$('#iptsingup').val()) {
            ModalTip({ message: "请输入验证码" }, _this);
            // 刷新验证码
            cb.rest.loadImage($('#code'), 'client/ClientBaseMember/captcha');
            return;
        }*/
        var proxy = cb.rest.DynamicProxy.create({ login: { url: 'client/MemberLogin/authenticate', method: 'POST'} });
        proxy.login({ username: $('#uname').val(), password: $('#password').val(), captcha: $('#iptsingup').val() }, function (err, result) {
            debugger;
            if (err) {
                //alert(err.message);
                ModalTip({ message: err.message }, _this);
                // 刷新验证码
                cb.rest.loadImage($('#code'), 'client/ClientBaseMember/captcha');
                return;
            } else {
                //localStorage.setItem('userData', cb.data.JsonSerializer.serialize(result));
                cb.data.CookieParser.setCookie('cUserName', result.cUserName);
                cb.data.CookieParser.setCookie('token', result.token);
                var queryString = new cb.util.queryString();
                var returnUrl = queryString.get('returnUrl') || '/';
                location.href = returnUrl;
            }

        });
    }
    return view;
}, this);