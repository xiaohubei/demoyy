cb.views.register('ClassificationController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var self=this;
        this.loginLogout();
        var queryString = new cb.util.queryString();
        var typeId = queryString.get("typeId");
        var wigetType = queryString.get("wigetType");
        var proxy = cb.rest.DynamicProxy.create({
            getAticles: {
                url: "client/Articles/getArticlesByType",
                method: 'GET',
            }
        });
        proxy.getAticles({ typeId: typeId }, function (err,result) {
            if (err) {
                alert(err);
                return;
            }
            var html = self.render($('#classificationQuestions').html(), { data: result.pager.data }, false);
            $('.classificationList').html(html);
            var data = result.types;
            var str = "";
            str += "<a href='/home'>首页</a>";
            for (var i = (data.length - 1) ; i >= 0; i--) {
                str += '<a href="classification?typeId=' + data[i].id + "&wigetType="+wigetType+'">' + data[i].pagename + '</a>';
            }
            $('.navPath').html(str);
            $('.classificationList li').on('click', function(e){
                var articleId = $(this).attr('data-id');
                window.location.href = "article?typeId=" + typeId + '&articleId=' + articleId + '&wigetType='+wigetType;
            });
        });
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