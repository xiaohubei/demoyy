var cb = {};

cb.events = {};
cb.events.on = function (name, callback, context) {
    if (!name || !callback) return;
    this._events || (this._events = {});
    var events = this._events[name] || (this._events[name] = []);
    events.push({ callback: callback, context: context });
};
cb.events.un = function (name, callback) {
    if (!name || !this._events || !this._events[name]) return;
    if (!callback) {
        delete this._events[name];
    } else {
        var index = this._events[name].findIndex(function (value) {
            if (value.callback === callback)
                return true;
        });
        if (index !== -1)
            this._events[name].removeData(this._events[name][index]);
    }
};
cb.events.hasEvent = function (name) {
    if (!name) return;
    return this._events && this._events[name] && this._events[name].length;
};
cb.events.execute = function (name) {
    if (!name) return;
    var events = this._events ? this._events[name] : null;
    if (!events) return true;
    var result = true;
    var args = Array.prototype.slice.call(arguments, 1);
    events.forEach(function (event) {
        result = event.callback.apply(event.context || this, args) === false ? false : result;
    }, this);
    return result;
};

cb.widgets = {};
cb.widgets.register = function (widgetType, func) {
    if (cb.widgets[widgetType]) {
        console.error('widgetType ' + widgetType + '已注册');
        return;
    }
    cb.widgets[widgetType] = func(widgetType);
};
cb.widgets.register('BaseWidget', function (widgetType) {
    var widget = function (id, options) {
        var _data = { id: id, elem: $('#' + id), options: options };

        this._get_data = function (attr) {
            return _data[attr];
        };

        this._set_data = function (attr, val) {
            _data[attr] = val;
        };
    };
    widget.prototype.widgetType = widgetType;

    widget.prototype.getId = function () {
        return this._get_data('id');
    };

    widget.prototype.getElement = function () {
        return this._get_data('elem');
    };

    widget.prototype.getConfig = function () {
        return this._get_data('options');
    };

    widget.prototype.getLazyLoadThreshold = function () {
        return 0;
    };

    widget.prototype.getProxyData = function () {
        return this.getConfig();
    };

    widget.prototype.getTemplate = function () {
        return this.getElement().find('script').html();
    };

    widget.prototype.render = function (data, escape) {
        var tpl = this.getTemplate();
        if(!tpl) return;
        var tplStr = typeof tpl === 'string' ? tpl : tpl.html();
        if (escape === false)
            template.config('escape', false);
        var func = template.compile(tplStr);
        if (escape === false)
            template.config('escape', true);
        return func(data);
    };

    return widget;
});
$.extend(cb.widgets.BaseWidget.prototype, cb.events);

cb.views = {};
cb.views.register = function (controllerName, func) {
    cb.views[controllerName] = func(controllerName);
};
cb.views.register('BaseView', function (controllerName) {
    var view = function (widgets) {
        var _data = { view: $('[data-controller=' + this.controllerName + ']'), widgets: widgets };

        this._get_data = function (attr) {
            return _data[attr];
        };

        this._set_data = function (attr, val) {
            _data[attr] = val;
        };
    };
    view.prototype.controllerName = controllerName;

    view.prototype.getView = function () {
        return this._get_data('view');
    };

    view.prototype.getWidgets = function () {
        return this._get_data('widgets');
    };

    view.prototype.getWidget = function (widgetName) {
        return this.getWidgets()[widgetName];
    };

    view.prototype.run = function () {
        var widgets = this.getWidgets();
        var widget;
        var $elem;
        var getProxyDataFunc = this.getProxyData;
        var mergeProxy = cb.rest.MergeProxy.create();
        for (var widgetName in widgets) {
            widget = widgets[widgetName];
            $elem = widget.getElement();
            if ($elem.hasClass('widgetHasLoaded') || (!cb.rest.AppContext.simulate && !cb.util.isElementInViewport($elem.get(0), widget.getLazyLoadThreshold()))) continue;
            $elem.addClass('widgetHasLoaded');
            if (!widget.getProxy) {
                if (widget.runTemplate)
                    widget.runTemplate();
                continue;
            }
            var proxy = widget.getProxy();
            if (!proxy) continue;
            var data = widget.getProxyData();
            if (getProxyDataFunc) {
                var viewProxyData = getProxyDataFunc.call(this, widgetName);
                if (viewProxyData) data = viewProxyData;
            }
            var callback = null;
            if (widget.runTemplate)
                callback = widget.runTemplate;
            mergeProxy.add(proxy, data, callback, widget);
        }
        mergeProxy.submit();
    };

    view.prototype.render = function (tpl, data, escape) {
        var tplStr = typeof tpl === 'string' ? tpl : tpl.html();
        if (escape === false)
            template.config('escape', false);
        var func = template.compile(tplStr);
        if (escape === false)
            template.config('escape', true);
        return func(data);
    };

    return view;
});
$.extend(cb.views.BaseView.prototype, cb.events);

cb.registerTemplate = function () {
    template.config('openTag', '<#');
    template.config('closeTag', '#>');
    template.helper('adjustImgSrc', function (src) {
        return cb.util.adjustImgSrc(src);
    });
    template.helper('adjustAttachPath', function (path) {
        return cb.util.adjustAttachPath(path);
    });
    template.helper('formatDate', function (strDate, fmt) {
        return cb.util.formatDate(strDate, fmt);
    });
    template.helper('formatMoney', function (money) {
        return cb.util.formatMoney(money);
    });
};

cb.init = function () {
    cb.rest.ContextBuilder.construct(cb.initInner);
};

