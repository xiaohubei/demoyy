cb.views.register('MyHistoryViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    // 初始化
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getHistories: {
            url: 'client/ProductViewHistorys/getHistories',
            method: 'GET',
            options: {
                token: true,
                autoLogin: false,
                mask: true
            }
        },
        delete: {
            url: 'client/ProductViewHistorys/delete',
            method: 'POST',
            options: {
                token: true,
                autoLogin: false
            }
        }
    });
    view.prototype.once = function () {
        var self = this;
        var thisView = this.getView();
        thisView.find('.edit').click(function () {
            if (thisView.find('#myCollectionList ul li label').length == 0) {
                myApp.toast('没有可编辑的足迹内容', 'tips').show(true)
            } else {
                if ($$(this).hasClass('edit-confirm')) {
                    $$(this).html('编辑').removeClass('edit-confirm');
                } else {
                    $$(this).html('完成').addClass('edit-confirm');
                }
                thisView.find('label,.toolbar').toggleClass('hidden');
                thisView.find('#myCollectionList ul li label input').prop('checked', false);
            }
        });
        thisView.find('.toolbar .cancel,.toolbar .delete').click(function () {
            thisView.find('.edit').removeClass('edit-confirm').html('编辑');
            if ($$(this).hasClass('cancel')) {
                debugger;
                thisView.find('label,.toolbar').toggleClass('hidden');
                thisView.find('#myCollectionList ul li label input').prop('checked', false);
                thisView.find('.checkboxAll').prop('checked', false);
            } else {
                var domDelete = thisView.find('#myCollectionList ul li .item-label input:checked');
                if (domDelete.length == 0) {
                    myApp.toast('请选择要删除的记录', 'tips').show(true)
                } else {
                    var ids = [];
                    for (var i = 0; i < domDelete.length; i++) {
                        var id = domDelete.eq(i).parents('li').attr('data-id');
                        ids.push(parseInt(id))
                    }
                    self.proxy.delete({
                        ids: ids
                    }, function (err, result) {
                        if (err) {
                            myApp.toast(err.message, 'error').show(true)
                        } else {
                            ids.forEach(function (item) {
                                thisView.find('ul li[data-id="' + item + '"]').remove();
                            });
                            var $date = thisView.find('.date-check');
                            for (var i = 0; i < $date.length; i++) {
                                var theDate = $date.eq(i).attr('data-val');
                                if ($$('#myCollectionList').find('.item-label[data-val="' + theDate + '"]').length == 0) {
                                    $date.eq(i).parent('li').remove();
                                }
                            }
                            thisView.find('label,.toolbar').addClass('hidden');
                        }
                    }, self)
                }
            }
        });

    }
    view.prototype.init = function () {
        var thisView = this.getView();
        this.proxy.getHistories({}, function (err, result) {
            if (result) {
                var json = {};
                result.pager.data.forEach(function (item) {
                    if (item.firstViewPrice > item.fSalePrice) {
                        item.isShowMarkPrice = true;
                    } else {
                        item.isShowMarkPrice = false;
                    }
                    item.fSalePrice = parseFloat(item.fSalePrice).toFixed(2);
                    item.firstViewPrice = parseFloat(item.firstViewPrice).toFixed(2);
                    item.viewDate = item.viewDate.split(' ')[0];
                    if (!json[item.viewDate]) {
                        json[item.viewDate] = [];
                    }
                    json[item.viewDate].push(item);
                });
                var arr = [];
                for (var k in json) {
                    arr.push({
                        name: [k],
                        values: json[k]
                    })
                }

                if (arr.length > 0)
                    thisView.find('.right.edit').text('编辑');
                else
                    thisView.find('.right.edit').text('');
                var html = this.render(thisView.find('#myHistoryTpl').html(), {
                    data: arr
                });
                thisView.find('.list-block ul').html(html);
                this.register(thisView);
            }
        }, this);
    }
    view.prototype.register = function (thisView) {
        var self = this;
        thisView.find('.delete-icon').click(function (e) {
            var $that = $$(this);
            e.stopPropagation();
            self.proxy.delete({
                ids: [$$(this).attr('data-id')]
            }, function (err, result) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true)
                } else {
                    $that.parents('li').remove();
                    var $date = thisView.find('.date-check');
                    for (var i = 0; i < $date.length; i++) {
                        var theDate = $date.eq(i).attr('data-val');
                        if ($$('#myCollectionList').find('.item-label[data-val="' + theDate + '"]').length == 0) {
                            $date.eq(i).parent('li').remove();
                        }
                    }
                }
            }, self)
        });
        thisView.find('label input').change(function (e) {
            var isChecked = $$(this).prop('checked');
            var $label = $$(this).parents('label');
            if ($label.hasClass('all-check')) {
                //全选按钮
                var $inputs = thisView.find('#myCollectionList label').find('input');
                if (isChecked) {
                    //选中
                    $inputs.prop('checked', true);
                } else {
                    $inputs.prop('checked', false);
                }
            } else if ($label.hasClass('date-check')) {
                //选择日期
                var theDate = $label.attr('data-val');
                var $item = $$('#myCollectionList').find('.item-label[data-val="' + theDate + '"] input');
                if (isChecked) {
                    //选中
                    $item.prop('checked', true);
                    var dateLength = thisView.find('.dateClass').length;
                    var checkedDate = thisView.find('.dateClass label input:checked').length;
                    if (dateLength == checkedDate) {
                        thisView.find('.all-check input').prop('checked', true);
                    }
                } else {
                    $item.prop('checked', false);
                    $$('.all-check').find('input').prop('checked', false);
                }
            } else {
                //单条记录选中
                var theDate = $label.attr('data-val');
                var $dateLabel = $$('#myCollectionList').find('.date-check[data-val="' + theDate + '"] input');
                var $itemLabel = $$('#myCollectionList').find('.item-label[data-val="' + theDate + '"] input');
                var $itemCheckedLabel = $$('#myCollectionList').find('.item-label[data-val="' + theDate + '"] input:checked');
                if (isChecked) {
                    //选中
                    var length = $itemLabel.length;
                    var checkedLength = $itemCheckedLabel.length;
                    if (length == checkedLength) {
                        $dateLabel.prop('checked', true);
                    }
                    var dateLength = thisView.find('.dateClass').length;
                    var checkedDate = thisView.find('.dateClass label input:checked').length;
                    if (dateLength == checkedDate) {
                        thisView.find('.all-check input').prop('checked', true);
                    }
                } else {
                    $dateLabel.prop('checked', false);
                    thisView.find('.all-check input').prop('checked', false);
                }
            }
        });
        thisView.find('.media-list li').click(function (e) {
            if (thisView.find('.edit').hasClass('edit-confirm')) {
                //buzuochuli 
            } else {
                //myApp.mainView.loadPage("../detail?goods_id="+$$(this).attr('data-pid'));	
            }
        });
        //下拉刷新
        self.getView().find('.page-content.pull-to-refresh-content').on('refresh', function (e) {
            //if (thisView.find('.edit').hasClass('edit-confirm')) {

            //} else {
            //    self.proxy.getHistories({}, function (err, result) {
            //        if (result) {
            //            var json = {};
            //            result.pager.data.forEach(function (item) {
            //                item.viewDate = item.viewDate.split(' ')[0];
            //                if (!json[item.viewDate]) {
            //                    json[item.viewDate] = [];
            //                }
            //                json[item.viewDate].push(item);
            //            });
            //            var arr = [];
            //            for (var k in json) {
            //                arr.push({
            //                    name: [k],
            //                    values: json[k]
            //                })
            //            }
            //            var html = self.render(thisView.find('#myHistoryTpl').html(), {
            //                data: arr
            //            });
            //            thisView.find('.list-block ul').html(html);
            //            self.register(thisView);
            //        }
            //    })
            //}
            self.proxy.getHistories({}, function (err, result) {
                if (result) {
                    var json = {};
                    result.pager.data.forEach(function (item) {
                        item.viewDate = item.viewDate.split(' ')[0];
                        if (!json[item.viewDate]) {
                            json[item.viewDate] = [];
                        }
                        json[item.viewDate].push(item);
                    });
                    var arr = [];
                    for (var k in json) {
                        arr.push({
                            name: [k],
                            values: json[k]
                        })
                    }
                    var html = self.render(thisView.find('#myHistoryTpl').html(), {
                        data: arr
                    });
                    thisView.find('.list-block ul').html(html);
                    thisView.find('.edit').html('编辑').removeClass('edit-confirm');
                    self.register(thisView);
                }
            })
            myApp.pullToRefreshDone();
        });
    }
    return view;
});