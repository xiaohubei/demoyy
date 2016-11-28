cb.views.register('MyConsultingController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getconsulting: {         //获取商品评价及咨询  只不过是参数不一样
            url: 'member/Comments/query',
            method: 'get',
            options: { token: true }
        }
    });
    view.prototype.init = function () {
        ////分页请求数据
        this.proxy.getconsulting({ 
            type: 1, 
            isGetLoginMember: true, 
            pageIndex: 1, pageSize:5
        }, function (err, result) {
            if (result) {
                var self = this;
                this.dateChangeFormat(result);
                var html = this.render($('#consultingTable').html(), { data: result.models }, false);
                $('.myconsulting_content table').html(html);
                $('.consultingPagesBtn').createPage({
                    pageCount: Math.ceil(result.modelsCount/5),
                    current: 1,
                    unbind: true,
                    backFn: function (p) {
                        self.proxy.getconsulting({
                            type: 1,
                            isGetLoginMember: true,
                            pageIndex: p, pageSize: 5
                        }, function (err, result) {
                            if (result) {
                                this.dateChangeFormat(result);
                                var html = this.render($('#consultingTable').html(), { data: result.models }, false);
                                $('.myconsulting_content table').html(html);
                            } else {
                                alert(err);
                            }
                        }, self);
                    }
                });
            } else {
                alert(err);
            }
        }, this);
    };
    view.prototype.dateChangeFormat = function (result) {
        result.models.forEach(function (item, index, array) {
            if (item.dTime) {
                item.dTime = item.dTime.split('.')[0];
            }
            if (item.dTimeReply) {
                item.dTimeReply = item.dTimeReply.split('.')[0];
            }
        });
    }
    return view;
});