cb.initInner = function () {
    $(document).on('click', 'a', function (e) {
        var curToken = cb.rest.AppContext.token;
        var newToken = cb.data.CookieParser.getCookie('token');
        if (curToken && newToken && curToken !== newToken) {
            e.preventDefault();
            //alert('系统异常，请在页面自动刷新后重试！');
            location.reload();
        } else if (cb.rest.AppContext.corpAlias) {
            var queryString = new cb.util.queryString($(this).attr('href'));
            queryString.set('corpalias', cb.rest.AppContext.corpAlias);
            $(this).attr('href', queryString.pathname + queryString.toStr());
        }
    });
    cb.registerTemplate();
    var viewControllerTag = 'data-controller';
    var views = document.querySelectorAll('[' + viewControllerTag + ']');
    if (views.length !== 1) return;
    var controllerName = views[0].getAttribute(viewControllerTag);
    var controllerConstructor = cb.views[controllerName];
    if (!controllerConstructor) return;

    var idTag = 'id';
    var widgetNameTag = 'data-name';
    var widgetTypeTag = 'data-type';
    var widgetOptionsTag = 'data-config';
    var widgets = {};
    var elements = document.querySelectorAll('[' + widgetTypeTag + ']');
    var element, id, widgetName, widgetType, options, widget;
    for (var i = 0, len = elements.length; i < len; i++) {
        element = elements[i];
        id = element.getAttribute(idTag);
        widgetName = element.getAttribute(widgetNameTag);
        widgetType = element.getAttribute(widgetTypeTag);
        options = cb.data.JsonSerializer.deserialize(element.getAttribute(widgetOptionsTag));
        if (!id) {
            //id = cb.getNewId('cb_widget_' + widgetName);
            id = widgetName;
            element.setAttribute(idTag, id);
        }
        var widgetConstructor = cb.widgets[widgetType];
        if (!widgetConstructor) continue;
        widget = new widgetConstructor(id, options);
        widgets[widgetName] = widget;
    }
    var controller = new controllerConstructor(widgets);
    controller.run();

    var lastScrollTop = 0, interval = null;
    $(window).scroll(function (e) {
        if (interval === null) {
            interval = setInterval(function () {
                if ($(e.target).scrollTop() === lastScrollTop) {
                    controller.run();
                    clearInterval(interval);
                    interval = null;
                }
            }, 1000);
        }
        lastScrollTop = $(e.target).scrollTop();
    });

    if (controller.init)
        controller.init();
};

cb.getNewId = function (prefix) {
    prefix = prefix || 'newId';
    var number = (cb.cache.newIds.get(prefix) || 0) + 1;
    cb.cache.newIds.set(prefix, number);
    return prefix + '_' + number;
};

cb.cache = {
    get: function (cacheName) {
        return this[cacheName];
    },
    set: function (cacheName, value) {
        this[cacheName] = value;
    },
    clear: function () {
        for (var attr in this)
            if (attr !== 'get' && attr !== 'set' && attr !== 'clear')
                delete this[attr];
    }
};
cb.cache.newIds = { get: cb.cache.get, set: cb.cache.set, clear: cb.cache.clear };

