﻿cb.widgets.register('Product_list', function (widgetType) {
    var widget = function (id, options) {
        cb.widgets.BaseWidget.call(this, id, options);
    };
    widget.prototype = new cb.widgets.BaseWidget();
    widget.prototype.widgetType = widgetType;
    widget.prototype.getProxy = function () {
        return {url: 'client/Products/getProductList',method: 'POST',options: { token: true }
        };
    }
    widget.prototype.runTemplate = function (error, result) {
        var currentPage = 1;
        var totalPage = result.totalPage;
        if (error) return;
        var self = this;;
        //对价格进行二位小数处理
        result = self.priceToFixed(result);
        var html = self.render({list: result});
        self.getElement().children('.productlist').html(html);
        var proxy = cb.rest.DynamicProxy.create({
            getProductList: { url: 'client/Products/getProductList', method: 'POST', options: { token: true, mask: true } }
        });
        var queryString = new cb.util.queryString();
        // 是否积分商品标识
        var isSalePoints = queryString.get("isSalePoints");
        var data = {
            pagesize: 12,
            pageindex: 1,
            where: []
        }
        // 是积分商品
        if (isSalePoints) {
            var obj = {
                "fieldname": "productAttribute",
                "valuefrom": "2",
            }
            data.where.push(obj);
        } else {
            var obj = {
                "fieldname": "productAttribute",
                "valuefrom": "1",
            }
            data.where.push(obj);
        }
        var copyWhere = []
        var query = new cb.util.queryString().query;
        for (key in query) {
            var json = {};
            json.fieldname = key;
            json.valuefrom = query[key]
            data.where.push(json);
            copyWhere.push(json);
        }
        $('.list-conditions').click(function (e) {
            var fieldname = $(e.target).attr('data-type');
            // 积分商品按价格排序
            if ($(e.target).hasClass('sortByPrice')) {
                if (isSalePoints) {
                    fieldname = "salePoints";
                } else {
                    fieldname = $(e.target).attr('data-type');
                }
            }
            if (fieldname == "iOrder") {
                $(e.target).find('i').css('background-position', '-8px 0');
            }
            if ($(e.target).hasClass('sorting')) {
                $('.sorting').removeClass('onHover');
                $(e.target).addClass('onHover');
                var direction = $(e.target).attr('data-value');
                data.order = [{
                    fieldname: fieldname,
                    direction: direction
                }];
                if (!$(e.target).hasClass('sortByPrice')) {
                    $('.sortByPrice').attr('data-value', 'asc');
                    $('.sortByPrice').find('i').css('background-position', '0 0');
                } else {
                    if (direction == 'desc') {
                        $(e.target).find('i').css('background-position', '');
                        $('.sortByPrice').attr('data-value', 'asc');
                    } else {
                        $('.sortByPrice').attr('data-value', 'desc');
                        $(e.target).find('i').css('background-position', '-24px 0');
                    }
                }
                data.pagesize = 12;
                data.pageindex = 1;
                proxy.getProductList({ queryCondition: data }, function (err, result) {
                    result = self.priceToFixed(result);
                    var totalPage = result.totalPage;
                    var html = self.render({ list: result });
                    self.getElement().children('.productlist').html(html);
                    self.collection(self);
                    if (result.data.length > 0) {
                        $('.aboutpage').createPage({
                            pageCount: totalPage,
                            current: currentPage,
                            unbind: true,
                            backFn: function (p) {
                                data.pagesize = 12;
                                data.pageindex = p;
                                proxy.getProductList({ queryCondition: data }, function (err, result) {
                                    result = self.priceToFixed(result);
                                    var html = self.render({ list: result });
                                    self.getElement().children('.productlist').html(html);
                                    self.collection(self);
                                });;
                            }
                        });
                    }
                   
                });
            } else if ($(e.target).hasClass('two-search')) {
                var minPrice = $('input.search-price:eq(0)').val();
                var maxPrice = $('input.search-price:eq(1)').val();
                if (!isNaN(minPrice) && !isNaN(maxPrice)) {
                    var $search = $('.two-search');
                    data.where = copyWhere.concat([]);
                    // 是积分商品
                    if (isSalePoints) {
                        var obj = {
                            "fieldname": "productAttribute",
                            "valuefrom": "2",
                        }
                        data.where.push(obj);
                    } else {
                        var obj = {
                            "fieldname": "productAttribute",
                            "valuefrom": "1",
                        }
                        data.where.push(obj);
                    }
                    if ($('input.two-search').prop('checked')) {
                        data.where.push({
                            fieldname: 'displayHasInventory',
                            valuefrom: true
                        });
                    }
                    if ($('input.search-keyword').val()) {
                        data.where.push({
                            fieldname: 'keyword',
                            valuefrom: $('input.search-keyword').val()
                        });
                    }
                    // 积分商品按积分搜索
                    if (isSalePoints) {
                        if (minPrice && maxPrice) {
                            data.where.push({
                                fieldname: 'salepoints',
                                valuefrom: parseInt(minPrice),
                                valueto: parseInt(maxPrice)
                            });
                        } else {
                            if (minPrice) {
                                data.where.push({
                                    fieldname: 'salepoints',
                                    valuefrom: parseInt(minPrice)
                                });
                            }
                            if (maxPrice) {
                                data.where.push({
                                    fieldname: 'salepoints',
                                    valueto: parseInt(maxPrice)
                                });
                            }
                        }
                    } else {
                        if (minPrice && maxPrice) {
                            data.where.push({
                                fieldname: 'saleprice',
                                valuefrom: parseFloat(minPrice),
                                valueto: parseFloat(maxPrice)
                            });
                        } else {
                            if (minPrice) {
                                data.where.push({
                                    fieldname: 'saleprice',
                                    valuefrom: parseFloat(minPrice)
                                });
                            }
                            if (maxPrice) {
                                data.where.push({
                                    fieldname: 'saleprice',
                                    valueto: parseFloat(maxPrice)
                                });
                            }
                        }
                    }
                    
                    data.pagesize = 12;
                    data.pageindex = 1;
                    proxy.getProductList({ queryCondition: data }, function (err, result) {
                        var totalPage = result.totalPage;
                        result = self.priceToFixed(result);
                        var html = self.render({ list: result });
                        self.getElement().children('.productlist').html(html);
                        self.collection(self);
                        if (result.data.length > 0) {
                            $('.aboutpage').createPage({
                                pageCount: totalPage,
                                current: currentPage,
                                unbind: true,
                                backFn: function (p) {
                                    data.pagesize = 12;
                                    data.pageindex = p;
                                    proxy.getProductList({ queryCondition: data }, function (err, result) {
                                        result = self.priceToFixed(result);
                                        var html = self.render({ list: result });
                                        self.getElement().children('.productlist').html(html);
                                        self.collection(self);
                                    });;
                                }
                            });
                        }

                    });
                } else {
                    alert("筛选价格必须为数字");
                }
               
               
            }
        });
        self.collection(self);
        if (result.data.length > 0) {
            $('.aboutpage').createPage({
                pageCount: totalPage,
                current: currentPage,
                unbind: true,
                backFn: function (p) {
                    data.pagesize = 12;
                    data.pageindex = p;
                    proxy.getProductList({ queryCondition: data }, function (err, result) {
                        result = self.priceToFixed(result);
                        var html = self.render({ list: result });
                        self.getElement().children('.productlist').html(html);
                        self.collection(self);
                    });;
                }
            });
        }
       
    };
    widget.prototype.priceToFixed = function (result) {
        if (result.data) {
            for (var i = 0; i < result.data.length; i++) {
                //if (result.data[i].fMarkPrice) {
                //    result.data[i].fMarkPrice = parseFloat(result.data[i].fMarkPrice).toFixed(2)
                //}
                result.data[i].fSalePrice = parseFloat(result.data[i].fSalePrice).toFixed(2);
            }
        } else {
            result.data = [];
        }
       
        return result;
    }
    widget.prototype.collection = function (self) {
        $('.collection').on('click', self, function (e) {
            var productId = $(this).attr('data-id');
            var proxy = cb.rest.DynamicProxy.create({
                addProductFavorite: { url: 'client/ProductFavorites/addProductFavorite', method: 'POST', options: { token: true } }
                
            });
            proxy.addProductFavorite({
                ids: [productId]
            }, function (err, data) {
                if (err) {
                    alert(err.message);
                    return;
                } else {
                    $(e.target).addClass('active').html('已收藏');
                }
            });
        });
    }
    return widget;
});