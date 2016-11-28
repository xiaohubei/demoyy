cb.views.register('MemberViewController', function (controllerName) {
    var view = function (widgets) { cb.views.BaseView.call(this, widgets); };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getMemberInfo: { url: 'member/Members/getMemberByToken', method: 'GET', options: { token: true, mask: true } },
        getData: { url: 'client/Bulletins/getDifBulletins',method: 'GET',options: {token: true}},
        getOrdersNum: { url: 'client/Orders/getOrderStyleCount', method: 'post', options: { token: true} }
    });
    view.prototype.renderMemberInfo = function (result) {
        if (!result) return;
        var self = this;
        var $userInfo = this.getView().find('#user-info');
        var userInfoHtml = this.render(self.getView().find('#tpl-user-info'), { userInfo: result });
        $userInfo.html(userInfoHtml);
        this.orderNumTip();
    };
    view.prototype.orderNumTip = function () {
        this.proxy.getOrdersNum({ pageIndex: 1, pageSize: 10 }, function (err, result) {
            if (err) {
                console.log(err.message);
                return;
            };
            var flag = true;
            var tabNav = $$("#tabNav").find(".my-order");
            for(var k=0; k< tabNav.length; k++){
                flag = true;
                for (var i = 0; i < result.length; i++) {
                    if($(tabNav[k]).data("filter") == result[i][0] && $(tabNav[k]).data("filter") !="ENDORDER" ){
                        $(tabNav[k]).find("span").addClass('num').text(result[i][1]);
                        flag = false;
                    }
                };
                if(flag){
                    $(tabNav[k]).find("span").removeClass('num').text("")
                }
            }
        });
    };
    view.prototype.renderShortCut = function () {
        var data = this.shortCutData;
        if (!data.length) return;
        var shortCutTpl = $$("#shortCutTpl").html();
        var shortCutHtml = this.render(shortCutTpl, { data: data });
        if ($$('div[data-page="user"].page').length == 2) {
            $$('.page.page-on-center #shortCut').html(shortCutHtml);
        } else {
            $$("#shortCut").html(shortCutHtml);
        }
    };
    view.prototype.util = {
        replaceBackslash: function (url) {
            if (!url) return;
            var re = /\\/g;
            url = url.replace(re, '/');
            return url;
        }
    };
    view.prototype.shortCutData = [
        {
            title: "储值卡",
            icon: "storagecard",
            link: "member/mystoragecard"
        },
        {
            title: "礼品卡",
            icon: "mygiftcard",
            link: "member/myGiftcard"
        },
        {
            title: "优惠券",
            icon: "mycoupon",
            link: "member/mycoupon"
        },
        {
            title: "积分",
            icon: "myintegral",
            link: "member/myintegral"
        },
        {
            title: "收藏夹",
            icon: "mycollection",
            link: "member/myCollection"
        },
        {
            title: "足迹",
            icon: "myfootprint",
            link: "member/myhistory"
        },
        {
            title: "咨询",
            icon: "myconsult",
            link: "member/myconsulting"
        },
        {
            title: "消息",
            icon: "mymessage",
            link: "member/mymessage"
        },
        {
            title: "收货地址",
            icon: "myaddress",
            link: "member/addrList"
        },
        {
            title: "个人信息",
            icon: "myinfo",
            link: "member/memberInfor"
        },
        {
            title: "安全中心",
            icon: "mysecurity",
            link: "member/accountSafety"
        }
    ];
    view.prototype.getMemberInfo = function () {
        this.proxy.getMemberInfo({}, function (err, result) {
            if (err) {
                if (err.code == '999')
                    cb.route.redirectLoginPage();
                else
                    myApp.toast("获取会员信息失败" + err.message).show(true);
                return;
            };
            if (result) {
                result.cPortrait = this.util.replaceBackslash(result.cPortrait);
                this.renderMemberInfo(result);
                this.proxy.getData({
                    pageIndex: 1,
                    pageSize: 5,
                    bReaded: false,
                    message_type: 'all'
                }, function (err1, result1) {
                    if (result1.count > 0) {
                        this.getView().find('.messageIcon').show();
                    }
                }, this);
            };
        }, this);
    };
    view.prototype.init = function () {
        this.getMemberInfo();
        this.renderShortCut();
    };
    view.prototype.afterFromPageBack = function(data){
        this.getMemberInfo();
    };
    return view;
});