cb.rest = {};
cb.rest.loadImage = function (el, src) {
    el = $(el);
    src = cb.util.adjustImgSrc(src);
    var ts = new Date().valueOf();
    if (src.indexOf('?') < 0) {
        src += '?_=' + ts;
    } else {
        src += '&_=' + ts;
    }
    function onLoad() {
        el.attr('src', src);
    }
    var image = new Image();
    image.onload = onLoad;
    image.onerror = onLoad;
    image.src = src;
};
cb.rest.ContextBuilder = {
    construct: function (callback) {
        var queryString = new cb.util.queryString();
        var appContext = {
            serviceUrl: location.protocol + '//' + location.host,
            simulate: queryString.get('simulate'),
            corpAlias: queryString.get('corpalias')
        };
        cb.rest.AppContext = appContext;
        if (queryString.get('preview') === 'true')
            cb.rest.AppContext.preview = true;
        //var userData = cb.data.JsonSerializer.deserialize(localStorage.getItem('userData'));
        //cb.rest.AppContext = $.extend(true, {}, appContext, userData);
        //var token = cb.data.CookieParser.getCookie('token');
        //if (!token)
        //    delete cb.rest.AppContext.token;
        cb.rest.AppContext.cUserName = cb.data.CookieParser.getCookie('cUserName');
        cb.rest.AppContext.token = cb.data.CookieParser.getCookie('token');
        cb.rest.AppContext.inviteCode = cb.data.CookieParser.getCookie('inviteCode');
        cb.rest.AppContext.promotCode = cb.data.CookieParser.getCookie('promotCode');
        //cb.rest.AppContext = $.extend(true, {}, appContext, { cUserName: cUserName, token: token, inviteCode: inviteCode, promotCode: promotCode });
        callback();
        if (window.cookieUtil) {
            var proxy = cb.rest.DynamicProxy.create({ getMemberInfoByToken: { url: 'member/Members/getMemberByToken', method: 'GET', options: { token: true}} });
            proxy.getMemberInfoByToken(function (err, result) {
                if (window.logger && result)
                    logger(window, document, undefined, undefined, undefined, undefined, result.iCorpId, result.id, document.URL);
            });
        }
        return;
        var proxy = cb.rest.DynamicProxy.create({ getConfig: { url: 'client/getWebServerConfig', method: 'GET'} });
        proxy.getConfig(function (err, result) {
            if (result) {
                for (var attr in result) {
                    cb.rest.AppContext[attr] = result[attr];
                }
            }
            callback();
        });
    },
    promotion: function () {
        var queryString = new cb.util.queryString(location.search.toLocaleLowerCase());
        var inviteCode = queryString.get('invitecode');
        var promotCode = queryString.get('promotcode');
        if (!inviteCode && !promotCode) return;
        cb.data.CookieParser.delCookie('inviteCode');
        cb.data.CookieParser.delCookie('promotCode');
        if (inviteCode)
            cb.data.CookieParser.setCookie('inviteCode', inviteCode);
        if (promotCode)
            cb.data.CookieParser.setCookie('promotCode', promotCode);
        return;
        var proxy = cb.rest.DynamicProxy.create({ getConfig: { url: 'client/getWebServerConfig', method: 'GET'} });
        proxy.getConfig(function (err, result) {
            if (inviteCode)
                cb.data.CookieParser.setCookie('inviteCode', inviteCode);
            if (promotCode)
                cb.data.CookieParser.setCookie('promotCode', promotCode);
        });
    }
};
cb.rest._getUrl = function (restUrl, params) {
    var context = cb.rest.AppContext;
    var queryString = new cb.util.queryString(restUrl);
    queryString.set('terminaltype', 'PC');
    if (cb.util.browser() === 'IE' || params && params.refresh)
        queryString.set('_', new Date().valueOf());
    if (params && params.token)
        queryString.set('token', context.token || '');
    if (context && context.preview)
        queryString.set('preview', context.preview);
    if (context && context.corpAlias)
        queryString.set('corpalias', context.corpAlias);
    restUrl = queryString.pathname + queryString.toStr();
    if (restUrl.indexOf('http://') < 0) {
        if (restUrl.substr(0, 1) !== '/')
            restUrl = '/' + restUrl;
        restUrl = context.serviceUrl + restUrl;
    }
    return restUrl;
};
cb.rest._appendUrl = function (restUrl, params) {
    if (!params) return restUrl;
    var queryStr = [];
    for (var attr in params) {
        queryStr.push(attr + '=' + params[attr]);
    }
    if (!queryStr.length) return restUrl;
    var queryString = queryStr.join('&');
    return restUrl.indexOf('?') >= 0 ? (restUrl + '&' + queryString) : (restUrl + '?' + queryString);
};
cb.rest.DynamicProxy = function (config) {
    if (this.init)
        this.init(config);
};
cb.rest.DynamicProxy.create = function (config) {
    return new cb.rest.DynamicProxy(config);
};
cb.rest.DynamicProxy.prototype.init = function (config) {
    if (!config) return;
    this.config = config;
    for (var attr in this.config) {
        this[attr] = (function (attr) {
            return function (data, callback, context) {
                return this.Do(attr, data, callback, null, context);
            }
        })(attr);
        this[attr + 'Sync'] = (function (attr) {
            return function (data) {
                return this.Do(attr, data, null, false);
            }
        })(attr);
    }
};
cb.rest.DynamicProxy.prototype.Do = function (op, data, callback, async, context) {
    if (!this.config || !this.config[op] || !this.config[op].url) return;
    var config = this.config[op];
    var restUrl = config.url;
    var options = $.extend({}, config.options);
    options.method = config.method || 'GET';
    if (typeof data === 'function') {
        options.callback = data;
        options.context = context || options.context || this;
    } else {
        options.params = data;
    }
    if (callback) {
        options.callback = callback;
        options.context = context || options.context || this;
    }
    if (async === false)
        options.async = false;
    return this.ajax(restUrl, options);
};
cb.rest.DynamicProxy.prototype.ajax = function (url, options) {
    return cb.rest.ajax(url, options);
};
cb.rest.MergeProxy = function () {
    var _request = { datas: [], events: [] };

    this.add = function (proxy, data, callback, context) {
        if ($.isArray(proxy)) {
            var len = proxy.length;
            if ($.isArray(data)) {
                if (data.length === len) {
                    for (var i = 0; i < len; i++) {
                        this.addInner(proxy[i], data[i], callback, context);
                    }
                }
            } else {
                for (var i = 0; i < len; i++) {
                    this.addInner(proxy[i], data, callback, context);
                };
            }
        } else {
            this.addInner(proxy, data, callback, context);
        }
    };

    this.addInner = function (proxy, data, callback, context) {
        var requestMethod = proxy.method.toLocaleUpperCase()
        var requestUrl = cb.rest._getUrl(proxy.url, proxy.options);
        var requestData;
        if (requestMethod === 'GET' || requestMethod === 'DELETE') {
            requestUrl = cb.rest._appendUrl(requestUrl, data);
            requestData = null;
        } else {
            requestData = data;
        }
        _request.datas.push({ requestUrl: requestUrl, requestMethod: requestMethod, requestData: requestData });
        _request.events.push({ callback: callback, context: context });
    };

    this.submit = function (callback) {
        if (!_request.datas.length) return;
        var proxy = cb.rest.DynamicProxy.create({ BatchSubmit: { url: 'client/batchSubmit', method: 'POST'} });
        proxy.BatchSubmit(_request.datas, function (err, result) {
            if (callback) {
                callback(err, result);
                return;
            }
            if (err) {
                alert('合并请求提交失败: ' + err);
                return;
            }
            var len = result && result.length;
            if (!len) return;
            for (var i = 0; i < len; i++) {
                var event = _request.events[i];
                if (!event) continue;
                cb.rest.AjaxRequestManager.processAjaxResult(result[i], event.callback, event.context);
            }
            if (cb.rest.AppContext.simulate) {
                setTimeout(function () {
                    $(document.body).append('<div class="readyForCrawler"></div>');
                }, 3000);
            }
        });
    };
};
cb.rest.MergeProxy.create = function () {
    return new cb.rest.MergeProxy();
};
cb.rest.ajax = function (url, options) {
    options.url = url;
    return cb.rest.AjaxRequestManager.doRequest(options);
};
cb.rest.AjaxRequestManager = {
    _xhrs: [],
    doRequest: function (options) {
        var xhr = this.getXMLHttpRequest();
        if (!xhr) return;
        var method = options.method || 'GET';
        var url = cb.rest._getUrl(options.url, options);
        var queryJson = null;
        if (method.equalsIgnoreCase('get') || method.equalsIgnoreCase('delete'))
            url = cb.rest._appendUrl(url, options.params);
        else if (method.equalsIgnoreCase('post') || method.equalsIgnoreCase('put'))
            queryJson = cb.data.JsonSerializer.serialize(options.params);
        xhr.open(method, url, options.async === false ? false : true);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=utf-8');
        xhr.send(queryJson);
        if (options.async === false) {
            return this.onreadystatechange(xhr, options);
        } else {
            xhr.onreadystatechange = function () {
                cb.rest.AjaxRequestManager.onreadystatechange(this, options);
            };
        }
        if (options.mask === true)
            cb.util.loadingControl.start();
    },
    onreadystatechange: function (xhr, options) {
        if (xhr.readyState !== 4) return;
        if (options.mask === true)
            cb.util.loadingControl.end();
        if (xhr.status === 200) {
            var ajaxResult = cb.data.JsonSerializer.deserialize(xhr.responseText);
            cb.rest.AjaxRequestManager.processAjaxResult(ajaxResult, options.callback, options.context, options);
        }
        xhr.isBusy = false;
    },
    getXMLHttpRequest: function () {
        var xhr;
        for (var i = 0, len = this._xhrs.length; i < len; i++) {
            if (!this._xhrs[i].isBusy) {
                xhr = this._xhrs[i];
                break;
            }
        }
        if (!xhr) {
            xhr = this.createXMLHttpRequest();
            this._xhrs.push(xhr);
        }
        xhr.isBusy = true;
        return xhr;
    },
    createXMLHttpRequest: function () {
        var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : (window.ActiveXObject ? new ActiveXObject('Microsoft.XMLHTTP') : null);
        return xhr;
    },
    processAjaxResult: function (ajaxResult, callback, context, options) {
        if (!ajaxResult || !ajaxResult.code) return;
        if (ajaxResult.code == 200) {
            if (callback)
                callback.call(context, null, ajaxResult.data);
        } else {
            if (ajaxResult.code === 900 && options && options.token && options.autoLogin !== false) {
                cb.route.redirectLoginPage();
                return;
            }
            if (callback)
                callback.call(context, ajaxResult);
        }
    }
};

