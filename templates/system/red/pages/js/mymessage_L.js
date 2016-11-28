cb.views.register('MyMessageController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var thisPage = 1, isReaded = false, message_type = 'all';
        $('.previouspage').hide();
        //初始化时 默认选择--新消息 二级tab默认为--所有消息；
        this.getInformation(thisPage, isReaded, message_type);
        $('.main_tabs ul li').eq(0).addClass('main_tabsOnhover');
        $('.main_tabs1 ul li').eq(0).addClass('main_tabs1Onhover');
        this.register(thisPage, isReaded, message_type);
    }
    
    view.prototype.proxy = cb.rest.DynamicProxy.create({
            getData: {
                url: 'client/Bulletins/getDifBulletins',
                method: 'GET',
                options: {token:true}
            }
        });
    view.prototype.getInformation = function (thisPage, isReaded, message_type) {
        var self = this;
        this.proxy.getData({
            pageIndex: thisPage,
            pageSize: 5,
            bReaded: isReaded,
            message_type: message_type
        }, function (err, result) {
            if (result) {
                self.oData = result;
                for (var i = 0; i < result.bulletins.length; i++) {
                    result.bulletins[i].date = result.bulletins[i].dCreated.split(' ')[0];
                    result.bulletins[i].time = result.bulletins[i].dCreated.split(' ')[1];
                }
                allPages = Math.ceil(result.count / 5);
                var html = self.render($('#test').html(), { data: result }, false);
                $('.contentDiv').html(html);
                if (isReaded) {
                    $('.markToRead_btn').hide();
                }
                if (!isReaded) {
                    $('.markToRead_btn').show();
                }
                if (result.count > 0) {
                    $('.contentFooter').show();
                }
                if (result.count == 0) {
                    $('.contentDiv').html('暂无信息');
                    $('.contentFooter').hide();
                }
                    $('.aboutpage').createPage({
                        pageCount: allPages,
                        current: 1,
                        unbind: true,
                        backFn: function (p) {
                            self.proxy.getData({
                                pageIndex: p,
                                pageSize: 5,
                                bReaded: isReaded,
                                message_type: message_type
                            }, function (err, result) {
                                if (result) {
                                    self.oData = result;
                                    for (var i = 0; i < result.bulletins.length; i++) {
                                        result.bulletins[i].date = result.bulletins[i].dCreated.split(' ')[0];
                                        result.bulletins[i].time = result.bulletins[i].dCreated.split(' ')[1];
                                    }
                                    var html = self.render($('#test').html(), { data: result }, false);
                                    $('.contentDiv').html(html);
                                    $('.contentFooter_l input[type=checkbox]').prop('checked', false);
                                } else {
                                    alert(err);
                                }
                            });
                        }
                    });
                //添加checkbox的点击事件 判断全选与反全选之间的关系
                $('.main_unit input[type=checkbox]').on('click', function () {
                    var checked = $(this).prop('checked');
                    if (checked) { //判断当前页中所有的input是否全选中了 如果是则要把下面的全选状态选中
                        var len = $('.main_unit input[type=checkbox]:checked').length;
                        var len1 = $(".main_unit input[type=checkbox]").length;
                        if (len == len1) {
                            $('.contentFooter_l input[type=checkbox]').prop('checked', true);
                        }
                    } else {
                        $('.contentFooter_l input[type=checkbox]')[0].checked = false;
                    }
                });
            }
            else {
                alert(err);
            }
        }, this);
    };
    view.prototype.register = function (thisPage, isReaded, message_type) {
        $('.main_tabs ul li').on('click', this, function (e) {
            $('.contentFooter_l input[type=checkbox]').prop('checked', false);
            $('.thisPage').html(1);
            //分出当前点击的页签是哪一个,在请求不同的服务 
            $('.main_tabs ul li').removeClass('main_tabsOnhover');
            $(this).addClass('main_tabsOnhover');
            message_type = 'all';
            $('.main_tabs1 ul li').removeClass('main_tabs1Onhover');
            $('.main_tabs1 ul li').eq(0).addClass('main_tabs1Onhover');
            if ($(this).index() == 0) {    //新信息
                thisPage = 1;
                isReaded = false;
                e.data.getInformation(thisPage, isReaded, message_type);
            }
            else if ($(this).index() == 1) {     //已读信息
                thisPage = 1;
                isReaded = true;
                e.data.getInformation(thisPage, isReaded, message_type);
            }
        });
        $('.main_tabs1 ul li').on('click', this, function (e) {
            $('.contentFooter_l input[type=checkbox]').prop('checked', false);
            //分出当前点击的页签是哪一个,在请求不同的服务 
            $('.main_tabs1 ul li').removeClass('main_tabs1Onhover');
            $(this).addClass('main_tabs1Onhover');
            var index = $(this).index();
            switch (index) {
                case 0:
                    message_type = 'all';
                    break;
                case 1:
                    message_type = 'order';
                    break;
                case 2:
                    message_type = 'account';
                    break;
                case 3:
                    message_type = 'system';
                    break;
                default:
                    break;
            }
            e.data.getInformation(thisPage, isReaded, message_type);
        });

        $('.contentFooter_l input[type=checkbox]').on('click', function () {
            var checked = $(this)[0].checked;
            var dom = $('.main_unit input[type=checkbox]');
            for (var i = 0; i < dom.length; i++) {
                if (checked) {
                    dom[i].checked = true;
                } else {
                    dom[i].checked = false;
                }
            }
        });
        //添加 删除和标记为已读  按钮点击事件
        $('.markToRead_btn').on('click', this, function (e) {
            var index = selectCheckbox();
            if (index.length == 0) {
                alert('请先选中要标记为已读的消息');
            } else {
                var id = [];
                for (var i = 0; i < index.length; i++) {
                    id.push(e.data.oData.bulletins[index[i]].id);
                }
                var proxy = cb.rest.DynamicProxy.create({
                    changeToReaded: {
                        url: 'client/Bulletins/modifyBulletinStatus',
                        method: 'POST',
                        options: { token: true }
                    }
                });
                proxy.changeToReaded({ bIdList: id }, function (err, result) {
                    if (result) {
                        this.getInformation(thisPage, isReaded, message_type);
                        this.refreshTopMessage();
                        $('.contentFooter_l input[type=checkbox]').prop('checked', false);
                    } else {
                        alert(err);
                    }
                }, e.data);
            }
        });
        $('.delete_btn').on('click', this, function (e) {
            var index = selectCheckbox();
            if (index.length == 0) {
                alert('请先选中要删除的消息');
            }
            else {
                var id = [];
                for (var i = 0; i < index.length; i++) {
                    id.push(e.data.oData.bulletins[index[i]].id);
                }
                var proxy = cb.rest.DynamicProxy.create({
                    deleteInformation: {
                        url: 'client/Bulletins/rescindBulletin',
                        method: 'POST',
                        options: { token: true }
                    }
                });
                proxy.deleteInformation({ bIdList: id }, function (err, result) {
                    if (result) {
                        this.getInformation(thisPage, isReaded, message_type);
                        this.refreshTopMessage();
                        $('.contentFooter_l input[type=checkbox]').prop('checked', false);
                    } else {
                        alert(err);
                    }
                }, e.data);
            }
        });
        function selectCheckbox() {
            var index = [];
            var checkbox = $('.contentDiv input[type=checkbox]');
            for (var i = 0; i < checkbox.length; i++) {
                if (checkbox[i].checked == true) {
                    index.push(i);
                }
            }
            return index;
        }
    };
    view.prototype.refreshTopMessage = function () {
        var wiget = this.getWidget('topbar_subnav');
        var proxy = cb.rest.DynamicProxy.create({
            topbar_subnav: wiget.getProxy()
        });
        proxy.topbar_subnav(function (err, result) {
            wiget.runTemplate(err, result);
        });
    }
    return view;
});