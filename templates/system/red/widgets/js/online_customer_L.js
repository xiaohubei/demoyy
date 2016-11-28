//var online = new Array();
cb.widgets.register('online_customer', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;
    widget.prototype.widgetType = widgetType;
    widget.prototype.getProxy = function () {
        return { url: 'client/Corprations/getContactWays', method: 'GET' };
    }
    widget.prototype.runTemplate = function (error, result) {
        var result =[{
                cContactNum:"809651992",
                cType:"qq",
                iCorpId:21,
                iPosition:1,
                id:29,
                }];
        var _this = this;
        if (error) return;
        var onlineList = {};
        onlineList.list = [];
        onlineList.phoneList = [];
        for (var i = 0; i < result.length; i++) {
            if (result[i].cType == "qq") {
                onlineList.list.push(result[i]);
            } else {
                onlineList.phoneList.push(result[i]);
            }
        }
        if (onlineList.list.length > 0) {
            $('.onlineCustomerContent').show();
            var html = _this.render(onlineList);
            _this.getElement().find('.onlineCustomerContent').html(html);
        } else {
            $('.onlineCustomerContent').hide();
        }
        //var qqString = "";
        //for (var j = 0; j < onlineList.list.length; j++) {
        //    qqString += onlineList.list[j].cContactNum + ":";
        //}
        //var url = "http://webpresence.qq.com/getonline?Type=1&" + qqString;
        //$.ajax({
        //    method: "GET",
        //    url: url,
        //    dataType: "jsonp",
        //    success: function (data) {
        //    },
        //    error: function (data) {
        //        for (var k = 0; k < onlineList.list.length; k++) {
        //            onlineList.list[k].isOnline = online[k] == 1 ? true : false;
                    
        //        }
        //        var html = _this.render(onlineList);
        //        _this.getElement().find('.onlineCustomerContent').html(html);
        //        // 在线客服显示
        //        $("#aFloatTools_Show").click(function () {
        //            $('#divFloatToolsView').animate({ width: 'show', opacity: 'show' }, 100, function () { $('#divFloatToolsView').show(); });
        //            $('#aFloatTools_Show').hide();
        //            $('#aFloatTools_Hide').show();
        //        });
        //        // 在线客服隐藏
        //        $("#aFloatTools_Hide").click(function () {
        //            $('#divFloatToolsView').animate({ width: 'hide', opacity: 'hide' }, 100, function () { $('#divFloatToolsView').hide(); });
        //            $('#aFloatTools_Show').show();
        //            $('#aFloatTools_Hide').hide();
        //        });
        //    }
        //});
        
       
        // 在线客服显示
        $("#aFloatTools_Show").click(function () {
            $('#divFloatToolsView').animate({ width: 'show', opacity: 'show' }, 100, function () { $('#divFloatToolsView').show(); });
            $('#aFloatTools_Show').hide();
            $('#aFloatTools_Hide').show();
        });
        // 在线客服隐藏
        $("#aFloatTools_Hide").click(function () {
            $('#divFloatToolsView').animate({ width: 'hide', opacity: 'hide' }, 100, function () { $('#divFloatToolsView').hide(); });
            $('#aFloatTools_Show').show();
            $('#aFloatTools_Hide').hide();
        });
      

    };
    return widget;
});