cb.data = {};
cb.data.JsonSerializer = {
    serialize: function (data) {
        if (!data) return null;
        if (window.JSON && JSON.stringify) {
            return JSON.stringify(data);
        } else {
            var type = typeof data;
            if (type === 'string' || type === 'number' || type === 'boolean') {
                return data;
            } else if (data.constructor === Array) {
                return this._innerSerialize(data);
            } else {
                return this._innerSerializeObj(data);
            }
        }
    },
    _innerSerializeObj: function (data) {
        var builder = [];
        for (var attr in data) {
            if (typeof data[attr] === 'function') continue;
            builder.push('"' + attr + '":' + this._innerSerialize(data[attr]));
        }
        return '{' + builder.join(',') + '}';
    },
    _innerSerialize: function (data) {
        if (cb.util.isEmpty(data)) return null;
        var type = typeof data;
        if (type === 'number' || type === 'boolean') {
            return data;
        } else if (data.constructor === Array) {
            var builder = [];
            data.forEach(function (item) {
                builder.push(this._innerSerialize(item));
            }, this);
            return '[' + builder.join(',') + ']';
        } else if (type === 'object') {
            return this._innerSerializeObj(data);
        } else {
            return '"' + data + '"';
        }
    },
    deserialize: function (data) {
        if (!data) return null;
        if (window.JSON && JSON.parse) {
            return JSON.parse(data);
        } else {
            return eval('(' + data.replace(/\r\n/g, '') + ')');
        }
    }
};
cb.data.SecurityParser = {
    encrypt: function (data, rsaPublicKey) {
        var serializedData = cb.data.JsonSerializer.serialize(data);
        var key = CryptoJS.enc.Utf8.parse(CryptoJS.MD5(serializedData)).toString();
        localStorage.setItem('AESKey', key);
        var encryptedKey = cryptico.encrypt(key, rsaPublicKey).cipher;
        var encryptedData = CryptoJS.AES.encrypt(serializedData, key).toString();
        return { encryptedKey: encryptedKey, encryptedData: encryptedData };
    },
    decrypt: function (encryptedToken) {
        var key = localStorage.getItem('AESKey');
        var bytes = CryptoJS.AES.decrypt(encryptedToken, key);
        var data = cb.data.JsonSerializer.deserialize(bytes.toString(CryptoJS.enc.Utf8));
        return data;
    },
    signature: function (data) {
        var items = [localStorage.getItem('AESKey'), cb.data.JsonSerializer.serialize(data)];
        var signature = CryptoJS.SHA1(items.join('')).toString();
        return signature;
    }
};

