cb.views.register('SecurityCenterViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var proxy = cb.rest.DynamicProxy.create({ getMemberByToken: { url: 'member/Members/getMemberByToken', method: 'POST', options: { token: true } } });
        // 加载个人信息
        proxy.getMemberByToken({}, function (err, result) {
            if (err) {
                alert("获取个人信息失败" + err.message);
            } else {
                var resultData = result;
                // 头像
                if (resultData.cPortrait && resultData.cPortrait != "") {
                    cb.rest.loadImage($('#cPortrait'), resultData.cPortrait);
                } else {
                    // 没有头像默认头像
                    cb.rest.loadImage($('#cPortrait'), "http://i.jd.com/commons/img/no-img_mid_.jpg");
                }
                $("#cName").empty().append(result.cUserName);
                if (resultData.cPhone && resultData.cPhone != "") {
                    $("#phoneIcon").attr("class", "icon-01");
                    $("#phoneValContent").empty().append("您验证的手机:" + resultData.cPhone + "若已丢失或停用，请立即更换");
                    $("#valPhone").empty().append("修改");
                } else {
                    $("#phoneIcon").attr("class", "icon-02");
                    $("#valPhone").empty().append("立即验证");
                }
                if (resultData.cEmail && resultData.cEmail != "没有绑定邮箱") {
                    $("#emailIcon").attr("class", "icon-01");
                    $("#maliValContent").empty().append("您验证的邮箱:" + resultData.cEmail + "若已丢失或停用，请立即更换");
                    $("#valMail").empty().append("修改");
                } else {
                    $("#emailIcon").attr("class", "icon-02");
                    $("#valMail").empty().append("立即绑定");
                }
            }
            // 修改密码
            $("#updatePassword").click(function () {
                location.href = 'update_password?valType=1';
            });
            // 修改或验证邮箱
            $("#valMail").click(function () {
                location.href = 'update_password?valType=2';
            });
            // 修改手机
            $("#valPhone").click(function () {
                location.href = 'update_password?valType=3';
            });
        }, this);

    };

    return view;
});