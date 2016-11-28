cb.views.register('SearchPageController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.proxy = cb.rest.DynamicProxy.create({
        getHotKeyInfo: {
            url: 'client/PopularKeywords/getList',
            method: 'GET',
            options: {
                token: true
            }
        }
    });
    var historyCookie = [];
    view.prototype.init = function () {
        var self = this;
        var thisView = this.getView();
        $$(document).on('pageBack', '.page[data-page="productList"]', function () {
            self.init();
        });
        if (isIos) {
            thisView.find('#searchForm').show();
            thisView.find('#searchForm').append(thisView.find('#searchPage_keyword'));
        };
        setTimeout(function () {
            thisView.find('#searchPage_keyword').focus();
        }, 1000);
        historyCookie = self.getHistoryConten(thisView);
        thisView.find('#history a').on('click', function () {
            myApp.mainView.router.loadPage('/list?keyword=' + encodeURIComponent($$(this).text()));
        });
        thisView.find('.search').on('keypress', function (event) {
            $$('.clear-input').show();
            if (event.which == 13) {
                self.handleInputWord(self.getKeywords(), thisView);
                event.preventDefault();
                if (isIos) {
                    document.activeElement.blur();
                }
            }
        });
        thisView.find('#searchButton').on('click', function (event) {
            self.handleInputWord(self.getKeywords(), thisView);
            event.preventDefault();
        });
        thisView.find('.clear-input').on('click', function () {
            $$('#searchPage_keyword').val('');
            $$('.clear-input').hide();
        });
        //清除历史搜索记录
        thisView.find('#search_btn').on('click', function () {
            $$(this).addClass('hide');
            cb.util.localStorage.removeItem('searchHistory');
            historyCookie = [];
            self.getHistoryConten(thisView);
        });
        //获取热门关键字
        this.proxy.getHotKeyInfo({ platform: 'mobile' }, function (err, data) {
            var Hotcontent = '';
            if (err) {
                myApp.toast(err.message, 'error').show(true);
                return;
            }
            if (data.pkword.length == 0) {
                self.getView().find("#hotkeyTittle").show();
                self.getView().find("#hotkey").hide();
            }
            else {
                for (var i = 0; i < data.pkword.length; i++) {
                	if(data.pkword[i].targetUrl == undefined){
                		Hotcontent += ("<a>" + data.pkword[i].name + "</a>");
                	}else{
                		Hotcontent += ("<a data-url='" + data.pkword[i].targetUrl + "' href='" + data.pkword[i].targetUrl + "' target='_blank'>" + data.pkword[i].name + "</a>");
                	}                   
                    thisView.find("#hotkey").html(Hotcontent);
                }
            }

            thisView.find('#hotkey a').click(function (e) {
                var jumpHref = $$(this).attr('data-url');
                if (jumpHref) {
                    if (jumpHref.indexOf('http') > -1 || jumpHref.indexOf('https') > -1) {
                        $$(this).addClass('external');
                        $$(this).attr('target', '_system');
                    } else {
                        myApp.mainView.router.loadPage(jumpHref);
                    }
                }
                else {
                    myApp.mainView.router.loadPage('/list?keyword=' + encodeURIComponent($$(this).text()));
                }
            });
        });
        var voiceClickEvent = function () {
            if (window.plus) {
                var options = {
                    engine: "iFly"
                };
                var points = ["。", "，", "？", "！"];
                var txtSearch = document.querySelector("#searchPage_keyword");
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
                    thisView.find("#searchPage_keyword").focus()
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
                                tsResult = tsResult.replace('。', '');
                            thisView.find('#searchPage_keyword').val(tsResult);
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
                });
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
        };

        //语音输入
        thisView.find('.icon.icon-voice-gray').off('click', voiceClickEvent);
        thisView.find('.icon.icon-voice-gray').on('click', voiceClickEvent);
    };
    //获取搜索关键字
    view.prototype.getKeywords = function () {
        var keyword = this.getView().find("#searchPage_keyword").val();
        keyword = keyword.replace(/(^\s*)|(\s*$)/g, "");
        if (keyword == '' || !keyword) {
            myApp.toast('请输入关键字进行搜索！', 'tips').show(true);
        }
        return keyword
    }
    //处理输入的搜索关键字
    view.prototype.handleInputWord = function (keyword, thisView) {
        historyCookie.push(keyword);
        historyCookie = this.unique(historyCookie); //数组去重
        if (keyword) {
            myApp.mainView.router.loadPage('/list?keyword=' + encodeURIComponent(keyword));
            cb.util.localStorage.setItem("searchHistory", historyCookie);
            this.clearDropContent(thisView);
        }
    }
    //获取到搜索历史记录
    view.prototype.getHistoryConten = function (thisView) {
        var historyCookieStr = '';
        var content = '';
        historyCookieStr = cb.util.localStorage.getItem('searchHistory');
        if (historyCookieStr == null) {
            thisView.find('#search_btn').addClass('hide');
            this.getView().find("#history").html('<div class="noDataTip" style="background-color:#fff;"><i class="icon icon-no-list"></i><p>暂无搜索记录</p></div>');
        } else {
            historyCookie = historyCookieStr.split(',');
            for (var i = 0; i < historyCookie.length; i++) {
                if (historyCookie[i] == '') {
                    historyCookie.removeAt(i);
                }
                content += ("<a>" + historyCookie[i] + "</a>");
                thisView.find("#history").html(content);
                thisView.find("#history").show();
                thisView.find('#search_btn').removeClass('hide');
            };
        }
        return historyCookie
    };
    //隐藏搜索历史记录
    view.prototype.clearDropContent = function (thisView) {
        thisView.find('#history').hide();
        thisView.find('#search_btn').addClass('hide');
    }
    //数组去重但是默认不排序
    view.prototype.unique = function (arr) {
        var re = [arr[0]];
        for (var i = 1; i < arr.length; i++) {
            if (arr[i] !== re[re.length - 1]) {
                re.push(arr[i]);
            }
        }
        return re;
    };
    return view;
});