cb.data.CookieParser = {
    setCookie: function (name, value, expireDays) {
        if (cb.rest.AppContext.corpAlias) name = cb.rest.AppContext.corpAlias + '_' + name;
        if (expireDays == null) expireDays = 30;
        var exp = new Date();
        exp.setTime(exp.getTime() + expireDays * 24 * 60 * 60 * 1000);
        document.cookie = name + '=' + escape(value) + ';expires=' + exp.toGMTString();
    },
    getCookie: function (name) {
        if (cb.rest.AppContext.corpAlias) name = cb.rest.AppContext.corpAlias + '_' + name;
        var arr, reg = new RegExp('(^|)' + name + '=([^;]*)(;|$)');
        if (arr = document.cookie.match(reg)) {
            return unescape(arr[2]);
        } else {
            return null;
        }
    },
    delCookie: function (name) {
        if (cb.rest.AppContext.corpAlias) name = cb.rest.AppContext.corpAlias + '_' + name;
        var exp = new Date();
        exp.setTime(exp.getTime() - 1);
        var val = this.getCookie(name);
        if (val != null) {
            document.cookie = name + '=' + val + ';expires=' + exp.toGMTString();
        }
    }
};

cb.route = {
    redirectLoginPage: function () {
        location.href = '/login?returnUrl=' + encodeURIComponent(location.href);
    }
};

cb.util = {
    isEmpty: function (data) {
        return data === null || data === undefined;
    },
    isElementInViewport: function (el, threshold) {
        var width = window.innerWidth;
        var height = window.innerHeight;
        if (typeof width !== 'number') {
            if (document.compatMode === 'CSS1Compat') {
                width = document.documentElement.clientWidth;
                height = document.documentElement.clientHeight;
            } else {
                width = document.body.clientWidth;
                height = document.body.clientHeight;
            }
        }
        var rect = el.getBoundingClientRect();
        return (
            rect.top >= (0 - threshold) &&
            rect.left >= (0 - threshold) &&
            rect.top <= (height + threshold) &&
            rect.left <= (width + threshold)
        );
    },
    queryString: function (url) {
        this.pathname = '';
        this.query = {};

        this.init = function () {
            if (!url) url = location.search;
            var index1 = url.indexOf('?');
            var index2 = url.indexOf('#');
            if (index1 >= 0) {
                this.pathname = url.substr(0, index1);
                url = index2 < 0 ? url.substr(index1 + 1) : url.substring(index1 + 1, index2);
                if (url.length > 0) {
                    url = url.replace(/\+/g, ' ');
                    var params = url.split('&');
                    for (var i = 0, len = params.length; i < len; i++) {
                        var param = params[i].split('=');
                        var key = decodeURIComponent(param[0]);
                        var value = (param.length == 2) ? decodeURIComponent(param[1]) : key;
                        this.query[key] = value;
                    }
                }
            } else {
                this.pathname = url;
            }
        };

        this.set = function (key, value) {
            this.query[key] = value;
        };

        this.get = function (key) {
            return this.query[key];
        };

        this.has = function (key) {
            return this.query[key] != null;
        };

        this.toStr = function () {
            var items = ['?'];
            for (var key in this.query) {
                items.push(encodeURIComponent(key));
                items.push('=');
                items.push(encodeURIComponent(this.query[key]));
                items.push('&');
            }
            if (items.length === 1) {
                return '';
            } else {
                items.removeAt(items.length - 1);
                return items.join('');
            }
        };

        this.init();
    },
    localStorage: {
        setItem: function (key, value) {
            if (cb.rest.AppContext.corpAlias) {
                localStorage.setItem(cb.rest.AppContext.corpAlias + '_' + key, value);
                return;
            }
            localStorage.setItem(key, value);
        },
        getItem: function (key) {
            if (cb.rest.AppContext.corpAlias)
                return localStorage.getItem(cb.rest.AppContext.corpAlias + '_' + key);
            return localStorage.getItem(key);
        },
        removeItem: function (key) {
            if (cb.rest.AppContext.corpAlias) {
                localStorage.removeItem(cb.rest.AppContext.corpAlias + '_' + key);
                return;
            }
            localStorage.removeItem(key);
        }
    },
    permutate: function (array, permutatedArray) {
        if (!permutatedArray) permutatedArray = [];
        if (array.length > 1) {
            var curItem = array.shift();
            this.permutate(array, permutatedArray);
            for (var i = 0, len = permutatedArray.length; i < len; i++) {
                var p = permutatedArray.shift();
                for (var j = 0, len1 = p.length; j <= len1; j++) {
                    var r = p.slice(0);
                    r.splice(j, 0, curItem);
                    permutatedArray.push(r);
                }
            }
        } else {
            permutatedArray.push([array[0]]);
        }
        return permutatedArray;
    },
    adjustImgSrc: function (src) {
        if (!src) return src;
        var newSrc = src.replace(/\\/g, '/');
        if (cb.rest.AppContext.ImageServer) {
            if (newSrc.substr(0, 1) === '/') {
                newSrc = cb.rest.AppContext.ImageServer + newSrc;
            } else {
                newSrc = cb.rest.AppContext.ImageServer + '/' + newSrc;
            }
        }
        return newSrc;
    },
    adjustAttachPath: function (path) {
        if (!path) return path;
        return path.replace(/\\/g, '/');
    },
    formatDate: function (strDate, fmt) {
        if (!strDate) return strDate;
        if (!fmt) fmt = 'yyyy-MM-dd';
        strDate = strDate.split(" ");
        strDate = strDate[0].replace(/-/g, '/');
        var date = new Date(strDate);
        var o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "S": date.getMilliseconds()
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    },
    formatMoney: function (money) {
        if (!money) money = 0;
        if (typeof money !== 'number') money = parseFloat(money);
        return '￥' + money.toFixed(2);
    },
    browser: function () {
        //if (navigator.userAgent.indexOf('MSIE') > 0)
        //if (! -[1, ])
        if (!!window.ActiveXObject || 'ActiveXObject' in window)
            return 'IE';
        return null;
    },
    loadingControl: {
        _handler: document.querySelectorAll('.loadingControl'),
        start: function () {
            if (!this._handler.length && this._handler.tagName !== 'DIV') {
                this._handler = document.createElement('div');
                this._handler.setAttribute('class', 'loadingControl');
                this._handler.style.position = 'fixed';
                this._handler.style.top = 0;
                this._handler.style.right = 0;
                this._handler.style.bottom = 0;
                this._handler.style.left = 0;
                this._handler.style.zIndex = 10000;
                this._handler.style.background = 'url("./img/load.gif") no-repeat 50% 50%';
                document.body.appendChild(this._handler);
            }
            if (this._handler.style.display === 'none')
                this._handler.style.display = 'block';
        },
        end: function () {
            if (!this._handler) return;
            if (this._handler.style.display !== 'none')
                this._handler.style.display = 'none';
        }
    },
    clickTimeout: {
        _timeout: null,
        set: function (fn) {
            this.clear();
            this._timeout = setTimeout(fn, 300);
        },
        clear: function () {
            if (this._timeout)
                clearTimeout(this._timeout);
        }
    }
};

