cb.views.register('ListProductController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.totalPage = 0;
    view.prototype.isFreash = false; ;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getProductList: { url: 'client/Products/getProductList', method: 'POST', options: { token: true, mask: true} },
        getProductFiltersByClassOrKeyword: { url: 'client/Products/getProductFiltersByClassOrKeyword', method: 'GET', options: { token: true, mask: true} }
    });
    view.prototype.getMenuShareContent = function (result) {
        var appContext = cb.rest.AppContext;
        var link = cb.rest.AppContext.serviceUrl + '/list?wid=' + appContext.wid;
        if (appContext.shareparentid)
            link += '&shareparentid=' + appContext.shareparentid;
        var query = this.getQuery();
        for (var attr in query) {
            if (attr === 'size' || attr === 'device' || attr === 'token' || attr === 'view' || attr === 'wid') continue;
            link += '&' + attr + '=' + query[attr];
        }
        var itemData = result.data && result.data.length && result.data[0];
        var title, desc, imgUrl;
        if (itemData) {
            title = itemData.pName;
            var items = [];
            items.push(itemData.pName);
            if (itemData.productAttribute === 2) {
                items.push(itemData.salePoints + '积分');
            } else {
                items.push('￥' + itemData.fSalePrice);
            }
            desc = items.join('\r\n');
            imgUrl = cb.util.adjustImgSrc(itemData.defaultAlbum);
        } else {
            title = $$('title').text();
            desc = link;
            imgUrl = $$('link[rel="shortcut icon"]').attr('href');
        }
        return {
            title: title,
            desc: desc,
            link: link,
            imgUrl: imgUrl
        };
    };
    view.prototype.onMenuShare = function (result) {
        var content = this.getMenuShareContent(result);
        wx.onMenuShareTimeline(content);
        wx.onMenuShareAppMessage(content);
    };
    view.prototype.getProductList = function (callback, isFilter) {
        this.proxyHasFinished = false;
        var query = this.getQuery();
        var paramsData = this.proxyData;
        var isSalePoints = query.isSalePoints;
        // 是积分商品
        if (isSalePoints) {
            var obj = {
                "fieldname": "productAttribute",
                "valuefrom": "2"
            }
            paramsData.where.push(obj);
        } else {
            var obj = {
                "fieldname": "productAttribute",
                "valuefrom": "1"
            }
            paramsData.where.push(obj);
        }
        var _self = this;
        this.proxy.getProductList({ queryCondition: paramsData }, function (err, result) {
            self.releaseEvents();
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            };
            if (result) {
                if (cb.config && cb.config.fromWechat)
                    _self.onMenuShare(result);
                this.renderProductList(result, callback, isFilter);
            };
        }, this);

    };
    view.prototype.renderProductList = function (result, cb, isFilter) {
        var _self = this;
        _self.totalPage = result.totalPage;
        var thisView = this.getView();
        if (isFilter) {
            thisView.find('#products_list ul.listStyle').html("");
            thisView.find('#products_list ul.blockStyle').html("");
        };
        var listHtml = this.render(thisView.find('#tpl_list').html(), { products: result.data });
        var blockHtml = this.render(thisView.find('#tpl_block').html(), { products: result.data });
        if (!view.prototype.isFreash) {
            thisView.find('#products_list ul.listStyle').html(listHtml);
            thisView.find('#products_list ul.blockStyle').html(blockHtml);
        }
        if (view.prototype.isFreash) {
            thisView.find('#products_list ul.blockStyle').append(blockHtml);
            thisView.find('#products_list ul.listStyle').append(listHtml);
        }
        this.totalCount = result.totalCount;
        if (result.totalCount)
            thisView.find('.icon.icon-product-list').removeClass('disabled');
        else
            thisView.find('.icon.icon-product-list').addClass('disabled');
        // 点击再试试
        thisView.find('a.tryListAgain').on('click', function () {
            _self.proxyData.pageindex = 1;
            _self.getProductList(function () {
            });
        });
        if (cb) cb();
        this.proxyHasFinished = true;
    };
    view.prototype.eventRegister = function () {
        var query = this._get_data("query");
        var thisView = this.getView();
        var self = this;
        var infiniteDom = thisView.find('.infinite-scroll');
        //下拉刷新
        thisView.find('.product-container.pull-to-refresh-content').on('refresh', function (e) {
            self.proxyData.pageindex = 1;
            view.prototype.isFreash = false;
            self.getProductList(function () {
                myApp.pullToRefreshDone();
                myApp.attachInfiniteScroll(infiniteDom);
            });
        });

        //list和block展示切换
        thisView.find('.icon.icon-product-list').on('click', function () {
            self.showType = self.showType == 'list' ? 'block' : 'list';
            $$(this).toggleClass('icon-product-block');
            self.listToBlock(thisView);
        });

        //无线滚动
        infiniteDom.on('infinite', function () {
            if (!self.proxyHasFinished) return;
            view.prototype.isFreash = true;
            //self.listLengthCount += thisView.find('ul.listStyle li').length;
            var len = thisView.find('ul.listStyle li').length;
            if (parseInt(self.totalCount) <= len) {
                myApp.detachInfiniteScroll(infiniteDom);
                thisView.find('.infinite-scroll-preloader').hide();
            } else {
                self.proxyData.pageindex = parseInt(self.proxyData.pageindex) + 1;
                if (self.proxyData.pageindex > self.totalPage) {
                    myApp.detachInfiniteScroll(infiniteDom);
                    thisView.find('.infinite-scroll-preloader').hide();
                } else {
                    if (self.proxyHasFinished) self.getProductList();
                }
            };
        });

        //排序
        thisView.find('.subnavbar a').on('click', function () {
            view.prototype.isFreash = false;
            // 积分商品
            var queryParams = self.getQuery();
            var isSalePoints = queryParams.isSalePoints;
            thisView.find('.subnavbar a').removeClass("active");
            $$(this).addClass("active");
            thisView.find('a.totop').trigger("click");
            var fieldname = $$(this).attr('data-name');
            // 积分商品
            if (fieldname == "fSalePrice") {
                if (isSalePoints) {
                    fieldname = "salePoints";
                } else {
                    fieldname = $$(this).attr('data-name');
                }
            }
            if (fieldname == "fSalePrice") {
                // 价格排序
                if (self.proxyData.order[0].direction == "desc") {
                    self.proxyData.order[0].direction = "asc";
                    $$(this).find("i").eq(0).addClass("up-red");
                    $$(this).find("i").eq(1).removeClass("down-red");
                } else {
                    self.proxyData.order[0].direction = "desc";
                    $$(this).find("i").eq(0).removeClass("up-red");
                    $$(this).find("i").eq(1).addClass("down-red");
                }
            } else if (fieldname == "iSales") {
                // 销售排序
                self.proxyData.order[0].direction = "desc";
            } else if (fieldname == "iOrder") {
                // 综合排序
                self.proxyData.order[0].direction = "asc";
            } else if (fieldname == "dOnSaleTime") {
                // 新品排序
                self.proxyData.order[0].direction = "desc";
            }
            if (fieldname == "siftLists") {
                //筛选
                self.proxyData = cb.util.extend(true, {}, self.initProxyData);
                self.getProductFiltersByClassOrKeyword();
            } else {
                self.proxyData.order[0].fieldname = fieldname;
                self.proxyData.pageindex = 1;
                self.getProductList(function () {
                    myApp.attachInfiniteScroll(infiniteDom);
                });
            };
        });

        //回到最高点
        thisView.find('a.totop').on("click", function () {
            thisView.find('.page-content.product-container').scrollTop(0, 500);
        });

        //直接按输入法的搜索键
        thisView.find('.search').on('keypress', function (event) {
            if (event.which == 13) {
                var query = self._get_data("query");
                query['keyword'] = $$(this).val();
                self._set_data("query", query)
                self.proxyData.where = self.initProxyData.where = [{
                    fieldname: "keyword",
                    valuefrom: decodeURIComponent($$(this).val())
                }];
                self.getProductList(undefined, true);
                event.preventDefault();
            }
        });

        if (isAndroid) {
            myApp.refreshScroller();
            if (myApp.getScroller()) {
                myApp.getScroller().on("scroll", function (e) {
                    if ($$(this).scrollTop() > 100)
                        thisView.find('a.totop').removeClass('hide');
                    else
                        thisView.find('a.totop').addClass('hide');
                });
            }
        }
        else {
            thisView.find('.page-content').on("scroll", function (e) {
                if ($$(this).scrollTop() > 100)
                    thisView.find('a.totop').removeClass('hide');
                else
                    thisView.find('a.totop').addClass('hide');
            });
        }
    };
    view.prototype.getProductFiltersByClassOrKeyword = function () {
        var query = this._get_data("query");
        var categoryid = query["categoryid"] || "";
        var keyword = query["keyword"] || "";
        var pData = { categoryid: categoryid, keyword: keyword };
        this.proxy.getProductFiltersByClassOrKeyword(pData, function (err, result) {
            if (err) {
                myApp.toast("获取过滤条件失败！", "提示").show(true);
                return;
            };
            if (result) {
                var thisView = this.getView();
                result.brandList = result.brandList && result.brandList.length ? result.brandList : [];
                result.classList = result.classList && result.classList.length ? result.classList : [];
                result.propsList = result.propsList && result.propsList.length ? result.propsList : [];
                result.isClassList = this._get_data("fieldname") == "categoryid" ? true : false;
                var popupHTML = this.render(thisView.find('#tpl_filter').html(), result);
                myApp.popup(popupHTML);
                this.filterEventRegister();
            } else {
                myApp.toast("<p>没有获取到筛选条件!</p>", "提示").show(true);
            };
        }, this);
    };
    view.prototype.filterEventRegister = function () {
        var self = this;
        $$("#popup-filter .reset").on("click", function (e) {
            $$("#popup-filter input").prop("checked", false);
            $$("#popup-filter input[type='text']").val("");
        });
        $$("#popup-filter .finish").on("click", function (e) {
            self.collectFilterData(function () {
                self.getProductList(undefined, true);
            });
        });
        //展开收缩
        $$("#popup-filter i.icon").on("click", function (e) {
            if ($$(this).data("onOff")) {
                $$(this).data("onOff", false);
                $$(this).addClass("icon-dropup");
                $$(this).removeClass("icon-dropdown");
                $$(this).parent().next().css("max-height", "30%");
            } else {
                $$(this).data("onOff", true);
                $$(this).addClass("icon-dropdown");
                $$(this).removeClass("icon-dropup");
                $$(this).parent().next().css("max-height", "75%");
            }
        });
    };
    view.prototype.collectFilterData = function (cb) {
        var data = $$("#popup-filter input");
        for (var i = 0; i < data.length; i++) {
            var dataName = $$(data[i]).attr("data-name");
            var dataId = $$(data[i]).attr("data-id");
            if ($$(data[i]).prop("checked")) {
                if (dataName == "brandList") {
                    this.proxyData.where.push({
                        fieldname: "brand_id",
                        valuefrom: dataId
                    });
                } else if (dataName == "classList") {
                    this.proxyData.where.push({
                        fieldname: "categoryid",
                        valuefrom: dataId
                    });
                } else if (dataName == "propsList") {
                    this.proxyData.where.push({
                        fieldname: "props_id",
                        valuefrom: $$(data[i]).parent().parent().prev().attr("data-id"),
                        valueto: "'" + dataId + "'"
                    });
                } else if (dataName == "displayHasInventory") {
                    this.proxyData.where.push({
                        fieldname: "displayHasInventory",
                        valuefrom: true
                    });
                }
            }
        };
        this.proxyData.where.push({
            fieldname: "saleprice",
            valuefrom: $$("#popup-filter input.price-input").eq(0).val(),
            valueto: $$("#popup-filter input.price-input").eq(1).val()
        });
        if (cb) cb();
    };
    view.prototype.listToBlock = function () {
        var thisView = this.getView();
        if (this.showType == 'list') {
            thisView.find('#products_list ul.listStyle').show();
            thisView.find('#products_list ul.blockStyle').hide();
        } else {
            thisView.find('#products_list ul.listStyle').hide();
            thisView.find('#products_list ul.blockStyle').show();
        }
    };
    view.prototype.initShowContent = function (fieldname, thisView) {
        var query = this._get_data("query");
        var self = this;
        /*this.getView().find('.search').val(decodeURIComponent(query[fieldname]));*/
        this.initProxyData = {
            pagesize: 10,
            pageindex: 1,
            where: [],
            order: [{
                fieldname: "iOrder",
                direction: "asc"
            }]
        };
        if (fieldname) {
            this.initProxyData.where.push({
                fieldname: fieldname,
                valuefrom: decodeURIComponent(query[fieldname])
            });
        }
        this.proxyData = cb.util.extend(true, {}, this.initProxyData);
        this.getProductList(function () {
            self.listToBlock(thisView);
        });
    };
    view.prototype.init = function () {
        view.prototype.isFreash = false;
        var thisView = this.getView();
        var query = this.getQuery();
        var fieldname = "";
        this.showType = 'list';
        this._set_data("query", query);
        if (query.categoryid) {
            fieldname = "categoryid";
        } else if (query.brand_id) {
            fieldname = "brand_id";
        } else if (query.tag_id) {
            fieldname = "tag_id";
        } else if (query.keyword) {
            fieldname = "keyword";
            this.getView().find('.search').val(decodeURIComponent(query[fieldname]));
        };
        this._set_data("fieldname", fieldname);
        this.eventRegister();
        this.initShowContent(fieldname, thisView);
        thisView.find('.navbar.card-navbar').find('form').on('click', function () {
            myApp.mainView.router.loadPage('search');
        });
        if (isIos) {
            var obj = thisView.find('.search');
            $$(obj)[0].addEventListener("focus", function () {
                myApp.mainView.router.loadPage('search');
                document.activeElement.blur();
            }, false);
        };
    };
    return view;
})