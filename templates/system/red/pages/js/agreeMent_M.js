cb.views.register('AgreeMentViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    // 初始化
    view.prototype.init = function (callback) {
        var self = this;
        var thisView = this.getView();
        var proxy = cb.rest.DynamicProxy.create({
            getAgreement: { url: 'client/Articles/getArticlesByType', method: 'GET', options: { mask: true, token: false } },
            getArticleById: { url: 'client/Articles/getArticleById', method: 'GET', options: { mask: true, token: false } }
        });
        proxy.getAgreement({ typeId: -2 }, function (err, result) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            var titleHtml = '';
            if (result.pager.totalCount > 0) {
                for (var i = 0; i < result.pager.data.length; i++) {
                    var item = result.pager.data[i];
                    titleHtml += '<li class="item-content" data-id="' + item.id + '">' +
                                    '<div class="item-inner">' +
                                       '<div class="item-title">' + item.title + '</div>' +
                                    '</div>' +
                                 '</li>';
                }
            }
            thisView.find('ul.agm-Container').html(titleHtml);

            thisView.find('ul.agm-Container').children('li').on('click', function () {
                var artId = $$(this).attr('data-id');
                proxy.getArticleById({ articleid: artId }, function (aerr, aresult) {
                    if (aerr) {
                        myApp.toast('获取数据失败', 'error').show(true);
                        return;
                    }
                    var popupHTML = '<div class="popup">' +
                                        '<div class="content-block-title" style="text-align: center;font-size: 16px;">' + aresult.articleBody.articleIndex.title + '</div>' +
                                        '<div class="content-block" style="height: 100%;overflow-y: auto;padding-bottom: 120px;">' + aresult.articleBody.content + '</div>'+
                                            '<p style="position: absolute;bottom: 0;text-align: center;width: 100%;background: #fff;height: 50px;margin: 0;padding-top: 10px;">' +
                                             '<a href="#" class="close-popup" style="background-color: #ef524d;display: block;width: 96%;margin: 0 auto;height: 40px;line-height: 40px;color: #fff; border-radius: 5px;">我已阅读</a></p>' +
                                    '</div>'
                    myApp.popup(popupHTML);
                });
            });

        });
    };
    return view;
});