String.prototype.equalsIgnoreCase = function (str) {
    if (str == null) return false;
    return this.toLowerCase() === str.toLowerCase();
};

Array.prototype.removeAt = function (index) {
    if (index >= 0)
        return this.splice(index, 1);
};

//#region String(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)

if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}

//#endregion

//#region Array(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18
if (!Array.prototype.forEach) {

    Array.prototype.forEach = function (callback, thisArg) {

        var T, k;

        if (this == null) {
            throw new TypeError(' this is null or not defined');
        }

        // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== "function") {
            throw new TypeError(callback + ' is not a function');
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (arguments.length > 1) {
            T = thisArg;
        }

        // 6. Let k be 0
        k = 0;

        // 7. Repeat, while k < len
        while (k < len) {

            var kValue;

            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            if (k in O) {

                // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
                kValue = O[k];

                // ii. Call the Call internal method of callback with T as the this value and
                // argument list containing kValue, k, and O.
                callback.call(T, kValue, k, O);
            }
            // d. Increase k by 1.
            k++;
        }
        // 8. return undefined
    };
}

// Production steps of ECMA-262, Edition 5, 15.4.4.17
// Reference: http://es5.github.io/#x15.4.4.17
if (!Array.prototype.some) {
    Array.prototype.some = function (fun/*, thisArg*/) {
        'use strict';

        if (this == null) {
            throw new TypeError('Array.prototype.some called on null or undefined');
        }

        if (typeof fun !== 'function') {
            throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;

        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if (i in t && fun.call(thisArg, t[i], i, t)) {
                return true;
            }
        }

        return false;
    };
}

if (!Array.prototype.filter) {
    Array.prototype.filter = function (fun/*, thisArg*/) {
        'use strict';

        if (this === void 0 || this === null) {
            throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function') {
            throw new TypeError();
        }

        var res = [];
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i];

                // NOTE: Technically this should Object.defineProperty at
                //       the next index, as push can be affected by
                //       properties on Object.prototype and Array.prototype.
                //       But that method's new, and collisions should be
                //       rare, so use the more-compatible alternative.
                if (fun.call(thisArg, val, i, t)) {
                    res.push(val);
                }
            }
        }

        return res;
    };
}

// Production steps of ECMA-262, Edition 5, 15.4.4.19
// Reference: http://es5.github.io/#x15.4.4.19
if (!Array.prototype.map) {

    Array.prototype.map = function (callback, thisArg) {

        var T, A, k;

        if (this == null) {
            throw new TypeError(' this is null or not defined');
        }

        // 1. Let O be the result of calling ToObject passing the |this| 
        //    value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal 
        //    method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (arguments.length > 1) {
            T = thisArg;
        }

        // 6. Let A be a new array created as if by the expression new Array(len) 
        //    where Array is the standard built-in constructor with that name and 
        //    len is the value of len.
        A = new Array(len);

        // 7. Let k be 0
        k = 0;

        // 8. Repeat, while k < len
        while (k < len) {

            var kValue, mappedValue;

            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the HasProperty internal 
            //    method of O with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            if (k in O) {

                // i. Let kValue be the result of calling the Get internal 
                //    method of O with argument Pk.
                kValue = O[k];

                // ii. Let mappedValue be the result of calling the Call internal 
                //     method of callback with T as the this value and argument 
                //     list containing kValue, k, and O.
                mappedValue = callback.call(T, kValue, k, O);

                // iii. Call the DefineOwnProperty internal method of A with arguments
                // Pk, Property Descriptor
                // { Value: mappedValue,
                //   Writable: true,
                //   Enumerable: true,
                //   Configurable: true },
                // and false.

                // In browsers that support Object.defineProperty, use the following:
                // Object.defineProperty(A, k, {
                //   value: mappedValue,
                //   writable: true,
                //   enumerable: true,
                //   configurable: true
                // });

                // For best browser support, use the following:
                A[k] = mappedValue;
            }
            // d. Increase k by 1.
            k++;
        }

        // 9. return A
        return A;
    };
}

