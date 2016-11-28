var path = require('path');
var url = require('url');
var http = require('http');
var fs = require('fs');
var async = require('async');
var request = require('request');
var template = require('art-template/node/template-native.js');
var log = require('../logger/log');

var conf = require('./conf');
var rootPath = conf.rootPath;
var isDebugMode = conf.isDebugMode;

var cb = {};
cb.webserver = {};

cb.webserver.header = {
    'default': { 'Content-Type': 'application/octet-stream' },
    '.html': { 'Content-Type': 'text/html' },
    '.txt': { 'Content-Type': 'text/plain' },
    '.js': { 'Content-Type': 'text/javascript' },
    '.css': { 'Content-Type': 'text/css' },
    '.gif': { 'Content-Type': 'image/gif' },
    '.jpg': { 'Content-Type': 'image/jpeg' },
    '.png': { 'Content-Type': 'image/png' },
    '.json': { 'Content-Type': 'application/json' }
};

cb.webserver.application = {
    getWebServerConfig: function (req, res) {
        this.renderJson(res, { code: 200, message: '操作成功', data: {
            //'ServiceBase': conf.serviceBaseUrl,
            'ImageServer': conf.imageServerUrl
        }
        });
    },
    batchService: function (req, res, appendParams) {
        log.logger.info('开始请求分发...', 'cb.webserver.application.batchService');
        if (!req.body || !req.body.length) {
            this.renderJson(res, { code: 404, message: 'req.body is empty' });
            return;
        }
        var params = [];
        req.body.forEach(function (item) {
            params.push(function (callback) {
                var serviceUrl = cb.webserver.application.getServiceUrl(item.requestUrl, appendParams);
                cb.webserver.proxy.doRequestInner(serviceUrl, item.requestMethod, item.requestData, callback);
            });
        });
        async.parallel(params, function (err, results) {
            cb.webserver.application.renderJson(res, { code: 200, data: results });
            log.logger.info('完成请求合并...', 'cb.webserver.application.batchService');
        });
    },
    doService: function (req, res, appendParams, callback) {
        var serviceUrl = this.getServiceUrl(req.url, appendParams);
        cb.webserver.proxy.init({ url: serviceUrl, req: req, res: res, callback: callback });
        cb.webserver.proxy.doRequest();
    },
    redirectServiceToYILIAN: function (req, res) {
        var serviceUrl = conf.yilianServerUrl + req.url;
        cb.webserver.proxy.init({ url: serviceUrl, req: req, res: res });
        cb.webserver.proxy.doRequest();
    },
    doMultiparty: function (req, res, appendParams) {
        var serviceUrl = this.getServiceUrl(req.url, appendParams);
        req.headers = req.headers || {};
        req.headers.source = 'nodejs';
        req.pipe(request(serviceUrl)).pipe(res);
        return;
       /* var form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
            if (err) {
                cb.webserver.application.renderJson(res, err);
                return;
            }
            var formData = { file: fs.createReadStream(files.file[0].path) };
            request.post({ url: serviceUrl, formData: formData }, function (err1, response, body) {
                if (err1) {
                    cb.webserver.application.renderJson(res, err1);
                    return;
                }
                //cb.webserver.application.renderJson(res, fields);
                res.setHeader('Content-Type', 'application/json;charset=UTF-8');
                res.end(body);
            });
        });*/
    },
    getServiceUrl: function (requestUrl, appendParams) {
        var queryString = '';
        if (appendParams) {
            for (var attr in appendParams) {
                if (queryString)
                    queryString += '&';
                queryString += attr + '=' + appendParams[attr];
            }
        }
        var urlObj = url.parse(requestUrl);
        var serviceUrl = conf.serviceBaseUrl + urlObj.pathname + '?' + queryString;
        if (urlObj.query)
            serviceUrl += '&' + urlObj.query;
        return serviceUrl;
    },
    renderFromPlay: function (req, res, urlPath) {
        var playUrl = conf.serviceBaseUrl + urlPath;
        log.logger.info('开始图片加载' + playUrl, 'cb.webserver.application.renderFromPlay');
        var extname = path.extname(urlPath).toLocaleLowerCase();
        var header = cb.webserver.header[extname] || cb.webserver.header['default'];
        request.get(playUrl).on('response', function (response) {
            if (response.statusCode !== 200) {
                response.headers['content-type'] = header['Content-Type'];
                response.headers['content-length'] = 0;
                res.writeHead(response.statusCode, response.headers);
                res.end();
                return;
            }
            if (extname === '.txt')
                response.headers['content-disposition'] = 'attachment';
            res.writeHead(response.statusCode, response.headers);
            response.setEncoding('binary');
            var body = '';
            response.on('data', function (chunk) {
                body += chunk;
            });
            response.on('end', function () {
                res.write(body, 'binary');
                res.end();
                log.logger.info('完成图片加载' + playUrl, 'cb.webserver.application.renderFromPlay');
            });
        }).on('error', function (error) {
            res.writeHead(404, header);
            res.end();
        });
    },
    render: function (res, urlPath) {
        var pathName = path.join(rootPath, urlPath);
        log.logger.info('pathName: ' + pathName);
        var fileContent = cb.webserver.cache.getFileContent(pathName);
        if (fileContent) {
            res.writeHeader(200, cb.webserver.header[path.extname(pathName)] || cb.webserver.header['default']);
            res.end(fileContent);
            return;
        }
        fs.exists(pathName, function (exists) {
            var header = cb.webserver.header[path.extname(pathName)] || cb.webserver.header['default'];
            if (exists) {
                res.writeHead(200, header);
                fs.readFile(pathName, function (err, data) {
                    cb.webserver.cache.setFileContent(pathName, data);
                    res.end(data);
                });
            } else {
                res.writeHead(404, header);
                res.end();
            }
        });
    },
    renderText: function (res, text, title) {
        title = title || '';
        var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title></head><body>';
        if (typeof text === 'object') {
            for (var attr in text) {
                html += '<h1>' + attr + '</h1><h4>' + template.utils.$escape(text[attr]) + '</h4>';
            }
        } else {
            html += '<h1>' + text + '</h1>';
        }
        html += '</body></html>';
        res.end(html);
    },
    renderError: function (res, text) {
        this.renderText(res, text, '错误提示');
    },
    renderJson: function (res, jsonObj) {
        res.setHeader('Content-Type', 'application/json;charset=UTF-8');
        res.end(JSON.stringify(jsonObj));
    },
    renderJsonp: function (res, callback, jsonObj) {
        res.jsonp(jsonObj);
        //res.send(callback + '(' + JSON.stringify(jsonObj) + ')');
    }
};

