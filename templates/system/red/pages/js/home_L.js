cb.views.register('HomeViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getCorpBaseMsg: { url: '/client/Corprations/getCorpBaseMsg', method: 'GET', options:{token:true}},
        logout: { url: 'client/MemberLogin/logout', method: 'GET', options: { token: true}},
        getCartList: {url: 'client/ShoppingCarts/getCartList', method: 'GET', options: { token: true }},
    });
    view.prototype.init = function () {
        this.loginLogout();
    };
    view.prototype.loginLogout = function (){
        var self = this;
        var token = cb.rest.AppContext.token;
        var userName = cb.rest.AppContext.cUserName;
        var upHeader = $(".up-header");
        var welcome = $(".up-header .welcome");
        if (!token) {
            $(".up-header .login").show();
            if (userName) {
                welcome.html(welcome.html() + ', ' + userName);
            }
        } else {
            $(".up-header .logout").hide();
            welcome.html(userName + ', ' + welcome.html());
        }
        $(".up-header .logout").click(function (e){
            self.proxy.logout(function (err, result) {
                if (err) return;
                //localStorage.removeItem('userData');
                cb.data.CookieParser.delCookie('token');
                $(".up-header .login").hide();
                $(".up-header .logout").show();
                //location.href = '/';
            });
        });
        $(".up-header .pull-right .cygqrcode").hover(function (){
            $(".up-header .cygqrcode img").show();
        }, function (){
            setTimeout(function (){
                $(".up-header .cygqrcode img").hide();
            },1000);
        });
    };
    return view;
});