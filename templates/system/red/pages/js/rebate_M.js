cb.views.register('rebateViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function (views) {
        var self = this;
        var thisView = this.getView();
        var query = this.getViewData();
        var pageData = this.getView()[0].f7PageData.query;
        //debugger;
        if (pageData.dataType == 'active') {
            var discounts = [];
            var fires = [];
            if (pageData.data) {
                pageData.data.forEach(function (item) {
                    if (pageData.selectedValue) {
                        if (pageData.selectedValue &&(item.id == pageData.selectedValue.id))
                            item.isSelect = true;
                        else
                            item.isSelect = false;
                    }
                    else
                        item.isSelect = false;
                    switch (item.pType) {
                        case 0:
                            discounts.push(item);
                            break;
                        case 1:
                            fires.push(item);
                            break;
                    }
                });
                var html = self.render($$('#activityListTpl').html(), { discounts: discounts, fires: fires });
                thisView.find('.rb-listblock-container').html(html);
            }
            var lastChooise = pageData.selectedValue ? pageData.selectedValue.id : null;
            thisView.find('.rb-listblock-container').find('input').on('change', function () {
                if ($$(this).val() == lastChooise) {
                    $$(this).prop('checked', $$(this).prop('checked'));
                }
                else {
                    thisView.find('.rb-listblock-container').find('input').prop('checked', false);
                    $$(this).prop('checked',true);
                }
                if ($$(this).prop('checked'))
                    lastChooise = $$(this).val();
                else
                    lastChooise = null;
            });
        }
        else if (pageData.dataType == 'express') {
            thisView.find('.navbar .center').html('包邮活动');
            var html = self.render($$('#expressTpl').html(), pageData.data);
            thisView.find('.rb-listblock-container').html(html);
            if (pageData.selectedValue) {
                thisView.find('.rb-listblock-container').find('input[value="' + pageData.selectedValue.isPost + '"]').prop('checked', true);
            }
        }
        else if (pageData.dataType == 'payType') {
            thisView.find('.navbar .center').html('支付方式');
            var selectValue = pageData.selectedValue ? pageData.selectedValue : "FIRSTPAY";
            for (var i = 0; i < pageData.data.length; i++) {
                if (pageData.data[i].id == selectValue)
                    pageData.data[i].isChecked = true;
                else
                    pageData.data[i].isChecked = false;
            }

            var html = self.render($$('#payTypeTpl').html(), { oPayType: pageData.data });
            thisView.find('.rb-listblock-container').html(html);
        }

        thisView.find('.btn-rebate-save').on('click', function () {
            if (pageData.dataType == 'active') {
                var val = thisView.find('.rb-listblock-container').find('input:checked').val();
                var selectItem = pageData.data.filter(function (item) {
                    return item.id == val;
                });
                myApp.mainView.router.back({
                    query: {
                        data: selectItem[0],
                        dataType: pageData.dataType
                    }
                });
            }
            else if (pageData.dataType == 'express') {
                var val = thisView.find('.rb-listblock-container').find('input:checked').val();
                myApp.mainView.router.back({
                    query: {
                        data: {
                            isPost: val == 'true' ? true : false,
                            isPostage: pageData.data.isPostage
                        },
                        dataType: pageData.dataType
                    }
                });
            }
            else if (pageData.dataType == 'payType') {
                var val = thisView.find('.rb-listblock-container').find('input:checked').val();
                var selectPayType = pageData.data.filter(function (item) {
                    return item.id == val;
                })[0];
                myApp.mainView.router.back({
                    query: {
                        data: {
                            payType: selectPayType
                        },
                        dataType: pageData.dataType
                    }
                });
            }
        });
    }
    return view;
});