cb.views.register('myReturnController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getData: { url: 'client/Orders/getReturnDetail', method: 'GET', options: { token: true, mask: true } },
        submit: { url: 'client/SaleReturns/save', method: 'POST', options: { token: true, mask: true } },
        getReasonContentList: { url: 'client/OrderCancelReason/getReasonContentList', method: 'GET', options: { token: true } },
        wxUploadFile: { url: 'client/FileUpload/uploadWx', method: 'POST', options: { token: true, mask: true } }
    });
    view.prototype.init = function () {
        var self = this;
        var queryString = this.getViewData().query;
        var detailid = queryString["detailid"];
        var thisView = this.getView();

        this.proxy.getData({ iDetailId: detailid }, function (rerr, rdata) {
            if (rerr) {
                myApp.toast(rerr.message, 'error').show(true);
                return;
            }
            self.initTab(rdata, thisView.find('.returnTypeContent'));

            thisView.find('.returnTypeContent .pay-style').on('click', function (e) {
                $$(this).find('input').prop('checked', true);
                if ($$(this).find('input').val() == 'returngood')
                    thisView.find('li[data-type="returnCount"]').removeClass('hide');
                else
                    thisView.find('li[data-type="returnCount"]').addClass('hide');
            });

            if (thisView.find('.returnTypeContent').find('input:checked').val() == 'returngood') {
                thisView.find('li[data-type="returnCount"]').removeClass('hide');
                thisView.find('.reternCountTips').html('(最多' + rdata.iQuantity + '件)');
            }
            else
                thisView.find('li[data-type="returnCount"]').addClass('hide');


            thisView.find('.reternSumTips').html('(最多￥' + rdata.fCanReturnMoney + ')');

            thisView.find('.myreturn-container.page-content').find('input[name="cReturnSum"],input[name="cReturnCount"]').on('keydown', function (e) {
                var code = e.keyCode;
                if ((code <= 57 && code >= 48) || (code <= 105 && code >= 96) || (code == 8)) {
                    return true;
                } else {
                    return false;
                }
            }).on('change', function () {
                $$(this).val($$(this).val().replace(/[^\d.]/g, ''));

                if ($$(this).attr('name') == 'cReturnSum') {
                    if (parseFloat($$(this).val()) > parseFloat(rdata.fCanReturnMoney)) {
                        myApp.toast('最多只能退' + rdata.fCanReturnMoney + '元', 'tips').show(true);
                        $$(this).val('');
                    }
                }
                else {
                    if (parseFloat($$(this).val()) > parseFloat(rdata.iQuantity)) {
                        myApp.toast('最多只能退' + rdata.iQuantity + '件', 'tips').show(true);
                        $$(this).val('');
                    }
                }
            });

            thisView.find('.myreturn-container.page-content').find('input[name="cReturnBreak"]').on('keydown', function () {
                if ($$(this).val().length > 250)
                    return false;
                else
                    return true;
            });

            cb.util.inputKeyboard(thisView, thisView.find('.myreturn-container.page-content').find('textarea'));

            thisView.find('.btn-red.btn-return-submit').on('click', function () {
                var returnWay = thisView.find('.returnTypeContent').find('input:checked').val();
                if (!returnWay) {
                    myApp.toast('请选择退货类型', 'tips').show(true);
                    return;
                }
                var resonType = thisView.find('.myreturn-container.page-content').find('input[name="cResonType"]').val();
                if (!resonType) {
                    myApp.toast('请选择退货原因', 'tips').show(true);
                    return;
                }
                var returnSum = thisView.find('.myreturn-container.page-content').find('input[name="cReturnSum"]').val();
                if (!returnSum) {
                    myApp.toast('请选择退货金额', 'tips').show(true);
                    return;
                }
                var returnCount = thisView.find('.myreturn-container.page-content').find('input[name="cReturnCount"]').val();
                if (returnWay == 'returngood' && !returnCount) {
                    myApp.toast('请选择退货数量', 'tips').show(true);
                    return;
                }
                var returnBreak = thisView.find('.myreturn-container.page-content').find('input[name="cReturnBreak"]').val();

                var postData = {
                    "iDetailId": detailid,
                    "reason": resonType,
                    "quantity": returnCount ? returnCount : undefined,
                    "money": returnSum,
                    "description": returnBreak
                };
                if (thisView.find('a.btn-myReturn-upload').parent().find('img').length) {
                    postData.oAttachments = new Array();
                    var totalSize = 0;
                    thisView.find('a.btn-myReturn-upload').parent().find('img').each(function () {
                        postData.oAttachments.push({
                            cFileName: $$(this).dataset().cfilename,
                            cOriginalName: $$(this).dataset().coriginalname,
                            cFolder: $$(this).dataset().cfolder
                        });

                        if ($$(this).parent('a').attr('data-size'))
                            totalSize += parseInt($$(this).parent('a').attr('data-size'));
                    });
                    if (totalSize > 2 * 1024 * 1024) {
                        myApp.toast('附件总量应小于2M', 'tips').show(true);
                        return;
                    }
                }
                self.proxy.submit(postData, function (err, result) {
                    if (err) {
                        myApp.toast(err.message, "error").show(true);
                        return;
                    };
                    if (result || !err) {
                        myApp.toast('提交成功', 'success').show(true);
                        myApp.mainView.router.back({query:{refreshPage:true}});
                    }
                });
            });

            thisView.find('a.btn-myReturn-upload').on('click', function () {
                var thisButton = this;
                if (window.plus || (cb.config && cb.config.fromWechat && (typeof WeixinJSBridge != "undefined"))) {
                    var buttons1 = [
         {
             text: '选择方式',
             label: true
         },
         {
             text: '拍照',
             bold: true,
             onClick: function () {
                 if (window.plus)
                     self.getCamera();
                 else if (typeof WeixinJSBridge != "undefined")
                     self.getPictureByWX('camera');
             }
         },
         {
             text: '从相册中选',
             onClick: function () {
                 if (window.plus)
                     self.getPick();
                 else if (typeof WeixinJSBridge != "undefined")
                     self.getPictureByWX('album');
             }
         }
                    ];
                    var buttons2 = [
                        {
                            text: '取消',
                            color: 'red'
                        }
                    ];
                    var groups = [buttons1, buttons2];
                    myApp.actions(groups);
                }
                else
                    myApp.toast('请在App或者微信公众号中使用该功能', 'tips').show(true);
            });
        });

        this.proxy.getReasonContentList({ type: "orderrefund" }, function (err, data) {
            if (err) {
                myApp.toast('加载数据失败', 'error').show(true);
                return;
            }
            var popupHTML = '<div class="popup popup-myreturn">' +
                               '<div class="content-block-title">请选择退款原因</div>' +
                                ' <div class="list-block media-list m-b-5"><ul>';

            for (var i = 0; i < data.length; i++) {
                popupHTML += '<li><label class="label-checkbox item-content"><div class="item-inner"><div class="item-title">' + data[i].reason + '</div>' +
                        '</div><input type="radio" name="my-checkbox" value="' + data[i].id + '"><div class="item-media"><i class="icon icon-form-checkbox"></i></div></label></li>';
            }
            popupHTML += '</ul></div></div>';

            thisView.find('.myreturn-container.page-content').find('input[name="cResonType"]').parent().on('click', function () {
                myApp.popup(popupHTML);
                var thisInput = this;
                if ($$(this).children('input').attr("data-id"))
                    $$('.popup.popup-myreturn').children().find('input[value="' + $$(this).children('input').attr("data-id") + '"]').prop('checked', true);
                $$('.popup.popup-myreturn ul li').on('click', function () {
                    var id = $$(this).find('input').prop('checked',true).val();
                    var resonObj = data.filter(function (item) {
                        return item.id == id;
                    })[0];
                    $$(thisInput).children('input').val(resonObj.reason);
                    $$(thisInput).children('input').attr('data-id', resonObj.id);

                    myApp.closeModal('.popup-myreturn');
                });
            });
        });
    };
    view.prototype.initTab = function (val, container) {
        var tabHtml = '';
        if (val.cNextStatus == "DELIVERGOODS") {
            tabHtml += '<div class="pay-style"><input type="radio" name="cReturnType" data-text="我要退款" value="returnmoney" checked="checked"><span>我要退款</span></div>';

        } else {
            if (val.cOrderPayType == "FIRSTDELIVER") {
                if (val.cNextStatus == "ENDORDER") {
                    tabHtml += '<div class="pay-style"><input type="radio" name="cReturnType" data-text="我要退款" value="returnmoney"><span>我要退款</span></div>';
                }
                tabHtml += '<div class="pay-style"><input type="radio" name="cReturnType" data-text="我要退货" value="returngood" checked="checked"><span>我要退货</span></div>';
            } else {
                tabHtml = '<div class="pay-style"><input type="radio" name="cReturnType" data-text="我要退货" value="returngood" checked="checked"><span>我要退货</span></div>' +
                '<div class="pay-style"><input type="radio" name="cReturnType" data-text="我要退款" value="returnmoney"><span>我要退款</span></div>';
            }
        }
        container.html(tabHtml);
    };

    //拍照
    view.prototype.getCamera = function () {
        var self = this;
        var cmr = plus.camera.getCamera();
        cmr.captureImage(function (p) {
            plus.io.resolveLocalFileSystemURL(p, function (entry) {
                entry.file(function (file) {
                    if (file.size > 512 * 1024) {
                        console.log('文件原始大小：' + file.size);
                        var callback = function () {
                            self.uploadFile(p, 'return')
                        };
                        self.compressImage(p, callback);
                        return;
                    }
                    self.uploadFile(p, 'return');
                });
            }, function (e) {
                myApp.toast('读取文件失败：' + e.message, 'tips').show(true);
            });
        }, function (e) {
            myApp.toast(e.message, 'error').show(true);
        }, { filename: "_doc/camera/", index: 1 });
    };

    //从相册中选
    view.prototype.getPick = function () {
        var self = this;

        plus.gallery.pick(function (p) {
            plus.io.resolveLocalFileSystemURL(p, function (entry) {
                entry.file(function (file) {
                    if (file.size > 512 * 1024) {
                        console.log('文件原始大小：' + file.size);
                        var callback = function (val) {
                            self.uploadFile(p, 'return',val)
                        };
                        self.compressImage(p, callback);
                        return;
                    }
                    self.uploadFile(p, 'return',file.size);
                });
            }, function (e) {
                myApp.toast('读取文件失败：' + e.message, 'tips').show(true);
            });
        });
    };

    view.prototype.getPictureByWX = function (source) {
        var self = this;
        var closeEvent = function (container) {
            container.find('.icon.icon-close').on('click', function () {
                $$(this).parent().remove();
            });
        };
        var uploadImg = function (localId) {
            wx.uploadImage({
                localId: localId,
                isShowProgressTips: 1,
                success: function (res) {
                    var serverId = res.serverId;
                    self.proxy.wxUploadFile({ folderName: 'return', media_id: serverId }, function (err, data) {
                        if (err) {
                            myApp.toast('上传文件失败', 'error').show(true);
                            return;
                        }
                        self.getView().find('a.btn-myReturn-upload').parent().prepend('<a href="#" class="img-update" data-size="' + data.fileSize + '"><img src="' + data.imgurl + '" data-cFileName="' + data.imgname + '" data-cOriginalName="' + data.cOriginalName + '" data-cFolder="' + data.cFolder + '"/><i class="icon icon-close"></i></a>');
                        closeEvent(self.getView().find('a.btn-myReturn-upload').parent());
                    });
                }
            });
        };
        wx.chooseImage({
            count: 1, // 默认9
            sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
            sourceType: [source], // 可以指定来源是相册还是相机，默认二者都有
            success: function (res) {
                var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
                if (localIds.length == 0) {
                    myApp.toast('请先选择图片', 'tips').show(true);
                    return;
                }
                uploadImg(localIds[0]);
            }
        });
    };


    //递归减少图片大小
    view.prototype.compressImage = function (val, callback) {
        var self = this;
        plus.zip.compressImage({
            src: val,
            dst: val,
            overwrite: true,
            quality: 40,
            width: "50%",
            height: "auto"
        }, function (e) {
            console.log('文件大小：' + e.size);

            if (e.size > 512 * 1024) {
                self.compressImage(val, callback);
                return;
            }
            if (callback)
                callback(e.size);

        }, function (e) {
            myApp.toast('压缩图片失败', 'error').show(true);
            console.log("压缩图片Error：" + e.code + ',' + e.message);
        });
    };
    //上传文件
    view.prototype.uploadFile = function (val, folderName,size) {
        var self = this;
        var wt = plus.nativeUI.showWaiting('文件上传中，请稍候...');
        var fileServer = cb.rest.AppContext.serviceUrl + '/client/FileUpload/uploadAlbum';

        var closeEvent = function (container) {
            container.find('.icon.icon-close').on('click', function () {
                $$(this).parent().remove();
            });
        };
        var task = plus.uploader.createUpload(fileServer,
            { method: "POST" },
            function (t, status) { //上传完成
                wt.close();
                if (status == 200) {
                    if (t.responseText) {
                        var resData = typeof t.responseText == 'string' ? JSON.parse(t.responseText) : t.responseText;
                        if (resData.code == 999) {
                            myApp.toast(resData.message, 'error').show(true);
                            return;
                        }
                        myApp.toast('文件上传成功', 'success').show(true);
                        self.getView().find('a.btn-myReturn-upload').parent().prepend('<a href="#" class="img-update" data-size="' + size + '"><img src="' + resData.data.imgurl + '" data-cFileName="' + resData.data.imgname + '" data-cOriginalName="' + resData.data.cOriginalName + '" data-cFolder="' + resData.data.cFolder + '"/><i class="icon icon-close"></i></a>');
                        closeEvent(self.getView().find('a.btn-myReturn-upload').parent());
                    }
                } else
                    myApp.toast('文件上传失败', 'error').show(true);
            }
        );
        task.addFile(val, { key: 'file' });
        task.addData('folderName', folderName ? folderName : 'return');
        task.start();
    };
    return view;
});