cb.webserver.proxy = {
    init: function (context) {
        this._context = context;
    },
    doRequest: function () {
        var context = this._context;
        this.doRequestInner(context.url, context.req.method, context.req.body, function (err, result) {
            if (context.callback) {
                context.callback.call(this, err, result);
            } else {
                //context.res.end(JSON.stringify(result));
                cb.webserver.application.renderJson(context.res, result);
            }
        }, context.req.headers);
        //context.res.setHeader('Content-Type', 'application/json; charset=utf-8');
        //context.res.setHeader('Redirect URL', context.url);
    },
    doRequestInner: function (requestUrl, requestMethod, requestData, callback, headers) {
        var reqHeaders = { source: 'nodejs' };
        if (headers)
            reqHeaders.cookie = headers.cookie;
        var info = requestMethod + ' ' + requestUrl;
        log.logger.info('========================= Redirect URL begin =========================');
        log.logger.info(info);
        var options = {
            method: requestMethod,
            uri: requestUrl,
            json: true,
            pool: { maxSockets: Infinity },
            headers: reqHeaders
        };
        if (requestData) {
            options.form = requestData;
        }
        request(options, function (error, response, body) {
            if (error) {
                var msg = error.message + ' (' + info + ')';
                callback(null, { code: 404, message: msg, memo: '后端PLAY服务出错' });
                log.logger.error('Error: ' + msg);
                log.logger.error('========================= Redirect URL error =========================');
            } else {
                if (response.statusCode === 200 && body) {
                    callback(null, body);
                    log.logger.info('Success: ' + info);
                    log.logger.info('========================= Redirect URL end =========================');
                } else {
                    var items = [];
                    if (typeof body === 'string') {
                        items.push(body);
                    } else if (body) {
                        for (var attr in body) {
                            items.push(attr + ': ' + body[attr]);
                        }
                    }
                    items.push('(' + info + ')');
                    var message = items.join('\r\n');
                    callback(null, { code: response.statusCode, message: message, memo: '后端PLAY服务出错' });
                    log.logger.error('Error: ' + 'response statusCode is ' + response.statusCode + ', message is ' + message);
                    log.logger.error('========================= Redirect URL error =========================');
                }
            }
        });
    }
};

