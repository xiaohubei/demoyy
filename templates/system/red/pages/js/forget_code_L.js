cb.views.register('ForgetCodeViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    var createCodes;
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    
    view.prototype.init = function () {
       
        // 获取短信验证码
        $("#getforgetMessageCode").click(function () {
            var proxy = cb.rest.DynamicProxy.create({ retsetGetAuthCode: { url: 'member/Register/retset_getAuthCode', method: 'POST' } });
            proxy.retsetGetAuthCode({ 'code': $('#recover_login_name').val() }, function (err, result) {
                if (err) {
                    alert('获取失败: ' + err);
                    return;
                } else {
                   
                }
            });
        });
        
    };
    // 获取短信验证码
    $("#reset_btn").click(function () {
        var proxy = cb.rest.DynamicProxy.create({ resetSetPassword: { url: 'member/Register/reset_setPassword', method: 'POST' } });
        proxy.resetSetPassword({ 'code': $('#recover_login_name').val(), 'password': $('#resetPassword').val(), 'authCode': $('#messageCode').val() }, function (err, result) {
            if (err) {
                alert('获取失败: ' + err);
                return;
            } else {
                window.location.href = "login";
            }
        });
    });
    return view;
});