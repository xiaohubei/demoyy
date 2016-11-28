cb.views.register('MyintegralController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var returnPageIndex = 1;
        var _this = this;
        var proxy = cb.rest.DynamicProxy.create({
            getIntegralReturnList: {
                url: 'member/MemberPoint/getPointDetail',
                method: 'GET',
                options: { token: true }
            },
            getMemberPointRule: {
                url: 'member/Members/getMemberPointRule',
                method: 'get',
                options: { token: true }
            },
            getMemberByToken: {
                url: 'member/Members/getMemberByToken',
                method: 'get',
                options: { token: true }
            }
        });
        //获取积分列表
        var getIntegralReturnList = function (type) {
            proxy.getIntegralReturnList({
                addType: type,
                isGetLoginMember: true,
                pageIndex: returnPageIndex,
                pageSize: 10
            }, function (err, result) {
                if (err) {
                    alert("获取积分详情失败" + err.message);
                    return;
                } else {
                    dealIntegralList(result.models, type);
                    dealWithPagenation(result, type);
                }
            }, this);
        };
        //获取会员信息
        var getMemberByToken = function () {
            proxy.getMemberByToken(function (err, data) {
                if (err) {
                    alert("获取会员信息失败" + err.message);
                    return;
                } else {
                    $("#availableCoupon").text(data.iPoints);
                    $("#totalCoupon").text(0);
                }
            });
        };
        //分页处理
        var dealWithPagenation = function (result, type) {
            $("#pagenation").createPage({
                pageCount: Math.ceil(result.modelsCount / 10),
                current: 1,
                unbind: true,
                backFn: function (p) {
                    proxy.getIntegralReturnList({
                        addType: type,
                        isGetLoginMember: true,
                        pageSize: 10,
                        pageIndex: p
                    }, function (err, data) {
                        if (err) {
                            alert("获取券列表失败" + err.message);
                            return;
                        } else {
                            dealIntegralList(data.models, type);
                        }
                    }, this);
                }
            });
        }
        getIntegralReturnList(0);
        getMemberByToken();
        var dealIntegralList = function (result, type) {
            if (!$.isArray(result)) return;
            result.forEach(function (item) {
                if (!item.cSourceCode) return;
                if(item.cSourceCode.indexOf('O')>-1){
                	 item.status ='O';
                }else if(item.cSourceCode.indexOf('R')>-1){
                	 item.status ='R';
                }
            });
            var tplstring = document.getElementById("IntegralList");
            var html = _this.render(tplstring.innerHTML, { data: result });
            if (type == 1) {
                $("#incomeList").empty().append(html);
            } else if (type == 2) {
                $("#expandList").empty().append(html);
            } else {
                $("#orderList").empty().append(html);
            }
        };
        //分页

        $("#income").click(function () {
            getIntegralReturnList(1);
        });
        $("#expand").click(function () {
            getIntegralReturnList(2);
        });
        $("#score").click(function () {
            getIntegralReturnList(0);
        });
        //订单详情

        $("#tab-content").click(function (e) {
            var status = $(e.target).attr('data-status');
            var StyleId = $(e.target).attr('data-style');
            if (StyleId == 'R') {
                window.location.href = "return_detail?cSaleReturnNo=" + status;
            } else if (StyleId == 'O') {
                window.location.href = "orderdetail?orderId=" + status;
            }

        })
    };
    return view;
});