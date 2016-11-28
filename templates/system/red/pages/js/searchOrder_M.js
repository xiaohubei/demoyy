cb.views.register('searchOrderController', function(controllerName) {
    var view = function(widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    var historyCookie = [];
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getHotKeyInfo: {url: 'client/PopularKeywords/getList',method: 'GET',options: {token: true}}
    });
    view.prototype.init = function(){
        var self = this;
        var thisView = this.getView();
        setTimeout(function() {
            thisView.find('.search').focus();
        }, 1000)
        historyCookie = self.getHistoryContent(thisView);
        thisView.find('.search').click(function() {
            historyCookie = self.getHistoryContent(thisView);
        });
        thisView.find('.search').on('keypress', function(event) {
            thisView.find('.clear-input').show();
            if (event.which == 13) {
                self.handleInputWord(self.getKeywords(), thisView);
                event.preventDefault();
            }
        });
        thisView.find('.clear-input').on('click', function () {
            thisView.find(".search").val('');
            thisView.find('.clear-input').hide();
        });
        //订单搜索
        thisView.find('.orderSearch').click(function(e){
            self.handleInputWord(self.getKeywords(), thisView);
        });
        //清除历史搜索记录
        thisView.find('#clear_history_btn').on('click', function() {
            cb.util.localStorage.removeItem('searchOrderHistory');
            historyCookie = [];
            self.getHistoryContent(thisView);
        });
        thisView.find('#history').click(function(e) {
            myApp.mainView.router.loadPage('member/myorder?status=all&keyword=' + encodeURIComponent(e.target.innerHTML));
        });
        //语音输入
        thisView.find('.icon.icon-voice-gray').on('click', function () {
            if (window.plus) {
                var options = {
                    engine: "iFly"
                };
                var points = ["。", "，", "？", "！"];
                var txtSearch = thisView.find('.search'); 
                txtSearch.value="";
                plus.speech.startRecognize(options, function (s) {
                    var result = "";
                    if (s) {
                        for (var i = 0; i < s.length; i++) {
                            var curr = s[i];
                            if (curr) {
                                var lastChart = curr.substr(curr.length - 1);
                                var firstChart = curr.substr(0, 1);
                                if (points.indexOf(lastChart) > -1) {
                                    result += curr.substr(0, curr.length - 1);
                                }
                                else if (points.indexOf(firstChart) > -1) {
                                    result += curr.substr(1);
                                }
                                else {
                                    result += curr;
                                }
                            }
                        }
                    }

                    txtSearch.value += result;
                    thisView.find('.search').focus()
                    thisView.find('.search').val(txtSearch.value);
                }, function (e) {
                    plus.nativeUI.toast("语言识别失败了！", {
                        duration: "long"
                    });
                });
            }
            else if (cb.config && cb.config.fromWechat && (typeof WeixinJSBridge != "undefined")) {
                wx.startRecord();
                var recordKeySearch = function (vid) {
                    wx.translateVoice({
                        localId: vid,
                        isShowProgressTips: 1,
                        success: function (res) {
                            var tsResult = res.translateResult;
                            if (tsResult.indexOf('。') >= 0)
                                tsResult = tsResult.replace('。','');
                            thisView.find('.search').val(tsResult);
                            thisView.find("#searchPage_keyword").focus()
                        },
                        fail: function (e) {
                            myApp.toast(e.errMsg, 'error').show(true);
                        }
                    });
                };
                
                myApp.modal({
                    title: '正在录音...',
                    text: '请对着话筒说出要搜索的内容...',
                    buttons: [
                      {
                          text: '说完了',
                          onClick: function () {
                              wx.stopRecord({
                                  success: function (res) {
                                      var localId = res.localId;
                                      recordKeySearch(localId);
                                  },
                                  fail: function (e) {
                                      myApp.toast(e.errMsg, 'error').show(true);
                                  }
                              });
                          }
                      }
                    ]
                })
                wx.onVoiceRecordEnd({
                    // 录音时间超过一分钟没有停止的时候会执行 complete 回调
                    complete: function (res) {
                        var localId = res.localId;
                        recordKeySearch(localId);
                    },
                    fail: function (e) {
                        myApp.toast(e.errMsg, 'error').show(true);
                    }
                });
            }
            else
                myApp.toast('请在APP中使用该功能！', 'tips').show(true);
        });
    };
    //获取搜索关键字
    view.prototype.getKeywords = function() {
        var keyword = this.getView().find(".search").val();
        keyword = keyword.replace(/(^\s*)|(\s*$)/g, "");
        return keyword
    };
    //处理输入的搜索关键字
    view.prototype.handleInputWord = function(keyword, thisView) {
        historyCookie.push(keyword);
        var arr = new Array();
        historyCookie = arr.unique(historyCookie); //数组去重
        if (keyword) {
            myApp.mainView.router.loadPage('member/myorder?status=all&keyword='+keyword);
            cb.util.localStorage.setItem("searchOrderHistory", historyCookie);
            this.clearDropContent(thisView);
        }
    };
    //获取到搜索历史记录
    view.prototype.getHistoryContent = function(thisView) {
        var historyCookieStr = cb.util.localStorage.getItem('searchOrderHistory');
        var content = '';
        if (historyCookieStr == null) {
            this.getView().find("#history").html('');
        } else {
            historyCookie = historyCookieStr.split(',');
            for (var i = 0; i < historyCookie.length; i++) {
                content += ("<a>" + historyCookie[i] + "</a>");
                thisView.find("#history").html(content);
                thisView.find("#history").show();
                thisView.find('#clear_history_btn').show();
            }
        }
        return historyCookie
    };
    //隐藏搜索历史记录
    view.prototype.clearDropContent = function(thisView) {
        thisView.find('#history').hide();
        thisView.find('#search_btn').hide();
    };
    return view;
});