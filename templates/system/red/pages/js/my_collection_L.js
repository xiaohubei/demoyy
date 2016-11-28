cb.views.register('MyCollectionViewController', function (controllerName) {
    var view = function (id, options) {
        cb.views.BaseView.call(this, id, options);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.dataLength = 1;
    // 总页数
    view.prototype.totalPageSize = 1;
    // 当前页码
    var pageIndex = 1;
    // 商品名称
    var collectionName = "";
    // 分类ID
    var collectionClassId = "";
    // 标签id
    var collectionTagId = "";
    var isFirst = true;
    // 商品分类
    view.prototype.classList = {};
    // 商品标签
    view.prototype.tagList = {};
    // 参数
    var myCollectionParams = {
        currentPage: pageIndex,
        pagesize: 5,
        productName: collectionName,
        classId: collectionClassId,
        tagId: collectionTagId

    };
    view.prototype.init = function () {
        isFirst = true;
        // 加载我的收藏信息
        this.getProductFavorites(myCollectionParams, function () {
            // 全选
            $("#toggle-checkboxes_up").on('click', function (e) {
                if ($("[name = 'toggle-checkboxes']").prop("checked") == true) {
                    // 全选
                    $("[name='checkItem']").prop("checked", 'true');
                } else {
                    // 取消全选
                    $("[name='checkItem']").removeAttr("checked");
                }

            });
            // 下一页
            $("#nextBottom").on('click', this, function (e) {
                if (pageIndex == view.prototype.totalPageSize) {
                    $("#nextBottom").css("cursor", "not-allowed");
                    return;
                } else {
                    pageIndex++;
                    if (pageIndex == view.prototype.totalPageSize) {
                        $("#nextBottom").css("cursor", "not-allowed");
                    } else {
                        $("#nextBottom").css("cursor", "pointer");
                    }
                    
                    myCollectionParams = {
                        currentPage: pageIndex,
                        pagesize: 5,
                        productName: collectionName,
                        classId: collectionClassId,
                        tagId: collectionTagId

                    };
                    e.data.getProductFavorites(myCollectionParams);
                }
               

            });
            // 上一页
            $("#prevBottom").on('click', this, function (e) {
                if (pageIndex == 1) {
                    $("#prevBottom").css("cursor", "not-allowed");
                    return;
                } else {
                    pageIndex--;
                    if (pageIndex == 1) {
                        $("#prevBottom").css("cursor", "not-allowed");
                    } else {
                        $("#prevBottom").css("cursor", "pointer");
                    }
                    myCollectionParams = {
                        currentPage: pageIndex,
                        pagesize: 5,
                        productName: collectionName,
                        classId: collectionClassId,
                        tagId: collectionTagId

                    };
                    e.data.getProductFavorites(myCollectionParams);
                }
               
            });
            // 下部的确定
            $("#btnSubmit").on('click', this, function (e) {
                pageIndex = parseInt($("#pageNo").val());
                if (pageIndex == 0 || pageIndex > view.prototype.totalPageSize) {
                    alert("不能为0或大于总页数");
                    return;
                }
                myCollectionParams = {
                    currentPage: pageIndex,
                    pagesize: 5,
                    productName: collectionName,
                    classId: collectionClassId,
                    tagId: collectionTagId

                };
                e.data.getProductFavorites(myCollectionParams);
            });
            // 查找
            $(".fav-search-btn").on('click', function (e) {
                var productName = $("#fav-search-text").val();
                myCollectionParams = {
                    currentPage: 1,
                    pagesize: 5,
                    productName: productName,
                    classId: collectionClassId,
                    tagId: collectionTagId

                };
                view.prototype.getProductFavorites(myCollectionParams);
            });
            // 清空
            $("#clearAll").on('click', this, function (e) {
                // 获得选中的复选框
                if (view.prototype.dataLength == 0) {
                    alert("无商品");
                    return;
                }
                var selectChks = $("input[type=checkbox][name=checkItem]:checked");
                if (!selectChks.length) {
                    alert("请选择要删除的商品");
                    return;
                }
                if (!window.confirm('你确定要删除选中的收藏吗？')) {
                    return;
                }
                var cancelCollectionParams = {};
                var idsArray = new Array()
                selectChks.each(function () {
                    // 得到选中的购物车id
                    var container = $(this).closest('div.collection-item-form').find('input');
                    idsArray.push(container[1].value);
                    cancelCollectionParams.ids = idsArray;
                });
                var proxy = cb.rest.DynamicProxy.create({ delFavorites: { url: 'client/ProductFavorites/delFavorites', method: 'POST', options: { token: true } } });
                proxy.delFavorites({ ids: idsArray }, function (err, result) {
                    if (err) {
                        alert(err.message);
                    } else {
                        window.location.href = "my_collection";
                    }

                }, this);

            });

        }, this);
        // 全选
        $("#prodcutListAllCheck").on('click', function (e) {
            if ($("[name = 'prodcutListAllCheck']").prop("checked") == true) {
                // 全选
                $("[name='checkItem']").prop("checked", 'true');
            } else {
                // 取消全选
                $("[name='checkItem']").removeAttr("checked");
            }
        });

    };
    // 获取收藏商品信息共用方法
    view.prototype.getProductFavorites = function (myCollectionParams, callback) {
        var proxy = cb.rest.DynamicProxy.create({ getProductFavorite: { url: 'client/ProductFavorites/getProductFavorites', method: 'POST', options: { token: true } } });
        proxy.getProductFavorite(myCollectionParams, function (err, result) {
            if (err) {
                alert(err.message);
            } else {
                if (result.pager.data.length == 0) {
                    var paper = {};
                    paper.data = [];
                    if (isFirst) {
                        // 分类
                        var productClassPageHtml = this.render($('#productClassTpl').html(), { productClass: view.prototype.classList });
                        $("#categoryFilter").empty().append(productClassPageHtml);
                        // 商品标签
                        var productLabelPageHtml = this.render($('#productLabelTpl').html(), { productLabel: view.prototype.tagList });
                        $("#productLabel").empty().append(productLabelPageHtml);
                    }
                   
                    isFirst = false;
                    // 商品收藏信息
                    var html = this.render($('#productFavoritesTpl').html(), { list: paper.data })
                    $("#productFavoritesList").empty().append(html);
                    // 总页数赋值
                    $('#totalPage').text(0);
                    // 当前页数赋值
                    $('#currentPage').text(0);
                    $('#totalProductNum').text(0);
                    // 全部分类
                    $("#allProductClassfied").on('click', this, function (e) {
                        $("#fav-search-text").val("");
                        pageIndex = 1;
                        collectionName = "";
                        collectionClassId = "";
                        myCollectionParams = {
                            currentPage: pageIndex,
                            pagesize: 5,
                            productName: collectionName,
                            classId: collectionClassId,
                            tagId: collectionTagId

                        };
                        e.data.getProductFavorites(myCollectionParams);
                    });
                    // 分类
                    $(".productClassfied").on('click', this, function (e) {
                        $("#fav-search-text").val("");
                        pageIndex = 1;
                        collectionClassId = $(this)[0].childNodes[3].value;
                        collectionName = "";
                        myCollectionParams = {
                            currentPage: pageIndex,
                            pagesize: 5,
                            productName: collectionName,
                            classId: collectionClassId,
                            tagId: collectionTagId

                        };
                        e.data.getProductFavorites(myCollectionParams);
                        // 去除全部分类标签背景
                        $("#allProductClassfied").removeClass("curr");
                        $(".productClassfied").removeClass("curr");
                        $(this).addClass("curr");
                    });
                    // 全部商品
                    $("#allProductTag").on('click', this, function (e) {
                        $("#fav-search-text").val("");
                        pageIndex = 1;
                        collectionTagId = "";
                        collectionName = "";
                        myCollectionParams = {
                            currentPage: pageIndex,
                            pagesize: 5,
                            productName: collectionName,
                            classId: collectionClassId,
                            tagId: collectionTagId
                        };
                        e.data.getProductFavorites(myCollectionParams);
                        $(".productTag").removeClass("curr");
                        $("#allProductTag").addClass("curr");
                        $(this).addClass("curr");
                    });
                    // 标签
                    $(".productTag").on('click', this, function (e) {
                        $("#fav-search-text").val("");
                        pageIndex = 1;
                        collectionTagId = $(this)[0].childNodes[1].value;
                        myCollectionParams = {
                            currentPage: pageIndex,
                            pagesize: 5,
                            productName: collectionName,
                            classId: collectionClassId,
                            tagId: collectionTagId

                        };
                        e.data.getProductFavorites(myCollectionParams);
                        $("#allProductTag").removeClass("curr");
                        $(".productTag").removeClass("curr");
                        $(this).addClass("curr");
                    });
                    return;
                } else {
                    view.prototype.totalPageSize = result.pager.totalPage;
                    view.prototype.classList = result.classList;
                    view.prototype.tagList = result.tagList;
                    if (isFirst) {
                        // 获得分类
                        var productClassPageHtml = this.render($('#productClassTpl').html(), { productClass: view.prototype.classList });
                        $("#categoryFilter").empty().append(productClassPageHtml);
                        // 获得标签
                        var productLabelPageHtml = this.render($('#productLabelTpl').html(), { productLabel: view.prototype.tagList });
                        $("#productLabel").empty().append(productLabelPageHtml);
                    }
                    for (var i = 0; i < result.pager.data.length; i++) {
                        result.pager.data[i].fSalePrice = parseFloat(result.pager.data[i].fSalePrice).toFixed(2);
                    }
                    isFirst = false;
                    // 商品收藏信息
                    var html = this.render($('#productFavoritesTpl').html(), { list: result.pager.data })
                    $("#productFavoritesList").empty().append(html);

                    // 总页数赋值
                    $('#totalPage').text(view.prototype.totalPageSize);
                    // 当前页数赋值
                    $('#currentPage').text(myCollectionParams.currentPage);
                    // 取消关注
                    $(".collection_cancel_cart").on('click', this, function (e) {
                        var container = $(this).closest('div.collection-item-form').find('input');
                        if (!window.confirm('你确定要取消收藏吗？')) {
                            return;
                        }
                        var cancelCollectionParams = {};
                        var idsArray = new Array()
                        idsArray.push(container[1].value);
                        cancelCollectionParams.ids = idsArray;
                        var proxy = cb.rest.DynamicProxy.create({ delFavorites: { url: 'client/ProductFavorites/delFavorites', method: 'POST', options: { token: true } } });
                        proxy.delFavorites({ ids: idsArray }, function (err, result) {
                            if (err) {
                                alert(err.message);
                            } else {
                                window.location.href = "my_collection";
                            }

                        }, this);

                    });
                    // 全部分类
                    $("#allProductClassfied").on('click', this, function (e) {
                        $("#fav-search-text").val("");
                        pageIndex = 1;
                        collectionName = "";
                        collectionClassId = "";
                        myCollectionParams = {
                            currentPage: pageIndex,
                            pagesize: 5,
                            productName: collectionName,
                            classId: collectionClassId,
                            tagId: collectionTagId

                        };
                        e.data.getProductFavorites(myCollectionParams);
                        $(".productClassfied").removeClass("curr");
                        $("#allProductClassfied").addClass("curr");
                    });
                    // 分类
                    $(".productClassfied").on('click', this, function (e) {
                        $("#fav-search-text").val("");
                        pageIndex = 1;
                        collectionClassId = $(this)[0].childNodes[3].value;
                        collectionName = "";
                        myCollectionParams = {
                            currentPage: pageIndex,
                            pagesize: 5,
                            productName: collectionName,
                            classId: collectionClassId,
                            tagId: collectionTagId

                        };
                        e.data.getProductFavorites(myCollectionParams);
                        // 去除全部分类标签背景
                        $("#allProductClassfied").removeClass("curr");
                        $(".productClassfied").removeClass("curr");
                        $(this).addClass("curr");
                    });
                    // 全部商品标签
                    $("#allProductTag").on('click', this, function (e) {
                        $("#fav-search-text").val("");
                        pageIndex = 1;
                        collectionName = "";
                        collectionTagId = "";
                        myCollectionParams = {
                            currentPage: pageIndex,
                            pagesize: 5,
                            productName: collectionName,
                            classId: collectionClassId,
                            tagId: collectionTagId
                        };
                        e.data.getProductFavorites(myCollectionParams);
                        $(".productTag").removeClass("curr");
                        $("#allProductTag").addClass("curr");
                        $(this).addClass("curr");
                    });
                    // 标签
                    $(".productTag").on('click', this, function (e) {
                        $("#fav-search-text").val("");
                        pageIndex = 1;
                        collectionTagId = $(this)[0].childNodes[1].value;
                        collectionName = "";
                        myCollectionParams = {
                            currentPage: pageIndex,
                            pagesize: 5,
                            productName: collectionName,
                            classId: collectionClassId,
                            tagId: collectionTagId

                        };
                        e.data.getProductFavorites(myCollectionParams);
                        $("#allProductTag").removeClass("curr");
                        $(".productTag").removeClass("curr");
                        $(this).addClass("curr");
                    });
                    // 商品选择框
                    $("input[type=checkbox][name=checkItem]").on('click', function (e) {
                        // 获得选中的复选框列表
                        var selectChks = $("input[type=checkbox][name=checkItem]:checked");
                        // 如果商品全部选中 全选按钮选中
                        // 当前页数据的数量
                        var dataCurentLength = 0;
                        // 总页数为1当前页数
                        if (view.prototype.totalPageSize == 1 || view.prototype.totalPageSize == 0) {
                            dataCurentLength = view.prototype.dataLength;
                        } else {
                            dataCurentLength = 5;
                        }
                        if (selectChks.length == dataCurentLength) {
                            $("[name='toggle-checkboxes']").prop("checked", 'true');
                        } else {
                            if ($("[name = 'toggle-checkboxes']").prop("checked") == true) {
                                // 取消全选
                                $("[name='toggle-checkboxes']").removeAttr("checked");
                            }
                        }

                    });
                    $('.morePrivilege').on('click', this, function (e) {
                        $(this).parents('.privilegeInfomation').find('.our-activity').hide();
                        $(this).parents('.privilegeInfomation').find('.activity-detail').slideDown();
                        
                    });
                    $('.activity-detail .unmore').on('click', this, function () {
                        $(this).parents('.privilegeInfomation').find('.activity-detail').slideUp();
                        $(this).parents('.privilegeInfomation').find('.our-activity').show();
                    });
                    if (callback)
                        callback.call(this);

                }
            }
        }, this);
    };
    return view;
});