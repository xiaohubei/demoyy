cb.widgets.register('TopbarMember', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;

    widget.prototype.getProxy = function () {
        return { url: '/client/Corprations/getCorpBaseMsg', method: 'GET' };
    };

    widget.prototype.runTemplate = function (error, result) {
        if (result && result.siteName) {
            var $span = this.getElement().children('span');
            $span.html($span.html() + result.siteName);
        }
        var nologinDiv = this.getElement().children('div').first();
        var loginDiv = this.getElement().children('div').last();
        loginDiv.children().last().click(function () {
            var proxy = cb.rest.DynamicProxy.create({ logout: { url: 'client/MemberLogin/logout', method: 'GET', options: { token: true}} });
            proxy.logout(function (err, result) {
                if (err) return;
                //localStorage.removeItem('userData');
                cb.data.CookieParser.delCookie('token');
                //nologinDiv.css('display', 'inline-block');
                //loginDiv.css('display', 'none');
                location.href = '/';
            });
        });
        var token = cb.rest.AppContext.token;
        var userName = cb.rest.AppContext.cUserName;
        if (!token) {
            nologinDiv.css('display', 'inline-block');
            if (userName) {
                var $login = nologinDiv.children().first();
                $login.html(userName + ', ' + $login.html());
            }
        } else {
            loginDiv.css('display', 'inline-block');
            loginDiv.children().first().html(userName);
        }
    };

    return widget;
});