cb.webserver.cache = { fileDict: {} };

cb.webserver.cache.setFileContent = function (filePath, content) {
    //if (isDebugMode) return;
    return;
    this.fileDict[filePath] = content;
};

cb.webserver.cache.getFileContent = function (filePath) {
    return this.fileDict[filePath];
};

cb.webserver.cache.delFileContent = function (filePath) {
    delete this.fileDict[filePath];
};

cb.webserver.utility = {
    message: function (e) {
        //if (!isDebug) return;
        var msg = '--------------------------------------\r\n';
        if (e.message)
            msg += 'message: ' + e.message + '\r\n';
        if (e.source)
            msg += 'source: ' + e.source + '\r\n';
        msg += 'ts: ' + new Date().Format('yyyy-MM-dd hh:mm:ss.S');
        msg += '\r\n--------------------------------------';
        console.log(msg);
    },
    message: function (e, callback) {
        try {
            var logDir = path.resolve(rootPath, 'logs');
            fs.existsSync(logDir) || fs.mkdirSync(logDir);
            var date = new Date();
            var logFile = path.resolve(logDir, 'upmall_' + date.Format('yyyy_MM_dd_hh') + '.log');
            var logStream = fs.createWriteStream(logFile, { flags: 'a' });
            var logItems = [];
            logItems.push(date.Format('yyyy-MM-dd hh:mm:ss'));
            logItems.push(e.level || 'DEBUG');
            logItems.push(e.req ? this.getClientIp(e.req) : 'localhost');
            logItems.push(e.source || 'SOURCE');
            logItems.push(e.message || 'MESSAGE');
            logItems.push('\r\n');
            logStream.end(logItems.join(' '), callback);
        } catch (exp) {
            console.log(exp.message);
        }
    },
    queryString: function (url) {
        this.pathname = '/';
        this.query = {};

        this.init = function () {
            if (!url) return;
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

        this.del = function (key) {
            delete this.query[key];
        };

        this.search = function () {
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

        this.href = function () {
            return this.pathname + this.search();
        };

        this.init();
    },
    getClientIp: function (req) {
        return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || 'localhost';
    },
    parseJson: function (content) {
        // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
        // because the buffer-to-string conversion in `fs.readFileSync()`
        // translates it to FEFF, the UTF-16 BOM.
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }
        try {
            return JSON.parse(content);
        } catch (e) {
            return null;
        }
    },

    //extend(dest,src1,src2,src3...)
    //extend(boolean,dest,src1,src2,src3...)
    extend: function () {
        var src, copyIsArray, copy, name, options, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        // Handle a deep copy situation
        if (typeof target === "boolean") {
            deep = target;

            // skip the boolean and the target
            target = arguments[i] || {};
            i++;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (typeof target !== "object" && !cb.webserver.utility.isFunction(target)) {
            target = {};
        }

        // extend cb.util itself if only one argument is passed
        if (i === length) {
            target = this;
            i--;
        }

        for (; i < length; i++) {
            // Only deal with non-null/undefined values
            if ((options = arguments[i]) != null) {
                // Extend the base object
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (cb.webserver.utility.isPlainObject(copy) || (copyIsArray = cb.webserver.utility.isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && cb.webserver.utility.isArray(src) ? src : [];

                        } else {
                            clone = src && cb.webserver.utility.isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = cb.webserver.utility.extend(deep, clone, copy);

                        // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    },

    // See test/unit/core.js for details concerning isFunction.
    // Since version 1.3, DOM methods and functions like alert
    // aren't supported. They return false on IE (#2968).
    isFunction: function (obj) {
        return cb.webserver.utility.type(obj) === "function";
    },

    isArray: Array.isArray || function (obj) {
        return cb.webserver.utility.type(obj) === "array";
    },

    isWindow: function (obj) {
        /* jshint eqeqeq: false */
        return obj != null && obj == obj.window;
    },

    isPlainObject: function (obj) {
        var key;

        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if (!obj || cb.webserver.utility.type(obj) !== "object" || obj.nodeType || cb.webserver.utility.isWindow(obj)) {
            return false;
        }

        try {
            // Not own constructor property must be Object
            if (obj.constructor &&
                !hasOwn.call(obj, "constructor") &&
                !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
                return false;
            }
        } catch (e) {
            // IE8,9 Will throw exceptions on certain host objects #9897
            return false;
        }

        // Support: IE<9
        // Handle iteration over inherited properties before own properties.
        if (support.ownLast) {
            for (key in obj) {
                return hasOwn.call(obj, key);
            }
        }

        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.
        for (key in obj) { }

        return key === undefined || hasOwn.call(obj, key);
    },

    type: function (obj) {
        if (obj == null) {
            return obj + "";
        }
        return typeof obj === "object" || typeof obj === "function" ?
            class2type[toString.call(obj)] || "object" :
            typeof obj;
    },

    // args is for internal usage only
    each: function (obj, callback, args) {
        var value,
            i = 0,
            length = obj.length,
            isArray = isArraylike(obj);

        if (args) {
            if (isArray) {
                for (; i < length; i++) {
                    value = callback.apply(obj[i], args);

                    if (value === false) {
                        break;
                    }
                }
            } else {
                for (i in obj) {
                    value = callback.apply(obj[i], args);

                    if (value === false) {
                        break;
                    }
                }
            }

            // A special, fast, case for the most common use of each
        } else {
            if (isArray) {
                for (; i < length; i++) {
                    value = callback.call(obj[i], i, obj[i]);

                    if (value === false) {
                        break;
                    }
                }
            } else {
                for (i in obj) {
                    value = callback.call(obj[i], i, obj[i]);

                    if (value === false) {
                        break;
                    }
                }
            }
        }

        return obj;
    }
};

var class2type = {};

// Populate the class2type map
cb.webserver.utility.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function (i, name) {
    class2type["[object " + name + "]"] = name.toLowerCase();
});

function isArraylike(obj) {

    // Support: iOS 8.2 (not reproducible in simulator)
    // `in` check used to prevent JIT error (gh-2145)
    // hasOwn isn't used here due to false negatives
    // regarding Nodelist length in IE
    var length = "length" in obj && obj.length,
        type = cb.webserver.utility.type(obj);

    if (type === "function" || cb.webserver.utility.isWindow(obj)) {
        return false;
    }

    if (obj.nodeType === 1 && length) {
        return true;
    }

    return type === "array" || length === 0 ||
        typeof length === "number" && length > 0 && (length - 1) in obj;
}

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符， 
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) 
// 例子： 
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423 
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) { //author: meizz 
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

Array.prototype.removeAt = function (index) {
    if (index >= 0)
        return this.splice(index, 1);
};

module.exports = cb;