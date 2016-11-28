cb.views.register('MessageSettingController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var proxy = cb.rest.DynamicProxy.create({
            getData: {
                url: 'client/Bulletins/getMessageTypeList',
                method: 'GET',
                options: { token: true }
            }
        });
        proxy.getData({}, function (err, result) {
            if (result) {
                var fun = template.compile($('#settingList').html());
                $('.settingListBox').html(fun({ data: result }));
                $('input').on('click', function (e) {
                    var len = $('.settingListBox .checkItems').length;
                    var param = [];
                        var json = {};
                        json.id = $(this).attr('data-id');
                        json.isUsed = $(this).prop('checked');
                        json.type = $(this).attr('data-type');
                        param.push(json);
                    var proxy = cb.rest.DynamicProxy.create({
                        getData: {
                            url: 'client/Bulletins/updateDifBulletins',
                            method: 'POST',
                            options: { token: true }
                        }
                    });
                    proxy.getData({ subMessageTypes: param }, function (err, result) {
                        if (result) {
                        } else if (err) {
                        }
                    });
                });
            } else if (err) {
                alert(err);
            };
        });
        $('.linkBackToMyMessage').on('click', function () {
            window.location.href = 'mymessage';
        });
    }
    return view;
});