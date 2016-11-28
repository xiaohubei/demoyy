cb.views.register('MemberInfoViewController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getMemberInfo: {
            url: 'member/Members/getMemberByToken',
            method: 'GET',
            options: {
                token: true,
                mask: true
            }
        },
        getMemberCdefine: {
            url: 'member/Members/getMemberSetting?isEnable=true',
            method: 'POST',
            options: {
                token: true
            }
        },
        saveMemberData: {
            url: 'member/Members/save',
            method: 'POST',
            options: {
                token: true,
                mask: true
            }
        },
        wxUploadFile: {
            url: 'client/FileUpload/uploadAvatarWx',
            method: 'POST',
            options: {
                token: true,
                mask: true
            }
        }
    });
    view.prototype.init = function () {
        var query = this.getQuery();
        var this_view = this.getView();
        this.getInfoList(this_view);
    };
    //获取会员基本信息
    view.prototype.getInfoList = function (this_view) {
        var self = this;
        this.proxy.getMemberInfo({}, function (err, result) {
            if (result) {
                var html = self.render(this_view.find('#tpl_infor').html(), {
                    infomation: result
                });
                this_view.find('#infomation_ul').html(html);
                if (result.cUserName) {
                    this_view.find('#nickName').attr('readonly', 'readonly');
                }
                if (!result.dBirthday) {
                    this_view.find('#dBirthday').attr('type', 'date');
                } else {
                    this_view.find('#dBirthday').attr('type', 'text');
                    this_view.find('#dBirthday').attr('readonly', 'readonly');
                }
                self.getDefineList(result);

                //上传头像   --  暂不发布
                if (window.plus || (cb.config && cb.config.fromWechat && (typeof WeixinJSBridge != "undefined")))
                    self.register();

                self.memberData = result;
            } else {
                myApp.toast(err.message, 'error').show(true);
            }
        });
    };
    //获取会员自定义信息
    view.prototype.getDefineList = function (result) {
        var self = this;
        var this_view = this.getView();
        this.proxy.getMemberCdefine({}, function (err, data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].cType == 'date') {
                        if (result[data[i].cDefineName] == '') {
                            data[i].cText = null;
                        } else {
                            try {
                                data[i].cText = (new Date(result[data[i].cDefineName])).toISOString().slice(0, 10);
                            } catch (e) {
                                data[i].cText = null;
                            }

                        }
                    } else {
                        data[i].cText = result[data[i].cDefineName];
                    }
                }
                var html = self.render(this_view.find('#myInformationExtendTpl').html(), {
                    infomation_define: data
                });
                this_view.find('#infomation_ul_define').html(html);
                self.saveInfomation(this_view, data, result);
            } else {
                myApp.toast(err.message, 'tips').show(true);
            }
            cb.util.inputKeyboard(this_view);
        });
    };
    //基本信息收集
    view.prototype.collectInfomation = function (result) {
        var model = result;
        // 昵称
        //model.cUserName = $("#nickName").val();
        // qq号
        model.cQQ = $$("#cQQ").val();
        // 真实姓名
        model.cRealName = $$("#realName").val();
        //出生日期
        model.dBirthday = $$("#dBirthday").val();
        // 邮箱
        //model.cEmail = $("#cEmailNum").text();
        // 手机号码
        //model.cPhone = $("#cPhoneNum").text();
        // 头像
        //model.cPortrait = $("#myPortraitUrl").val();
        return model;
    }

    //保存会员信息
    view.prototype.saveInfomation = function (this_view, data_define, data_info) {
        var self = this;
        this_view.find('.button-fill').on('click', function () {
            var model = self.collectInfomation(data_info);
            model.cPortrait = self.memberData.cPortrait;
            model.ts = self.memberData.ts;
            if (isNaN(model.cQQ)) {
                myApp.toast('QQ号只能是数字', 'tips').show(true);
                return;
            } else if ((model.cQQ).length > 15) {
                myApp.toast('QQ号码不能超过15位', 'tips').show(true);
                return;
            }
            //会员自定义项校验
            var defineInfo = data_define;
            for (var i = 0; i < defineInfo.length; i++) {
                if (!defineInfo[i].isNull && !$$('#' + defineInfo[i].id).val()) {
                    myApp.toast(defineInfo[i].cTitle + "不为空", 'tips').show(true);
                    return;
                }
                if (defineInfo[i].iLength < $$('#' + defineInfo[i].id).val().length) {
                    myApp.toast(defineInfo[i].cTitle + "的长度不能超过" + defineInfo[i].iLength + "个字符", 'tips').show(true);
                    return;
                } else {
                    model[defineInfo[i].cDefineName] = $$('#' + defineInfo[i].id).val();
                }
            };
            self.proxy.saveMemberData({
                model: model
            }, function (err, data) {
                if (err) {
                    myApp.toast(err.message, 'error').show(true);
                    return;
                }
                self.memberData = data;
                myApp.toast("保存成功", 'success').show(true);
            });
        });
    }

    view.prototype.register = function () {
        var self = this;
        this.getView().find('li[data-Type="userLogo"]').on('click', function () {
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
        });
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
                            self.uploadFile(p, 'avatar')
                        };
                        self.compressImage(p, callback);
                        return;
                    }
                    self.uploadFile(p, 'avatar');
                });
            }, function (e) {
                myApp.toast('读取文件失败：' + e.message, 'tips').show(true);
            });
        }, function (e) {
            myApp.toast('请先选择照片', 'error').show(true);
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
                        var callback = function () {
                            self.uploadFile(p, 'avatar')
                        };
                        self.compressImage(p, callback);
                        return;
                    }
                    self.uploadFile(p, 'avatar');
                });
            }, function (e) {
                myApp.toast('读取文件失败：' + e.message, 'tips').show(true);
            });
        });
    };

    view.prototype.getPictureByWX = function (source) {
        var self = this;
        var uploadImg = function (localId) {
            wx.uploadImage({
                localId: localId,
                isShowProgressTips: 1,
                success: function (res) {
                    var serverId = res.serverId;
                    self.proxy.wxUploadFile({ folderName: 'avatar', media_id: serverId }, function (err, data) {
                        if (err) {
                            myApp.toast('上传文件失败', 'error').show(true);
                            return;
                        }
                        self.proxy.getMemberInfo(function (err, result) {
                            if (err) {
                                myApp.toast(err.message, 'error').show(true);
                                return;
                            }
                            self.memberData = result;
                        });
                        self.getView().find('#infomation_ul').find('li[data-Type="userLogo"]').find('img').attr('src', localId);
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
                callback(val);

        }, function (e) {
            myApp.toast('压缩图片失败', 'error').show(true);
            console.log("压缩图片Error：" + e.code + ',' + e.message);
        });
    };
    //上传文件
    view.prototype.uploadFile = function (val, folderName) {
        var self = this;
        var wt = plus.nativeUI.showWaiting('文件上传中，请稍候...');
        var fileServer = cb.rest.AppContext.serviceUrl + '/client/FileUpload/uploadYLImg?token=' + cb.rest.AppContext.token;
        var task = plus.uploader.createUpload(fileServer,
            { method: "POST" },
            function (t, status) { //上传完成
                wt.close();
                if (status == 200) {
                    if (t.responseText) {
                        var resData = typeof t.responseText == 'string' ? JSON.parse(t.responseText) : t.responseText;
                        self.memberData.cPortrait = resData.data.url;

                        self.getView().find('#infomation_ul').find('li[data-Type="userLogo"]').find('img').attr('src', resData.data.url);
                        self.proxy.getMemberInfo(function (err, result) {
                            if (err) {
                                myApp.toast(err.message, 'error').show(true);
                                return;
                            }
                            self.memberData = result;
                        });
                    }
                } else
                    myApp.toast('文件上传失败', 'error').show(true);
            }
        );
        task.addFile(val, { key: 'file' });
        task.addData('folderName', folderName ? folderName : 'avatar');
        task.start();
    };
    return view;
});