cb.views.register('UploadPortraitViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var model = {};
        var proxy = cb.rest.DynamicProxy.create({ getMemberByToken: { url: 'member/Members/getMemberByToken', method: 'POST', options: { token: true } } });
        // 加载个人信息
        proxy.getMemberByToken({}, function (err, result) {
            if (err) {
                alert(err.message);
                return;
            } else {
                model = result;
            }
        });
        var oAttachments = [];
        //var proxy = cb.rest.DynamicProxy.create({
        //    upload: {
        //        url: '/FileUpload/uploadAlbum',
        //        method: 'POST',
        //        options: { token: true }
        //    }
        //});
        //上传图片
        $("#uploadpic").diyUpload({
            url: '/client/FileUpload/uploadYLImg?token='+cb.rest.AppContext.token,
            fileNumLimit:1,
            cancelButtonText:"取消",
            success: function (data) {
            	/*$('#confirm_photo').removeAttr('disabled');
                if (oAttachments.length > 0) {
                    oAttachments = [];
                }
                oAttachments.push({"imgname":data.data.imgname,"imgurl":data.data.imgurl});*/
            },
            error: function (err) {
                console.info(err);
            }
        })
        // 确定
        /*$(".btn.btn-primary").click(function () {
            // 个人信息图片
            if (oAttachments.length > 0) {
                model.cPortrait = oAttachments[0].imgurl;
            } else {
                //model.cPortrait = "http://i.jd.com/commons/img/no-img_mid_.jpg";
            }
            var proxy = cb.rest.DynamicProxy.create({ saveInfo: { url: 'member/Members/save', method: 'POST', options: { token: true } } });
            proxy.saveInfo({ model: model }, function (err, result1) {
                if (err) {
                    alert(err.message);
                    return;
                } else {
                    location.href = 'my_information';
                }

            });

        });*/
    };
    return view;
});