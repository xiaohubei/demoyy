cb.views.register('MyConsultingController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getconsulting: { //获取商品评价及咨询  只不过是参数不一样
            url: 'member/Comments/query',
            method: 'get',
            options: {
                token: true
            }
        },
        deleteConsulting: {
            url: 'member/Comments/delete',
            method: 'get',
            options: {
                token: true
            }
        }
    });
    view.prototype.pageIndex = 1;
    
    view.prototype.init = function () {
        var self = this;
        var thisView = this.getView();
        self.getconsulting(thisView, false, function () {
        });
    };
    view.prototype.register = function (thisView) {
        var pageContent = thisView.find('.page-content.infinite-scroll');
        var self = this;
        thisView.find('.delete-consulting').click(function () {
            var id = parseInt($$(this).attr('data-id'));

        });
        //注册无限滚动事件
        var infinite = thisView.find('.infinite-scroll');
        pageContent.on('infinite', function () {
            if (!self.proxyHasFinished) return;
            self.proxyHasFinished = false;
            thisView.find('.infinite-scroll-preloader').show();
            var len = thisView.find('.consultingNum').length;
            if (parseInt(self.totalCount) <= len) {
                myApp.detachInfiniteScroll(infinite);
            } else {
                self.pageIndex = parseInt(self.pageIndex) + 1;
                self.getconsulting(thisView, true);
            }
        });
    }
    view.prototype.getconsulting = function (thisView, isAppend, callback) {
        var self = this;
        this.proxy.getconsulting({
            type: 1,
            isGetLoginMember: true,
            pageIndex: self.pageIndex,
            pageSize: 5
        }, function (err, result) {
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            if (result.models.length > 0) {
                self.totalCount = result.modelsCount;
            }else{
                result.models = [];
            }
            if(result.models.length){
                for(var i=0; i<result.models.length; i++){
                    result.models[i].dTime= result.models[i].dTime.substring(0,19)
                }
            };
            var html = self.render(thisView.find('script').html(), {
                data: result.models
            });
            if (!isAppend) {
                thisView.find('.page-content .evaluation-list').html(html);
                myApp.attachInfiniteScroll(thisView.find('.page-content'));
            } else {
                thisView.find('.page-content .evaluation-list').append(html);
            };
            self.register(thisView);
            self.proxyHasFinished = true;
            if (callback) callback();
        });
    };
    return view;
});