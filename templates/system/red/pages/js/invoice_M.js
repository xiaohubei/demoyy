cb.views.register('invoicePageController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function (views) {
        var self = this;
        var thisView = this.getView();
        var query = this.getViewData().query;

        var container = $$('div[data-page="invoice"] .invoiceTypeContent');
        if (query.oInvoiceType) {
            var option = '';
            for (var i = 0; i < query.oInvoiceType.length; i++) {
                var item = query.oInvoiceType[i];
                option += '<div class="pay-style">' +
                                '<input type="radio" name="cinvoiceType" data-text="' + item.name + '" value="' + item.id + '">' +
                                '<span>' + item.name + '</span>' +
                          '</div>';
            }
            container.html(option);
        }
        if (query.oInvoiceContent) {
            var option = '';
            for (var i = 0; i < query.oInvoiceContent.length; i++) {
                var item = query.oInvoiceContent[i];
                option += '<div class="pay-style">';
                if (i == 0)
                    option += '<input type="radio" name="cInvoiceContent" data-text="' + item + '" value="' + item + '" checked>';
                else
                    option += '<input type="radio" name="cInvoiceContent" data-text="' + item + '" value="' + item + '">';
                option += '<span>' + item + '</span></div>';
            }
            $$('div[data-page="invoice"] .invoiceContentContainer').html(option);
        }

        thisView.find('.invoiceTypeContent .pay-style').on('click', function () {
            $$(this).children('input').prop('checked', true);
            if ($$(this).children('input').val() == 'NONE')
                thisView.find("#invoice_form li").eq(0).nextAll().hide();
            else
                thisView.find("#invoice_form li").eq(0).nextAll().show();
        });

        thisView.find('.invoiceContentContainer .pay-style').on('click', function () {
            $$(this).children('input').prop('checked', true);
        });

        if (query.cInvoiceType) {
            myApp.formFromJSON('#invoice_form', query);
            $$("#invoice_form li").find('input[value="' + query.cInvoiceType + '"]').prop('checked', true);
            if (query.cInvoiceType == 'NONE')
                $$("#invoice_form li").eq(0).nextAll().hide();
        }
        else
            $$("#invoice_form li").find('input[value="NONE"]').prop('checked', true);

        //保存发票信息
        $$('div[data-page="invoice"] .btn-red.invoice_save').on('click', function () {
            var formData = myApp.formToJSON('#invoice_form');

            var invoiceData = query;
            invoiceData.cInvoiceName = $$("#invoice_form li").find('input:checked').attr('data-text');
            invoiceData.cInvoiceType = $$("#invoice_form li .invoiceTypeContent").find('input:checked').val();
            for (var attr in formData) {
                var attrValue = formData[attr];
                if (invoiceData.hasOwnProperty(attr))
                    invoiceData[attr] = attrValue;
            }
            myApp.mainView.router.back({
                query: {
                    invoiceData: invoiceData
                }
            });
        });
    }
    return view;
});