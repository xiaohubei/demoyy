cb.views.register('couponViewController', function (controllerName) {
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


        if (pageData.data) {
            for (var index = 0; index < pageData.data.availableMemberCoupon.length; index++) {
                pageData.data.availableMemberCoupon[index].expireStartDate = pageData.data.availableMemberCoupon[index].expireStartDate.split(' ')[0].replace(/\-/g, '.');
                pageData.data.availableMemberCoupon[index].expireEndDate = pageData.data.availableMemberCoupon[index].expireEndDate.split(' ')[0].replace(/\-/g, '.');
                if (pageData.selectedValue) {
                    if (pageData.data.availableMemberCoupon[index].couponCoding == pageData.selectedValue.couponCoding)
                        pageData.data.availableMemberCoupon[index].isChecked = true;
                    else
                        pageData.data.availableMemberCoupon[index].isChecked = false;
                }
                pageData.data.availableMemberCoupon[index].colorId = 'bg-' + pageData.data.availableMemberCoupon[index].couponId % 4;
            }
            for (var index = 0; index < pageData.data.unavailableMemberCoupon.length; index++) {
                pageData.data.unavailableMemberCoupon[index].expireStartDate = pageData.data.unavailableMemberCoupon[index].expireStartDate.split(' ')[0].replace(/\-/g, '.');
                pageData.data.unavailableMemberCoupon[index].expireEndDate = pageData.data.unavailableMemberCoupon[index].expireEndDate.split(' ')[0].replace(/\-/g, '.');
            }
        }
        thisView.find('.coupon-div.coupon-content-container').html(this.render($$('#couponContentTpl').html(), pageData.data));
        if (pageData.data.availableCount == 0)
            thisView.find('.coupon-div.coupon-content-container').find('.noDataTip').removeClass('hide');

        thisView.find('.couponChoose_save.button').on('click', function () {
            var selectItem = null;

            if (thisView.find('.coupon-div.coupon-content-container').find('input:checked').length) {
                var couponId = thisView.find('.coupon-div.coupon-content-container').find('input:checked').val();
                selectItem = pageData.data.availableMemberCoupon.filter(function (item) {
                    return item.couponCoding == couponId;
                })[0];
            }
            myApp.mainView.router.back({
                query: {
                    data: selectItem,
                    dataType: pageData.dataType
                }
            });
        });

        thisView.find('#tabSwitch').children().on('click', function () {
            $$(this).parent().children().removeClass('active');
            $$(this).addClass('active');

            var dataType = $$(this).attr('data-type');
            thisView.find('.coupon-div.coupon-content-container').children('li').each(function () {
                if (dataType == $$(this).attr('data-type'))
                    $$(this).removeClass('hide');
                else
                    $$(this).addClass('hide');
            });
            if (thisView.find('.coupon-div.coupon-content-container').children('li[data-type="' + dataType + '"]').length == 0)
                thisView.find('.coupon-div.coupon-content-container').find('.noDataTip').removeClass('hide');
            else
                thisView.find('.coupon-div.coupon-content-container').find('.noDataTip').addClass('hide');

        });

        var lastClickItem = pageData.selectedValue ? pageData.selectedValue.couponCoding : null;

        thisView.find('.coupon-div.coupon-content-container').children('li').on('change', function (e) {
            var isChecked = $$(this).find('input[type="checkbox"]').prop('checked');

            if (isChecked)
                lastClickItem = $$(this).find('input[type="checkbox"]').val();
            else
                lastClickItem = null;

            thisView.find('.coupon-div.coupon-content-container').find('input:checked').each(function () {
                if (lastClickItem && $$(this).val() != lastClickItem)
                    $$(this).prop('checked', false);
            });
        });

    };
    return view;
});