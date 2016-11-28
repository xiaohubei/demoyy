cb.views.register('ArticleController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        var articleId = queryString.get("articleId");
        var wigetType = queryString.get("wigetType");
        var proxy = cb.rest.DynamicProxy.create({
            getAticles: {
                url: "client/Articles/getArticleById",
                method: 'GET',
            }
        });
        proxy.getAticles({ articleid: articleId }, function (err, result) {
            if (err) {
                alert(err);
                return;
            }
            var data=result.types;
            var str = "";
            str += "<a href='/home'>首页</a>";
            for(var i=(data.length-1);i>=0;i--){
                str += '<a href="classification?typeId=' + data[i].id + "&wigetType=" + wigetType + '">' + data[i].pagename + '</a>';
            }
            $('.navPath').html(str);
            $('.articleTitle').html(result.articleBody.articleIndex.title);
            $('.articleContent').html(result.articleBody.content);
        },this);
    };
    return view;
});