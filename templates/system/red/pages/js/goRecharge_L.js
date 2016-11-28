cb.views.register('goRechargeController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getDetail: { url: 'member/StorageCard/getDetail', method: 'get', options: { token: true} },
        cardDetail: { url: 'member/StorageCard/cardDetail', method: 'get', options: { token: true} },
        recharge: { url: 'member/StorageCard/recharge', method: 'get', options: { token: true} },
        rechargePay: { url: 'member/StorageCard/rechargePay', method: 'get', options: { token: true} },
        depositByGiftCard: { url: 'giftcard/ClientServer/depositByGiftCard', method: 'get', options: { token: true} },
        bulidPaymentByCardDetailId: { url: 'client/Pay/bulidPaymentByCardDetailId', method: 'get', options: { token: true} },
        bulidPayment: { url: 'client/Pay/bulidPayment', method: 'post', options: { token: true} },
        getEnablePayTypeListForCharge: { url: 'client/Pays/getEnablePayTypeListForCharge', method: 'post', options: { token: true} },
        checkGiftCard: { url: 'giftcard/ClientServer/checkGiftCard', method: 'get', options: { token: true} },
        loopVirtualRequest: { url: 'client/Pay/loopVirtualRequest', method: 'GET', options: { token: true} }
    });
    view.prototype.autoFillPassword = function (password) {
        $("#giftcardpassword input").eq(0).val(password.substring(0, 4));
        $("#giftcardpassword input").eq(1).val(password.substring(4, 8));
        $("#giftcardpassword input").eq(2).val(password.substring(8, 12));
        $("#giftcardpassword input").eq(3).val(password.substring(12, 16));
        $("#useGiftCard").focus();
    };
    view.prototype.getEnablePayTypeListForCharge = function () {
        this.proxy.getEnablePayTypeListForCharge({}, function (err, success) {
            if (err) {
                console.log("充值方式获取失败" + err);
                return;
            };
            if (success.length) {
                var txt = this.render($("#wayToPayTpl").html(), { data: success })
                $("#wayToRecharge").empty().html(txt);
                this.eventRegister();
            };
        }, this);
    };
    view.prototype.cardDetail = function () {
        this.proxy.cardDetail({}, function (err, success) {
            if (err) {
                console.log("获取充值卡余额失败" + err);
                return;
            }
            if (success.length) {
                $("#storageBalance").text(Math.abs(success[0].fBalance.toFixed(2)));
            }
        });
    };
    view.prototype.eventRegister = function () {
        this._set_data('currentStatus', "103");
        this._set_data('currentPayType', "alipay");
        this._set_data('isGiftCardValid', false);
        this._set_data('passwordBeforeChecked', "");
        this._set_data('passwordAfterChecked', "");
        var self = this;
        var passwordBeforeChecked = "";
        var passwordAfterChecked = "";
        var currentStatus = 103;
        var isGiftCardValid = "";
        var $view = this.getView();
        var timer = "";
        //充值方式的选择
        $('#wayToRecharge input[type="radio"]').each(function (index) {
            $(this).click(function () {
                if (timer) {
                    clearInterval(timer);
                };
                $("#weixinscan").hide();
                $("#toRecharge").removeAttr("disabled");
                currentStatus = $(this).attr("data-paytypeorder");
                currentPayType = $(this).attr("data-paytype");
                if (currentStatus != "103") {
                    $("#rechargeMoney").show();
                    $("#giftcardpassword").hide();
                } else {
                    $("#rechargeMoney").hide();
                    $("#giftcardpassword").show();
                };
            })
        });
        //使用礼品卡卡密
        $("#useGiftCard").click(function () {
            $("#giftcardpassword .isGiftCardValid").show();
            $("#giftcardpassword input").each(function (index) {
                passwordBeforeChecked += $.trim($(this).val());
            });
            if (!passwordBeforeChecked) {
                $("#giftcardpassword .isGiftCardValid ").text("礼品卡卡密不能为空，请重新输入！ ");
                return;
            };
            self.proxy.checkGiftCard({ password: passwordBeforeChecked }, function (err, suc) {
                //每次使用后置空密码
                passwordAfterChecked = passwordBeforeChecked;
                passwordBeforeChecked = "";
                if (err) {
                    $("#giftcardpassword .isGiftCardValid ").text(err.message);
                    return;
                };
                isGiftCardValid = suc.result;
                if (isGiftCardValid) {
                    $("#giftcardpassword .isGiftCardValid ").text("( 礼品卡可充值余额为 : " + suc.reduceAmount + " 元)");
                } else {
                    $("#giftcardpassword .isGiftCardValid ").text("礼品卡卡密无效，请重新输入！ ");
                };
            })
        });
        //确定充值
        $("#toRecharge").click(function () {
            debugger;
            if (currentStatus != 103) {
                $("#loading").addClass("loading");
                var rechargeSum = $("#rechargeSum").val();
                self.proxy.recharge({ iType: currentStatus, fSum: rechargeSum }, function (err, suc) {
                    if (err) {
                        ModalTip({ message: err.message }, self);
                        $("#loading").removeClass("loading");
                        console.log(err.message);
                        return;
                    };
                    self._set_data('cardDetailId', suc.id);
                    var pData = {
                        cardDetailId: suc.id,
                        paytypecode: currentPayType,
                        payBackUrl: "/member/myStorageCard",
                        iAmount: suc.fSum
                    };
                    self.proxy.bulidPaymentByCardDetailId(pData, function (err, suc) {
                        if (err) {
                            ModalTip({ message: err.message }, self);
                            $("#loading").removeClass("loading");
                            console.log(err.message);
                            return;
                        };
                        $("#loading").removeClass("loading");
                        if (currentStatus == "104") {
                            self.weixinRecharge(suc);
                        } else {
                            self.alipayChanpay(suc);
                        };
                    }, this)
                }, this);
            } else {
                //礼品卡充值
                self.giftCardRecharge(passwordAfterChecked, isGiftCardValid);
            };
        });
        //输入密码
        this.inputPassword();
    };
    view.prototype.giftCardRecharge = function (passwordAfterChecked, isGiftCardValid) {
        var self = this;
        if (!passwordAfterChecked) {
            ModalTip({ message: "请先确定卡密是否可用" }, this);
            return;
        };
        if (!isGiftCardValid) {
            ModalTip({ message: "卡密无效，请重新输入" }, this);
            return;
        }
        this.proxy.depositByGiftCard({ password: passwordAfterChecked }, function (err, suc) {
            if (err) {
                ModalTip({ message: err.message }, self);
                console.log(err.message);
                return;
            };
            if (suc.result) {
                ModalTip({ message: "礼品卡充值成功" }, self);
                setTimeout(function () {
                    window.location.href = "/member/myStorageCard";
                }, 1500);
            } else {
                ModalTip({ message: "礼品卡充值失败" }, self);
            }
        }, this)
    };
    view.prototype.weixinRecharge = function (data) {
        //微信支付，置灰确定充值按钮
        $("#loading").removeClass("loading");
        $("#toRecharge").attr("disabled", "disabled");
        //参数1表示图像大小，取值范围1-10；参数2表示质量，取值范围'L','M','Q','H'
        var qr = qrcode(10, 'H');
        qr.addData(data);
        qr.make();
        $("#weixinscan").show();
         $("#qrcodeTip").html('距离二维码过期还剩<span id="countdown"> 59</span>秒，过期后请刷新页面重新获取二维码。');
        $("#qrcode").empty();
        var countDown = 59;
        timer = setInterval(function () {
            countDown--;
            if (countDown < 0) {
                countDown = 0;
                clearInterval(timer);
                $("#qrcodeTip").html('<p style="color:red;letterspace:2; font-size: 14px;" class="col-xs-offset-2">二维码已经过期,请<a style="color: #2ea7e7;" href="javascript:;" class="refresh"> 刷新 </a>页面</p>');
                //过期，扫码提示
                qr = qrcode(10, 'M');
                qr.addData('weixin://wxpay/bizpayurl?pr=');
                qr.make();
                $("#qrcode").html(qr.createImgTag());
                //刷新
                $("#qrcodeTip .refresh").click(function(){
                    debugger;
                    $("#toRecharge").trigger("click");
                });
            };
            $("#countdown").text(countDown);
        }, 1000);
        this._set_data('timer', timer);
        $("#qrcode").html(qr.createImgTag());
        this.processLoopVirtualRequest();
    };
    view.prototype.inputPassword = function () {
        $.fn.pasteEvent = function (delay) {
            $el = $(this);
            delay = delay || 20;
            $el.on("paste", function () {
                $el.trigger("prepaste");
                setTimeout(function () {
                    $el.trigger("onpastePassword");
                }, delay)
            })
        };
        $("#giftcardpassword input:first").on("onpastePassword", function () {
            var password = $(this).val();
            if (password.length <= 4) return;
            autoFillPassword(password);
        }).pasteEvent(20);
        $("#giftcardpassword input").each(function (index) {
            $(this).index = index;
            $(this).keyup(function (e) {
                var currentValue = $.trim($(this).val());
                var currentValueLength = currentValue.length;
                if (currentValueLength == 4) {
                    if ($(this).attr("data-order") == 4) {
                        $("#useGiftCard").focus();
                    } else {
                        $(this).parent().next().children().focus();
                    }
                };
                if (currentValueLength > 4) {
                    var newValue = currentValue.substring(0, 4)
                    $(this).val(newValue);
                    if ($(this).attr("data-order") == 4) {
                        $("#useGiftCard").focus();
                    } else {
                        $(this).parent().next().children().focus();
                    }
                }
            })
        });
    };
    view.prototype.alipayChanpay = function (suc) {
        //显示灰色遮罩层
        var showBg = function () {
            $("#garybg").css({
                height: $("body").height(),
                width: $("body").width(),
                display: "block"
            });
            $("#dialog").show();
        };
        showBg();
        var queryString = new cb.util.queryString();
        passwordString = queryString.get("password");
        if (!passwordString) passwordString = "";
        // 支付遇到问题
        $(".btnPaymentFailed").click(function () {
            $("#garybg,#dialog").hide();
            location.href = "/member/goRecharge?password=" + passwordString;
        });
        // 支付成功
        $(".btnPaymentSuccess").click(function () {
            $("#garybg,#dialog").hide();
            if (passwordString) {
                location.href = "/member/myGiftcard";
            } else {
                location.href = "/member/myStorageCard";
            }
        });
        // 关闭灰色 jQuery 遮罩
        $(".close_mayer").click(function () {
            $("#garybg,#dialog").hide();
            location.href = "/member/goRecharge?password=" + passwordString;
        });
        var obj = document.createElement('div');
        obj.innerHTML = suc;
        $view = this.getView()
        $view.append(obj.childNodes);
        var form = $view.find('form');
        form.submit();
    };
    view.prototype.processLoopVirtualRequest = function () {
        var self = this;
        var loopTimeout = self._get_data('loopTimeout');
        if (loopTimeout) clearTimeout(loopTimeout);
        loopTimeout = setTimeout(function () {
            var proxy = self._get_data('proxy');
            var cardDetailId = self._get_data('cardDetailId');
            self.proxy.loopVirtualRequest({ cardDetailId: cardDetailId }, function (err, result) {
                if (err) {
                    self.processLoopVirtualRequest();
                    return;
                };
                location.href = 'myStorageCard';
            });
        }, 10000);
        self._set_data('loopTimeout', loopTimeout);
    };
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        passwordString = queryString.get("password");
        if (passwordString) this.autoFillPassword(passwordString);
        this.getEnablePayTypeListForCharge();
        this.cardDetail();
    };
    return view;
});