// Production steps of ECMA-262, Edition 5, 15.4.4.14
// Reference: http://es5.github.io/#x15.4.4.14
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {

        var k;

        // 1. Let o be the result of calling ToObject passing
        //    the this value as the argument.
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let lenValue be the result of calling the Get
        //    internal method of o with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = o.length >>> 0;

        // 4. If len is 0, return -1.
        if (len === 0) {
            return -1;
        }

        // 5. If argument fromIndex was passed let n be
        //    ToInteger(fromIndex); else let n be 0.
        var n = +fromIndex || 0;

        if (Math.abs(n) === Infinity) {
            n = 0;
        }

        // 6. If n >= len, return -1.
        if (n >= len) {
            return -1;
        }

        // 7. If n >= 0, then Let k be n.
        // 8. Else, n<0, Let k be len - abs(n).
        //    If k is less than 0, then let k be 0.
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        // 9. Repeat, while k < len
        while (k < len) {
            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the
            //    HasProperty internal method of o with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            //    i.  Let elementK be the result of calling the Get
            //        internal method of o with the argument ToString(k).
            //   ii.  Let same be the result of applying the
            //        Strict Equality Comparison Algorithm to
            //        searchElement and elementK.
            //  iii.  If same is true, return k.
            if (k in o && o[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}

//#endregion

if (!document.querySelectorAll) {
    // IE7 support for querySelectorAll. Supports multiple / grouped selectors and the attribute selector with a "for" attribute. http://www.codecouch.com/
    (function (d, s) {
        d = document, s = d.createStyleSheet();
        d.querySelectorAll = function (r, c, i, j, a) {
            a = d.all, c = [], r = r.replace(/\[for\b/gi, '[htmlFor').split(',');
            for (i = r.length; i--; ) {
                s.addRule(r[i], 'k:v');
                for (j = a.length; j--; ) a[j].currentStyle.k && c.push(a[j]);
                s.removeRule(0);
            }
            return c;
        }
    })()
}

if (!window.localStorage && /MSIE/.test(navigator.userAgent)) {
    if (!window.UserData) {
        window.UserData = function (file_name) {
            if (!file_name) file_name = "user_data_default";
            var dom = document.createElement('input');
            dom.type = "hidden";
            dom.addBehavior("#default#userData");
            document.body.appendChild(dom);
            dom.save(file_name);
            this.file_name = file_name;
            this.dom = dom;
            return this;
        };
        window.UserData.prototype = {
            setItem: function (k, v) {
                this.dom.setAttribute(k, v);
                this.dom.save(this.file_name);
            },
            getItem: function (k) {
                this.dom.load(this.file_name);
                return this.dom.getAttribute(k);
            },
            removeItem: function (k) {
                this.dom.removeAttribute(k);
                this.dom.save(this.file_name);
            },
            clear: function () {
                this.dom.load(this.file_name);
                var now = new Date();
                now = new Date(now.getTime() - 1);
                this.dom.expires = now.toUTCString();
                this.dom.save(this.file_name);
            }
        };
    }
    window.localStorage = new window.UserData("local_storage");
}

if (!window.console) {
    window.console = (function () {
        var c = {};
        c.log = c.warn = c.debug = c.info = c.error = c.time = c.dir = c.profile = c.clear = c.exception = c.trace = c.assert = function () { };
        return c;
    })();
}

//#region JSON(https://github.com/douglascrockford/JSON-js/blob/master/json2.js)

if (typeof JSON !== 'object') {
    JSON = {};

    (function () {
        'use strict';

        var rx_one = /^[\],:{}\s]*$/,
        rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
        rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
        rx_four = /(?:^|:|,)(?:\s*\[)+/g,
        rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

        function f(n) {
            // Format integers to have at least two digits.
            return n < 10
            ? '0' + n
            : n;
        }

        function this_value() {
            return this.valueOf();
        }

        if (typeof Date.prototype.toJSON !== 'function') {

            Date.prototype.toJSON = function () {

                return isFinite(this.valueOf())
                ? this.getUTCFullYear() + '-' +
                        f(this.getUTCMonth() + 1) + '-' +
                        f(this.getUTCDate()) + 'T' +
                        f(this.getUTCHours()) + ':' +
                        f(this.getUTCMinutes()) + ':' +
                        f(this.getUTCSeconds()) + 'Z'
                : null;
            };

            Boolean.prototype.toJSON = this_value;
            Number.prototype.toJSON = this_value;
            String.prototype.toJSON = this_value;
        }

        var gap,
        indent,
        meta,
        rep;


        function quote(string) {

            // If the string contains no control characters, no quote characters, and no
            // backslash characters, then we can safely slap some quotes around it.
            // Otherwise we must also replace the offending characters with safe escape
            // sequences.

            rx_escapable.lastIndex = 0;
            return rx_escapable.test(string)
            ? '"' + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string'
                    ? c
                    : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"'
            : '"' + string + '"';
        }


        function str(key, holder) {

            // Produce a string from holder[key].

            var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

            // If the value has a toJSON method, call it to obtain a replacement value.

            if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
                value = value.toJSON(key);
            }

            // If we were called with a replacer function, then call the replacer to
            // obtain a replacement value.

            if (typeof rep === 'function') {
                value = rep.call(holder, key, value);
            }

            // What happens next depends on the value's type.

            switch (typeof value) {
                case 'string':
                    return quote(value);

                case 'number':

                    // JSON numbers must be finite. Encode non-finite numbers as null.

                    return isFinite(value)
                ? String(value)
                : 'null';

                case 'boolean':
                case 'null':

                    // If the value is a boolean or null, convert it to a string. Note:
                    // typeof null does not produce 'null'. The case is included here in
                    // the remote chance that this gets fixed someday.

                    return String(value);

                    // If the type is 'object', we might be dealing with an object or an array or
                    // null.

                case 'object':

                    // Due to a specification blunder in ECMAScript, typeof null is 'object',
                    // so watch out for that case.

                    if (!value) {
                        return 'null';
                    }

                    // Make an array to hold the partial results of stringifying this object value.

                    gap += indent;
                    partial = [];

                    // Is the value an array?

                    if (Object.prototype.toString.apply(value) === '[object Array]') {

                        // The value is an array. Stringify every element. Use null as a placeholder
                        // for non-JSON values.

                        length = value.length;
                        for (i = 0; i < length; i += 1) {
                            partial[i] = str(i, value) || 'null';
                        }

                        // Join all of the elements together, separated with commas, and wrap them in
                        // brackets.

                        v = partial.length === 0
                    ? '[]'
                    : gap
                        ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                        : '[' + partial.join(',') + ']';
                        gap = mind;
                        return v;
                    }

                    // If the replacer is an array, use it to select the members to be stringified.

                    if (rep && typeof rep === 'object') {
                        length = rep.length;
                        for (i = 0; i < length; i += 1) {
                            if (typeof rep[i] === 'string') {
                                k = rep[i];
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (
                                gap
                                    ? ': '
                                    : ':'
                            ) + v);
                                }
                            }
                        }
                    } else {

                        // Otherwise, iterate through all of the keys in the object.

                        for (k in value) {
                            if (Object.prototype.hasOwnProperty.call(value, k)) {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (
                                gap
                                    ? ': '
                                    : ':'
                            ) + v);
                                }
                            }
                        }
                    }

                    // Join all of the member texts together, separated with commas,
                    // and wrap them in braces.

                    v = partial.length === 0
                ? '{}'
                : gap
                    ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                    : '{' + partial.join(',') + '}';
                    gap = mind;
                    return v;
            }
        }

        // If the JSON object does not yet have a stringify method, give it one.

        if (typeof JSON.stringify !== 'function') {
            meta = {    // table of character substitutions
                '\b': '\\b',
                '\t': '\\t',
                '\n': '\\n',
                '\f': '\\f',
                '\r': '\\r',
                '"': '\\"',
                '\\': '\\\\'
            };
            JSON.stringify = function (value, replacer, space) {

                // The stringify method takes a value and an optional replacer, and an optional
                // space parameter, and returns a JSON text. The replacer can be a function
                // that can replace values, or an array of strings that will select the keys.
                // A default replacer method can be provided. Use of the space parameter can
                // produce text that is more easily readable.

                var i;
                gap = '';
                indent = '';

                // If the space parameter is a number, make an indent string containing that
                // many spaces.

                if (typeof space === 'number') {
                    for (i = 0; i < space; i += 1) {
                        indent += ' ';
                    }

                    // If the space parameter is a string, it will be used as the indent string.

                } else if (typeof space === 'string') {
                    indent = space;
                }

                // If there is a replacer, it must be a function or an array.
                // Otherwise, throw an error.

                rep = replacer;
                if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                    throw new Error('JSON.stringify');
                }

                // Make a fake root object containing our value under the key of ''.
                // Return the result of stringifying the value.

                return str('', { '': value });
            };
        }


        // If the JSON object does not yet have a parse method, give it one.

        if (typeof JSON.parse !== 'function') {
            JSON.parse = function (text, reviver) {

                // The parse method takes a text and an optional reviver function, and returns
                // a JavaScript value if the text is a valid JSON text.

                var j;

                function walk(holder, key) {

                    // The walk method is used to recursively walk the resulting structure so
                    // that modifications can be made.

                    var k, v, value = holder[key];
                    if (value && typeof value === 'object') {
                        for (k in value) {
                            if (Object.prototype.hasOwnProperty.call(value, k)) {
                                v = walk(value, k);
                                if (v !== undefined) {
                                    value[k] = v;
                                } else {
                                    delete value[k];
                                }
                            }
                        }
                    }
                    return reviver.call(holder, key, value);
                }


                // Parsing happens in four stages. In the first stage, we replace certain
                // Unicode characters with escape sequences. JavaScript handles many characters
                // incorrectly, either silently deleting them, or treating them as line endings.

                text = String(text);
                rx_dangerous.lastIndex = 0;
                if (rx_dangerous.test(text)) {
                    text = text.replace(rx_dangerous, function (a) {
                        return '\\u' +
                            ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    });
                }

                // In the second stage, we run the text against regular expressions that look
                // for non-JSON patterns. We are especially concerned with '()' and 'new'
                // because they can cause invocation, and '=' because it can cause mutation.
                // But just to be safe, we want to reject all unexpected forms.

                // We split the second stage into 4 regexp operations in order to work around
                // crippling inefficiencies in IE's and Safari's regexp engines. First we
                // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
                // replace all simple value tokens with ']' characters. Third, we delete all
                // open brackets that follow a colon or comma or that begin the text. Finally,
                // we look to see that the remaining characters are only whitespace or ']' or
                // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

                if (
                rx_one.test(
                    text
                        .replace(rx_two, '@')
                        .replace(rx_three, ']')
                        .replace(rx_four, '')
                )
            ) {

                    // In the third stage we use the eval function to compile the text into a
                    // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
                    // in JavaScript: it can begin a block or an object literal. We wrap the text
                    // in parens to eliminate the ambiguity.

                    j = eval('(' + text + ')');

                    // In the optional fourth stage, we recursively walk the new structure, passing
                    // each name/value pair to a reviver function for possible transformation.

                    return typeof reviver === 'function'
                    ? walk({ '': j }, '')
                    : j;
                }

                // If the text is not JSON parseable, then a SyntaxError is thrown.

                throw new SyntaxError('JSON.parse');
            };
        }
    } ());
}

//#endregion