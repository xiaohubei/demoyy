
/** data参数说明：
*** title: 提示的标题(默认为：提示信息)
*** message:消息内容：(需传入)
*** confirm:是否是确认框(默认为false)
*** time:提示消息显示时间(默认为1s)
*** okCallback:确认框点击确认后的回调(需传入)
*** cb:提示框1.5s消失后的回调(需传入)
*** width:弹出框的宽度(默认为650)
*/
//模态窗口提示
var ModalTip = function (data, context) {
    if (!data) return;
    ModalTip.init()
    var defaltData = {
        title: "提示信息",
        message: "",
        confirm: false,
        time: 1500,
        width: 500
    };
    data = ModalTip.dataMerge(defaltData, data)
    var txt = ModalTip.htmlCreate(data);
    var html = context.render(txt, { modal: data }, false);
    $("#modal").empty().append(html);
    $('#myModal').modal({
        backdrop: 'static'
    });
    if (data.cb) {
        setTimeout(function () {
            data.cb();
        }, data.time)
    };
    if (data.okCallback) {
        ModalTip.ok(data)
    };
    if (data.cancelCallback) {
        ModalTip.hide(data)
    }
};
//初始化
ModalTip.init = function () {
    if (!$('#modal').length) {
        $('body').append('<div id="modal" class="row"></div>');
    }
}
//点击确认后的回调
ModalTip.ok = function (data) {
    $('#modalSure').click(function () {
        $('#myModal').modal('hide');
        setTimeout(function () {
            data.okCallback();
        }, 500)
    })
}
//关闭提示框
ModalTip.hide = function (data) {
    $('#modalCancel').click(function () {
        $('#myModal').modal('hide');
        setTimeout(function () {
            if (data.cancelCallback) {
                data.cancelCallback();
            }
        }, 500)
    })
}
//显示提示框
ModalTip.show = function (data) {
    $('#myModal').modal(data);
}
//提示框的html结构
ModalTip.htmlCreate = function (data) {
    var html = '<div class="modal fade" id="myModal">'
		            + '<div class="modal-dialog" style="width:<#=modal.width#>px">'
		                + '<div class="modal-content">'
		                    + '<div class="modal-header">'
		                      + '<button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>'
		                      + '<h4 class="modal-title"><#=modal.title#></h4>'
		                    + '</div>'
		                    + '<div class="modal-body  col-xs-12">'
		                    	 + '<p style="word-break: break-all"><#=modal.message#></p>'
		                    + '</div>'
		                    + '<div class="modal-footer">'
		                      + '<#if(modal.confirm){#>'
		                        + '<button type="button" class="btn btn-primary" id="modalSure" data-dismiss="modal">确定</button>'
		                        + '<button type="button" class="btn btn-default" id="modalCancel"  data-dismiss="modal">取消</button>'
		                      + '<#}else{#>'
		                        + '<button type="button" class="btn btn-default" id="modalSure" data-dismiss="modal">确定</button>'
		                      + '<#}#>'
		                    + '</div>'
		                + '</div>'
		            + '</div>'
		        + '</div>';
    return html;
};

//数据合并功能
ModalTip.dataMerge = function (target, src) {
    if (!src || typeof src != 'object') return target;
    target = target || {};
    var s, t;
    //处理数组的扩展
    if (src instanceof Array) {
        target = target instanceof Array ? target : [];
    }
    for (var i in src) {
        s = src[i];
        t = target[i];
        if (s && typeof s == 'object') {
            if (typeof t != 'object') t = {};
            target[i] = cb.extend(t, s);
        } else if (s != null) {
            target[i] = s;
        }
    }
    return target;
};