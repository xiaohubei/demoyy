cb.views.register('MyEvaluationController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        var type = queryString.get("type");
        var indexFlag = false;  //用于判断是否点击了li 点击了之后再mouseout时就保留样式 否则就还原
        var this_index = -1;   //用于记录最新点击的li的index 
        //type:1==>>待评价不现实评价窗口   2==>>已评价页面   3==>>待评价页面显示评价窗口
        if (type == 2) {
            $('.haveTo').show();
            $('.tabs:eq(1)').addClass('tabactive ');
            this.getHaveEvaluation();
        }
        else {
            this.getNotEvaluation();
            $('.haveTo').hide();
            $('.tabs:eq(0)').addClass('tabactive ');
            if (type == 3) {
                $('.evaluationPanel:eq(0)').show();
                $('.evaluationlist:eq(0)').find('.evaluationBack_btn').show();
                $('.evaluationlist:eq(0)').find('.evaluation_btn').hide();
            }
        }
        $('.tabs').on('click', this,function (e) {
            $('.tabs').removeClass('tabactive ');
            $(this).addClass('tabactive ');
            if ($(this).index() == 0) {
                $('.tabsBox').css('border-bottom', 'none');
                $(this).css('border-bottom', 'none');
                $('.waitTo').show();
                $('.haveTo').hide();
                e.data.getNotEvaluation();
            } else {
                $('.waitTo').hide();
                $('.haveTo').show();
                $('.tabs:eq(1)').addClass('tabactive ');
                e.data.getHaveEvaluation();
            }
        });
    };
    view.prototype.getStrLength = function (str) {
        var byteLen = 0, len = str.length;
        for (var i = 0; i < len; i++) {
            if (str.charCodeAt(i) > 255) {
                byteLen += 2;
            }
            else {
                byteLen++;
            }
        }
        return byteLen;
    };
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getData: {
            url: 'member/Comments/query',
            method: 'GET',
            options: { token: true }
        }
    });
    view.prototype.getHaveEvaluation = function () {
        this.getHaveEvaluationInfor(1);
    };
    view.prototype.getHaveEvaluationInfor = function (p) {
        var self = this;
        this.proxy.getData({ type: 20, isGetLoginMember: true, pageIndex: p, pageSize: 5 }, function (err, result) {
            if (result) {
                if (result.models.length == 0) {
                    $('.allEvaluationPanel').html('你还没有评论过任何商品').addClass('noInformation');
                } else {
                    this.dateChangeFormat(result.models);
                    var fun1 = template.compile($('#haveEvaluationUnit').html());
                    $('.allEvaluationPanel').html(fun1({ data: result.models })).removeClass('noInformation');;
                    $('.allEvaluation').show();
                    $('.haveEvaluationPagesBtn').createPage({
                        pageCount: Math.ceil(result.modelsCount / 5),
                        current: p,
                        unbind: true,
                        backFn: function (p) {
                            self.getHaveEvaluationInfor(p);
                        }
                    });
                    //星级评价
                    for (var i = 0; i < result.models.length; i++) {
                        var movePX = (result.models[i].iStars - 1) * 20;
                        $('.show_star:eq(' + i + ")").css('background-position', '0px ' + (-81 - movePX) + 'px');
                    }
                }
            }else if (err) {
                alert(err);
            }
        }, this);
    };
    view.prototype.getNotEvaluation = function () {
        var queryString = new cb.util.queryString();
        var queryID = queryString.get("order_id")||'';
        var self = this;
        var proxy = cb.rest.DynamicProxy.create({
            getData: {
                url: 'client/Orders/getUnRemarkDetail',
                method: 'GET',
                options: { token: true, refresh: true }
            }
        });
        proxy.getData({
            cOrderNo: queryID,
            pageIndex: 1,
            pageSize: 5,
        }, function (err, result) {
            if (result) {
                if (result.orders.length == 0) {
                    $('.realWaitTo').html('暂无评论').addClass('noInformation');
                } else {
                    self.dateChangeFormat(result.orders);
                    var fun = template.compile($('#evaluationUnit').html());
                    $('.realWaitTo').html(fun({ data: result.orders })).removeClass('noInformation');
                    self.result = result;
                    self.register();
                    $('.evaluationPagesBtn').createPage({
                        pageCount: Math.ceil(result.count / 5),
                        current: 1,
                        unbind: true,
                        backFn: function (p) {
                            proxy.getData({
                                cOrderNo: queryID,
                                pageIndex: p,
                                pageSize: 5,
                            }, function (err, result) {
                                if (result) {
                                    self.dateChangeFormat(result.orders);
                                    var fun = template.compile($('#evaluationUnit').html());
                                    $('.realWaitTo').html(fun({ data: result.orders }));
                                    self.result = result;
                                    self.register();
                                }
                            });
                        }
                    });
                }
            } else if (err) {
                alert(err);
            }
        });
    };

    view.prototype.register = function () {               //给 已评论页面 注册事件
        var result = this.result;
        var self = this;
        $('.evaluation_btn').on('click', function () {
            $('.evaluationPanel,.evaluationBack_btn').hide();
            $('.evaluation_btn').show();
            $(this).hide();
            $(this).parents('.productEvaluation').find('.evaluationPanel').show();
            $(this).next().show();
            this_index = -1;
            indexFlag = false;
            $('.rating').css('background-position', '0 0');
            $('textarea.textarea').val('');
            $('.isanonymous input[type=checkbox]').prop('checked', false);
            $('.numberTip').html('10-250字');
            $('.msg-error_star,.msg-error_text').hide();
        });
        $('.evaluationBack_btn').on('click', function () {
            $(this).parents('.productEvaluation').find('.evaluationPanel').hide();
            $(this).prev().show();
            $(this).hide();
        });
        $('.evaluationPanel .rating li').on('click', function () {
            var index = $(this).index();
            $(this).parents('.productEvaluation').find('.msg-error_star').hide();
            this_index = index;
            var movePX = index * 20;
            $(this).css('background-position', '0px ' + (-81 - movePX) + 'px');
            indexFlag = true;
        });
        $('.evaluationPanel .rating li').mouseover(function () {
            var index = $(this).index();
            if (index < this_index) {
                var movePX = this_index * 20;
                $(this).css('background-position', '0px ' + (-81 - movePX) + 'px');
            } else {
                var movePX = index * 20;
                $(this).css('background-position', '0px ' + (-81 - movePX) + 'px');
            }
        });
        $('.evaluationPanel .rating').mouseout(function () {
            if (indexFlag) {
                var movePX = this_index * 20;
                $(this).css('background-position', '0px ' + (-81 - movePX) + 'px');
                indexFlag = false;
            } else { }
        });
        $('textarea.textarea').focus(function () {
            $(this).removeClass('textarea01');
        });
        $("textarea.textarea").blur(function () {
            if ($(this).val().length > 0) {
            }
            else {
                $(this).addClass('textarea01');
            }
        });
        $("textarea.textarea").on('keyup', this, function (e) {
            var byteLen = self.util.trimStr($(this).parents('.evaluationPanel').find("textarea.textarea").val()).length;
            var remaining;
            if (byteLen > 250) {
                $(this).parents('.evaluationPanel').find('.numberTip').html('字数超250了,亲');
            } else {
                if (byteLen >10 && byteLen <= 250) {
                    $(this).parents('.evaluationPanel').find(".msg-error_text").hide();
                    $(this).parents('.evaluationPanel').find('.numberTip').html('如果能多写点会更好哦~,亲');
                }else if(byteLen < 10 ){
                    $(this).parents('.evaluationPanel').find('.numberTip').html('字数不够10个,亲');
                }
            }
        });
        $('.evaluationBtn').on('click', this, function (e) {
            var self = e.data;
            if (this_index < 0) {
                $(this).parents('.productEvaluation').find('.msg-error_star').show();
            } else {
                var evaluation = self.util.trimStr($(this).parents('.evaluationPanel').find("textarea.textarea").val());
                var len = evaluation.length;
                if (len <10) {
                    $(this).parents('.evaluationPanel').find(".msg-error_text").show();
                } else {
                    if (len < 250) {
                        var i = $(this).parents('.productEvaluation').index();
                        var isChecked = $(this).next().find('input[type=checkbox]').prop('checked');
                        var proxy = cb.rest.DynamicProxy.create({
                            saveData: {
                                url: 'member/Comments/save',
                                method: 'POST',
                                options: { token: true,refresh: true }
                            }
                        });
                        proxy.saveData({
                            isMember: true,
                            model: {
                                isAnonymous:isChecked,
                                iProductSKU_Id: self.result.orders[i].iSKUId,
                                iOrderDetail_Id: self.result.orders[i].iOrderDetail_Id,
                                iOrder_Id: self.result.orders[i].iOrder_Id,
                                iProduct_Id: self.result.orders[i].iProductId,
                                iType: 20,
                                iStars: (this_index + 1),
                                cComment: evaluation
                            }
                        }, function (err, result) {
                            if (result) {
                                self.getNotEvaluation();
                            } else if (err) {
                                alert(err);
                            }
                        }, e.data);
                    } else {
                        $(this).parents('.evaluationPanel').find(".msg-error_text").show();
                    }
                }
            }
        });
    };
    view.prototype.dateChangeFormat = function (arr) {
        arr.forEach(function (item, index, array) {
            if (item.dTime) {
                item.dTime = item.dTime.split('.')[0];
            }
            if (item.dTimeReply) {
                item.dTimeReply = item.dTimeReply.split('.')[0];
            }

        });
    };
    view.prototype.util = {
        trimStr : function (str){return str.replace(/(^\s*)|(\s*$$)/g,"");},
    };
    return view;
});