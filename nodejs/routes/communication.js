var url = require('url');
var os = require('os');
var fs = require('fs');
var path = require('path');
var async = require('async');
var xml2js = require('xml2js');
var conf = require('../common/conf');
var log = require('../logger/log');

var _cb = require('../common/cube');
var _runner = require('../tplengine/runner');

var _corpInfoDict;
var _corpTplDict;
var _corpConfDict;

var _corpDomainMap;
var _corpAliasMap;
var _corpWechatMap;
var _needPatchCorps;

var _isPrivateCloud;
var _corpInfo;
var _corpTpl;
var _corpConf;
var _packageConfig;

var _defaultWebDomain = 'upmalltest.yonyouup.com';
var _defaultCorpId = 21;
var _defaultWid = 'gh_d40a33fee8e0'; //“U易联研发”服务号

var _possibleHost = {};
var _defaultHost;

var preloadPossibleHost = function () {
    var items = [];
    var interfaces = os.networkInterfaces();
    for (var attr in interfaces) {
        interfaces[attr].forEach(function (network) {
            if (network.family.toLocaleLowerCase() !== 'IPv4'.toLocaleLowerCase()) return;
            items.push(network.address);
        });
    }
    items.push('localhost');
    items.push(os.hostname().toLocaleLowerCase());
    items.forEach(function (item) {
        var host = item + ':' + conf.currentPort;
        _possibleHost[host] = true;
        if (!_defaultHost)
            _defaultHost = host;
    });
};
preloadPossibleHost();

var callbackManager = {};

callbackManager.preloadCorps = function (result) {
    _corpInfoDict = {};
    _corpTplDict = {};
    _corpConfDict = {};
    _corpDomainMap = {};
    _corpAliasMap = {};
    _corpWechatMap = {};
    _needPatchCorps = {};
    if (result.code !== 200) {
        _corpInfoDict['ERROR'] = result;
        return;
    }
    if (!result.data.length) return;
    if (result.data.length === 1) {
        _isPrivateCloud = true;
        var item = result.data[0];
        _corpInfo = constructCorpInfo(item);
        _corpTpl = constructCorpTpl(item);
        _corpConf = constructCorpConf(item);
    } else {
        _isPrivateCloud = false;
    }
    for (var i = 0, len = result.data.length; i < len; i++) {
        var item = result.data[i];
        if (item.cWebDomain && item.cWebDomain.trim().toLocaleLowerCase() === _defaultWebDomain && item.id) {
            _defaultCorpId = item.id;
            break;
        }
    }
    result.data.forEach(function (item) {
        // id和alias必需
        if (!item.id || !item.cAlias) return;
        var corpId = item.id;
        rebuildCorpInfo(corpId, item);
        var corpTpl = constructCorpTpl(item);
        rebuildCorpTpl(corpId, corpTpl);
        rebuildCorpConf(corpId, item);
        var hasTpl = getCorpTpl(null, corpId);
        // 域名映射
        if (item.cWebDomain) {
            var webDomain = item.cWebDomain.trim().toLocaleLowerCase();
            _corpDomainMap[webDomain] = corpId;
            if (webDomain.substr(0, 4) === 'www.')
                _corpDomainMap[webDomain.substr(4)] = corpId;
            if (hasTpl)
                _needPatchCorps[corpId] = true;
        }
        // wid映射
        if (_cb.webserver.utility.isArray(item.wids) && item.wids.length) {
            item.wids.forEach(function (wid) {
                if (!wid) return;
                _corpWechatMap[wid.trim().toLocaleLowerCase()] = corpId;
                if (hasTpl)
                    _needPatchCorps[corpId] = true;
            });
        }
    });
};

callbackManager.getYiLianServer = function (result) {
    if (result.code && result.code !== 200) return;
    log.logger.info(result, 'communication.getYiLianServer');
    var index = result.indexOf('://');
    var protocol = result.substr(0, index);
    var host = result.substr(index + 3);
    var index1 = host.indexOf('/');
    if (index1 >= 0)
        host = host.substr(0, index1);
    conf.yilianServerUrl = protocol + '://' + host;
    log.logger.info(conf.yilianServerUrl, 'communication.getYiLianServer');
};

var preprocess = function () {
    _corpInfoDict = null;
    _corpTplDict = null;
    _corpConfDict = null;
    _corpDomainMap = null;
    _corpAliasMap = null;
    _corpWechatMap = null;
    _needPatchCorps = null;
    _isPrivateCloud = null;
    _corpInfo = null;
    _corpTpl = null;
    _corpConf = null;
    _packageConfig = null;
    var asyncParams = {};
    asyncParams['preloadCorps'] = function (asyncCallback) {
        var getCorprationListUrl = conf.serviceBaseUrl + '/client/Corprations/getCorprationList';
        _cb.webserver.proxy.doRequestInner(getCorprationListUrl, 'GET', null, asyncCallback);
    };
    asyncParams['getYiLianServer'] = function (asyncCallback) {
        var getYLApiHostUrl = conf.serviceBaseUrl + '/client/Corprations/getYLApiHost';
        _cb.webserver.proxy.doRequestInner(getYLApiHostUrl, 'GET', null, asyncCallback);
    };
    asyncParams['getPackageConfig'] = function (asyncCallback) {
        var configFilePath = path.resolve(conf.rootPath, 'package', 'config.json');
        fs.readFile(configFilePath, 'utf-8', asyncCallback);
    };
    async.parallel(asyncParams, function (error, results) {
        if (error) {
            log.logger.error(error, 'communication.preprocess');
            return;
        }
        callbackManager.getYiLianServer(results.getYiLianServer);
        callbackManager.preloadCorps(results.preloadCorps);
        if (conf.needPatch)
            conf.isDebugMode ? processTemplateInner(true) : processTemplateInner();
        _packageConfig = _cb.webserver.utility.parseJson(results.getPackageConfig);
        if (conf.needPackage)
            conf.isDebugMode ? mobilePackage(_defaultHost) : batchMobilePackage();
    });
};

//preprocess();

var constructCorpInfo = function (item) {
    return {
        webDomain: item.cWebDomain,
        wids: item.wids,
        distribution: item.iWDistribution,
        siteName: item.siteName,
        id: item.id,
        alias: item.cAlias,
        logoPath: item.cLogo,
        iconPath: item.pLogo,
        code: item.cCode,
        name: item.cName,
        phone: item.cPhone,
        tax: item.cTaxNo,
        theme: item.cTheme
    };
};

var constructCorpTpl = function (item) {
    return item.templateAliasMap ? { templateAlias: item.templateAliasMap} : null;
};

var constructCorpConf = function (item) {
    var configs = {};
    if (item.storeSetting && item.storeSetting.showfooter)
        configs.showFootprint = item.storeSetting.showfooter;
    return { configs: configs };
};

var rebuildCorpInfo = function (corpId, item) {
    var corpInfo = constructCorpInfo(item);
    _corpInfoDict[corpId] = corpInfo;
    // alias映射
    _corpAliasMap[item.cAlias.trim().toLocaleLowerCase()] = corpId;
    // 默认公司映射
    if (_defaultCorpId && corpId === _defaultCorpId)
        _corpInfo = corpInfo;
};

var rebuildCorpTpl = function (corpId, corpTpl) {
    _corpTplDict[corpId] = corpTpl;
    if (_defaultCorpId && corpId === _defaultCorpId)
        _corpTpl = corpTpl;
};

var rebuildCorpConf = function (corpId, item) {
    var corpConf = constructCorpConf(item);
    _corpConfDict[corpId] = corpConf;
    if (_defaultCorpId && corpId === _defaultCorpId)
        _corpConf = corpConf;
};

var checkCrawler = function (req, res) {
    var queryString = new _cb.webserver.utility.queryString(req.url);
    var isCrawler;
    if (queryString.has('crawler')) {
        isCrawler = true;
        queryString.del('crawler');
    } else {
        var ua = req.headers['user-agent'];
        isCrawler = ua.indexOf('spider') > -1 || ua.indexOf('bot') > -1;
    }
    if (isCrawler) {
        var webDomain = req.header('host');
        var corpInfo = getCorpInfo(req, webDomain);
        if (!corpInfo) {
            _cb.webserver.application.renderError(res, webDomain + ': 没有找着公司信息');
            return true;
        }
        queryString.set('simulate', true);
        queryString.set('corpalias', corpInfo.alias);
        var simulateUrl = req.protocol + '://localhost:' + conf.currentPort + queryString.href();
        var Browser = require('zombie');
        var browser = new Browser();
        browser.visit(simulateUrl, { duration: '1m', element: '.readyForCrawler' }, function () {
            res.writeHead(200, _cb.webserver.header['.html']);
            res.end(browser.html());
        });
        return true;
    }
    return false;
};

var renderMemberTemplate = function (req, res, params) {
    if (_corpInfoDict && _corpInfoDict['ERROR'])
        preprocess();
    renderMemberTemplate1(req, res, params);
};

var renderMemberTemplate1 = function (req, res, params) {
    //if (!beforeRender(renderMemberTemplate1, req, res, params)) return;
    checkMemberStatus(req, res, params, function (isValidToken) {
        if (!isValidToken) {
            redirectLoginPage(req, res);
            return;
        }
        renderTemplateCommon(req, res, params);
    });
};

var checkMemberStatus = function (req, res, params, callback) {
    log.logger.info(req.url, 'communication.checkMemberStatus');

    var sizeParams = getSize(req);
    if (sizeParams.size === 'M') {
        /*if (sizeParams.mode === 'wechat') {
            checkWechatMemberStatus(req, res, params, callback, sizeParams.distribution);
        } else {
            checkMobileMemberStatus(req, res, params, callback);
        }*/
    } else {
        callback();
        //checkCommonMemberStatus(req, res, params, callback);
    }
};

// 非移动端会员状态校验
var checkCommonMemberStatus = function (req, res, params, callback) {
    var token = req.cookies ? req.cookies.token : "";
    getMemberStatus(token, function (isValidToken) {
        if (!isValidToken)
            res.clearCookie('token');
        callback(isValidToken);
    });
};

// 移动端非微信会员状态校验
var checkMobileMemberStatus = function (req, res, params, callback) {
    getMemberStatus(req.query.token, callback);
};

var processYiLianRedirectParams = function (req, res, oid, distribution) {
    var queryString = new _cb.webserver.utility.queryString(req.url);
    queryString.del('OpenID');
    queryString.del('bSubscribe');
    queryString.del('NickName');
    queryString.del('HeadImgUrl');
    queryString.del('Sex');
    queryString.del('cCountry');
    queryString.del('cProvince');
    queryString.del('cCity');
    queryString.del('oid');
    queryString.del('cLinkToken');
    var prefix = req.query.wid;
    //var prefix = _cb.webserver.utility.isArray(req.query.wid) ? req.query.wid[0] : req.query.wid;
    var queryCookieName = prefix + '_query';
    var queryCookie = req.cookies[queryCookieName];
    if (queryCookie) {
        res.clearCookie(queryCookieName);
        var query = JSON.parse(queryCookie);
        if (distribution) {
            var pid;
            for (var attr in query) {
                if (attr.toLocaleLowerCase().substr(0, 13) === 'shareparentid') {
                    pid = query[attr];
                    break;
                }
            }
            checkDistributor(req, res, prefix, oid, pid, function (result) {
                res.cookie(prefix + '_distribution', true, { httpOnly: true });
                if (result.code === 200) {
                    var shareparentid = result.data.share_parentid;
                    res.cookie(prefix + '_title', result.data.shop_name, { httpOnly: true });
                    queryString.set('shareparentid', shareparentid);
                }
                for (var attr in query) {
                    if (attr === 'wid' || attr === 'appid') continue;
                    queryString.set(attr, query[attr]);
                }
                res.redirect(queryString.href());
            });
        } else {
            for (var attr in query) {
                if (attr === 'wid' || attr === 'appid') continue;
                queryString.set(attr, query[attr]);
            }
            res.redirect(queryString.href());
        }
    } else {
        res.redirect(queryString.href());
    }
};

var checkDistribution = function (req, res, oid, callback) {
    var prefix = req.query.wid;
    //var prefix = _cb.webserver.utility.isArray(req.query.wid) ? req.query.wid[0] : req.query.wid;
    if (req.cookies[prefix + '_distribution']) {
        res.clearCookie(prefix + '_distribution');
        var title = req.cookies[prefix + '_title'];
        if (title) {
            res.clearCookie(prefix + '_title');
            callback(title);
            return;
        }
        callback();
        return;
    }
    var queryString = new _cb.webserver.utility.queryString(req.url);
    queryString.del('appid');
    var pid;
    var hasPid = queryString.has('shareparentid');
    if (hasPid) {
        pid = queryString.get('shareparentid');
    } else {
        for (var attr in req.query) {
            if (attr.toLocaleLowerCase().substr(0, 13) === 'shareparentid') {
                pid = req.query[attr];
                queryString.del(attr);
                break;
            }
        }
    }
    checkDistributor(req, res, prefix, oid, pid, function (result) {
        if (result.code === 200) {
            var shareparentid = result.data.share_parentid;
            var title = result.data.shop_name;
            if (hasPid && shareparentid === pid) {
                callback(title);
                return;
            }
            res.cookie(prefix + '_distribution', true, { httpOnly: true });
            res.cookie(prefix + '_title', title, { httpOnly: true });
            queryString.set('shareparentid', shareparentid);
            res.redirect(queryString.href());
        } else {
            if (hasPid) {
                callback();
                return;
            }
            res.cookie(prefix + '_distribution', true, { httpOnly: true });
            res.redirect(queryString.href());
        }
    });
};

var checkDistributor = function (req, res, wid, oid, pid, callback) {
    var appendParams = getAppendParams(req, res);
    if (!appendParams) return;
    appendParams.wid = wid;
    appendParams.oid = oid;
    if (pid)
        appendParams.pid = pid;
    var checkDistributorUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + '/client/Corprations/checkDistributor', appendParams);
    _cb.webserver.proxy.doRequestInner(checkDistributorUrl, 'GET', null, function (err, result) {
        log.logger.info(result, 'communication.checkDistributor');
        callback(result);
    });
};

// 移动端微信会员状态校验
var checkWechatMemberStatus = function (req, res, params, callback, distribution) {
    var prefix = req.query.wid;
    //var prefix = _cb.webserver.utility.isArray(req.query.wid) ? req.query.wid[0] : req.query.wid;
    if (req.cookies[prefix + '_mobile']) {
        res.clearCookie(prefix + '_mobile');
        if (distribution) {
            res.clearCookie(prefix + '_distribution');
            var title = req.cookies[prefix + '_title'];
            if (title) {
                res.clearCookie(prefix + '_title');
                params.title = title;
            }
        }
        checkMobileMemberStatus(req, res, params, callback);
        return;
    }
    var token = req.cookies[prefix + '_token'];
    getMemberStatus(token, function (isValidToken) {
        var oid = req.query.OpenID || req.query.oid;
        if (isValidToken) {
            var oidCookie = req.cookies[prefix + '_oid'];
            log.logger.info('oid: ' + oidCookie, 'communication.checkWechatMemberStatus');
            if (!oid) {
                if (distribution) {
                    checkDistribution(req, res, oidCookie, function (title) {
                        params.title = title;
                        callback(true);
                    });
                } else {
                    callback(true);
                }
            } else {
                processYiLianRedirectParams(req, res, oid, distribution);
            }
        } else {
            res.clearCookie(prefix + '_token');
            if (oid) {
                res.cookie(prefix + '_oid', oid, { maxAge: 30 * 24 * 60 * 60 * 1000 });
                log.logger.info(oid, 'communication.checkWechatMemberStatus');
                var appendParams = getAppendParams(req, res);
                if (!appendParams) return;
                appendParams.openid = oid;
                appendParams.token = req.query.cLinkToken;
                var autoLoginUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + '/client/ClientBaseMember/authenticate2', appendParams);
                _cb.webserver.proxy.doRequestInner(autoLoginUrl, 'GET', null, function (err, result) {
                    log.logger.info(result, 'communication.checkWechatMemberStatus');
                    if (result.code !== 200) {
                        res.cookie(prefix + '_mobile', true, { httpOnly: true });
                        processYiLianRedirectParams(req, res, oid, distribution);
                        return;
                    }
                    res.cookie(prefix + '_token', result.data.token);
                    processYiLianRedirectParams(req, res, oid, distribution);
                });
            } else {
                res.cookie(prefix + '_query', JSON.stringify(req.query), { httpOnly: true });
                var returnUrl = req.protocol + '://' + req.header('host') + req.url;
                //var returnUrl = req.protocol + '://' + req.header('host') + '?wid=' + prefix;
                log.logger.info(returnUrl, 'communication.checkWechatMemberStatus');
                res.redirect(conf.yilianServerUrl + '/open/mm/outlink/redirectwithfansinfo/v1?wid=' + prefix + '&returnurl=' + returnUrl);
                return;
                res.redirect(conf.yilianServerUrl + '/app/api.php/Partner/OutLinkAuth/redirectWithFansInfo?wid=' + prefix + '&returnurl=' + returnUrl);
            }
        }
    });
};

var getMemberStatus = function (token, callback) {
    if (!token) {
        callback(false);
        return;
    }
    var getMemberStatusUrl = conf.serviceBaseUrl + '/client/MemberLogin/getMemberStatus?token=' + token;
    _cb.webserver.proxy.doRequestInner(getMemberStatusUrl, 'GET', null, function (err, result) {
        if (result.code !== 200 || !result.data) {
            callback(false);
            return;
        }
        callback(true);
    });
};

var redirectLoginPage = function (req, res) {
    var queryString = new _cb.webserver.utility.queryString('/login');
    queryString.set('returnUrl', req.url);
    for (var attr in req.query)
        queryString.set(attr, req.query[attr]);
    res.redirect(queryString.href());
};

var isDebugMode = function (req) {
    if (req && req.query['debug'] === 'true')
        return true;
    return conf.isDebugMode;
};

var deviceDetection = function (req) {
    var device = { ios: false, android: false };
    var ua = req.headers['user-agent'];
    var android = ua.match(/(Android);?[\s\/]+([\d.]+)?/);
    var ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
    var ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
    var iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/);
    if (ipad || iphone || ipod)
        device.ios = true;
    if (android)
        device.android = true;
    return device;
};

var fromWechat = function (req) {
    //return true;
    return req && req.header('user-agent').match(/(MicroMessenger);?[\s\/]+([\d.]+)?/) && req.query.wid;
};
var beforeRender = function (func, req, res, params) {
    if (!_corpInfoDict) {
        setTimeout(func, 100, req, res, params);
        return false;
    }
    if (_corpInfoDict['ERROR']) {
        _cb.webserver.application.renderError(res, _corpInfoDict['ERROR']);
        return false;
    }
    return true;
};


var getSize = function (req, corpId) {
    var distribution;
    /*if (!corpId) {
        var corpInfo = getCorpInfo(req);
        if (corpInfo) {
            corpId = corpInfo.id;
            distribution = corpInfo.distribution;
        }
    }*/
    if (!isDebugMode(req)) {
        var corpTpl = getCorpTpl(req, corpId);
        if (!corpTpl || !corpTpl.templateAlias['M'])
            return { size: 'L' };
    }
    var mode;
    if (fromWechat(req) && !req.query.package && req.header('X-Requested-With') !== 'XMLHttpRequest')
        mode = 'wechat';
    var size = req.query['size'];
    if (size) {
        return size === 'M' ? { size: size, device: req.query['device'] || 'ios', mode: mode, distribution: distribution} : { size: 'L' };
    }
    var detection = deviceDetection(req);
    var device = detection.android ? 'android' : (detection.ios ? 'ios' : '');
    if (!device)
        return { size: 'L' };
    return { size: 'M', device: device, mode: mode, distribution: distribution };
};

var renderTemplate = function (req, res, params) {
    /*if (_corpInfoDict && _corpInfoDict['ERROR'])
        preprocess();*/
    renderTemplate1(req, res, params);
};

var renderTemplate1 = function (req, res, params) {
    //if (!beforeRender(renderTemplate1, req, res, params)) return;
    //if (checkCrawler(req, res)) return;
    checkMemberStatus(req, res, params, function () {
        renderTemplateCommon(req, res, params);
    });
};

var renderTemplateCommon = function (req, res, params) {
    var sizeParams = getSize(req);
    if (sizeParams.size === 'M' && !req.query.package && req.header('X-Requested-With') !== 'XMLHttpRequest')
        params.route = 'index';
    _cb.webserver.utility.extend(params, sizeParams);
    //isDebugMode(req) ? renderTemplateDebug(req, res, params) : renderTemplateRelease(req, res, params);
    renderTemplateRelease(req, res, params);
};

var renderTemplateRelease = function (req, res, params) {
    var urlPath = url.parse(req.url).path;
    log.logger.info('开始页面加载：' + urlPath, 'communication.renderTemplateRelease');
    //if (_corpInfoDict && _corpInfoDict['ERROR']) preloadCorps();
    renderTemplateReleaseInner(req, res, params);
};

var renderTemplateReleaseInner = function (req, res, params) {
    //if (!beforeRender(renderTemplateReleaseInner, req, res, params)) return;
    // preview或package模式，默认保持原样不压缩
    /*if (Boolean(req.query.preview)) {
        params.mode = 'preview';
        params.keepOrigin = true;
    }
    if (Boolean(req.query.package)) {
        params.mode = 'package';
        params.postProcessCSS = false;
        params.postProcessJS = false;
    }*/
    var message = '完成页面加载：' + url.parse(req.url).path;
    var source = 'communication.renderTemplateRelease';
    if (params.size === 'L' && (params.route === 'home' || params.route === 'list' || params.route === 'detail' || params.route === 'helpcenter')) {
        renderTemplateInnerWithSEO(req, res, params, _runner.readHtml, message, source);
        return;
    }
    if (params.size === 'M' && params.route === 'index') {
        renderTemplateInnerWithDIS(req, res, params, _runner.readHtml, message, source);
        return;
    }
    var callback = renderTemplateInner(req, res, params, message, source);
    _runner.readHtml(req, params, callback);
};
//最终返回页面
var renderTemplateInner = function (req, res, params, message, source) {
    //rebuildParams(req, res, params);

    res.writeHead(200, _cb.webserver.header['.html']);
    var callback = function (err, result) {
        err ? _cb.webserver.application.renderError(res, err) : res.end(result.html ? result.html : result);
        log.logger.info(message, source);
    };
    return callback;
};

var renderTemplateDebug = function (req, res, params) {
    var urlPath = url.parse(req.url).path;
    log.logger.info('开始页面生成：' + urlPath, 'communication.renderTemplateDebug');
    //preloadCorps();
    renderTemplateDebugInner(req, res, params);
};

var renderTemplateDebugInner = function (req, res, params) {
    //if (!beforeRender(renderTemplateDebugInner, req, res, params)) return;
    // debug模式默认从数据库读取配置信息
    if(params){
        params.corpId =  params.corpId || "system";
        params.templateId = params.templateId || "red";
        params.corp = params.corp || {};
        params.corp.theme = params.corp.theme || "red";
    }
    params.refreshConfig = true;
    /*if (Boolean(req.query.package))
        params.mode = 'package';*/
    var message = '完成页面生成：' + url.parse(req.url).path;
    var source = 'communication.renderTemplateDebug';
    if (params.size === 'L' && (params.route === 'home' || params.route === 'list' || params.route === 'detail' || params.route === 'helpcenter')) {
        renderTemplateInnerWithSEO(req, res, params, _runner.execTemplateEngine, message, source);
        return;
    }
    if (params.size === 'M' && params.route === 'index') {
        renderTemplateInnerWithDIS(req, res, params, _runner.execTemplateEngine, message, source);
        return;
    }
    var callback = renderTemplateInner(req, res, params, message, source);
    _runner.execTemplateEngine(req, params, callback);
};









var rebuildParams = function (req, res, params) {
    res.writeHead(200, _cb.webserver.header['.html']);
    /*var webDomain = req.headers['host'];
    var corpInfo = getCorpInfo(req, webDomain);
    if (!corpInfo) {
        _cb.webserver.application.renderError(res, webDomain + ': 没有找着公司信息');
        return;
    }
    var corpId = corpInfo.id;
    var corpTpl = getCorpTpl(req, corpId);
    var sizeParams = getSize(req, corpId);
    if (!corpTpl || !corpTpl.templateAlias[sizeParams['size']]) {
        _cb.webserver.application.renderError(res, webDomain + ': 没有找着公司模板信息');
        return;
    }
    var corpConf = getCorpConf(req, corpId);
    res.writeHead(200, _cb.webserver.header['.html']);
    params.corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf);*/
};


var renderTemplateInnerWithSEO = function (req, res, params, func, message, source) {
    rebuildParams(req, res, params);
    var asyncParams = {};
    asyncParams['html'] = function (asyncCallback) {
        func(req, params, asyncCallback);
    };
    asyncParams['seo'] = function (asyncCallback) {
        var getSEOUrl;
        switch (params.route) {
            case 'home':
                getSEOUrl = '/client/Products/getHomePageSEOInfo';
                break;
            case 'list':
                var classId = req.query['categoryid'];
                //getSEOUrl = classId ? ('/client/Products/getListPageSEOInfo?classId=' + classId) : '';
                getSEOUrl = '/client/Products/getListPageSEOInfo?classId=' + classId;
                break;
            case 'detail':
                var productId = req.query['goods_id'];
                getSEOUrl = productId ? ('/client/Products/getDetailPageSEOInfo?productId=' + productId) : '';
                break;
            case 'helpcenter':
                var articleId = req.query['articleId'];
                var typeId = req.query['typeId'];
                if (articleId) {
                    getSEOUrl = '/client/Articles/getArticleSeoMsg?id=' + articleId;
                } else if (typeId) {
                    getSEOUrl = '/client/ArticleTypes/getArticleTypeSeoMsg?typeId=' + typeId;
                } else {
                    getSEOUrl = '';
                }
                break;
            default:
                getSEOUrl = '';
                break;
        }
        if (!getSEOUrl) {
            asyncCallback(null, '');
            return;
        }
        //var appendParams = getAppendParams(req, res);
        //if (!appendParams) return;
        //var seoUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + getSEOUrl, appendParams);
        var seoUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + getSEOUrl);
        _cb.webserver.proxy.doRequestInner(seoUrl, 'GET', null, function (err, result) {
            var items = [];
            if (result.code === 200 && result.data) {
                items.push('<title>' + (result.data.title || '') + '</title>');
                for (var attr in result.data) {
                    if (attr.substr(0, 5) === 'meta_') {
                        items.push('<meta name="' + attr.substr(5) + '" content="' + result.data[attr] + '">');
                    }
                }
                if (result.data.nofollow)
                    items.push('<meta name="nofollow" content="nofollow">');
                if (result.data.noindex)
                    items.push('<meta name="noindex" content="noindex">');
            }
            asyncCallback(null, items.join('\r\n'));
        });
    };
    async.parallel(asyncParams, function (err, results) {
        debugger;
        err ? _cb.webserver.application.renderError(res, err) : res.end(results['html'].replace('<seo></seo>', results['seo']));
        log.logger.info(message, source);
    });
};

var renderTemplateInnerWithDIS = function (req, res, params, func, message, source) {
    rebuildParams(req, res, params);
    func(req, params, function (err, result) {
        if (err) {
            _cb.webserver.application.renderError(res, err);
        } else {
            var items = [];
            items.push('<title>');
            items.push(params.title ? params.title : params.corp.siteName);
            items.push('</title>');
            res.end(result.replace('<title></title>', items.join('')));
        }
        log.logger.info(message, source);
    });
};

var getAppendParams = function (req, res) {
    var webDomain = req.headers['host'];
    var corpInfo = getCorpInfo(req, webDomain);
    if (!corpInfo) {
        _cb.webserver.application.renderError(res, webDomain + ': 没有找着公司信息');
        return;
    }
    var appendParams = { corpid: corpInfo.id };
    return appendParams;
};

var redirectService = function (req, res, isBatch, callback) {
    //var appendParams = getAppendParams(req, res);
    var appendParams = "";
    //if (!appendParams) return;
    isBatch ? _cb.webserver.application.batchService(req, res, appendParams) : _cb.webserver.application.doService(req, res, appendParams, callback);
};

var payNotifyWechat = function (req, res, callback) {
    var bodyData = {};
    for (var key in req.body) {
        if (bodyData['data']) break;
        bodyData['data'] = key;
    }
    var webDomain = req.header('host');
    var corpInfo = getCorpInfo(req, webDomain);
    if (!corpInfo) {
        xml2js.parseString(bodyData['data'], { explicitArray: false }, function (err, result) {
            if (result && result.xml && result.xml.attach) {
                var wid = result.xml.attach.trim().toLocaleLowerCase();
                corpInfo = _corpInfoDict[_corpWechatMap[wid]];
                if (!corpInfo && wid === _defaultWid)
                    corpInfo = _corpInfo;
                if (corpInfo) {
                    var appendParams = { corpid: corpInfo.id };
                    var payNotifyUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + '/client/Pay/payNotify?paytypecode=weixin', appendParams);
                    _cb.webserver.proxy.doRequestInner(payNotifyUrl, 'POST', bodyData, callback);
                }
            }
        });
    } else {
        var appendParams = { corpid: corpInfo.id };
        var payNotifyUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + '/client/Pay/payNotify?paytypecode=weixin', appendParams);
        _cb.webserver.proxy.doRequestInner(payNotifyUrl, 'POST', bodyData, callback);
    }
};

var payBackWechat = function (req, res, callback) {
    var appendParams = getAppendParams(req, res);
    if (!appendParams) return;
    _cb.webserver.utility.extend(appendParams, req.query);
    var payBackUrl = _cb.webserver.application.getServiceUrl(conf.serviceBaseUrl + '/client/Pay/payBack?paytypecode=weixin', appendParams);
    _cb.webserver.proxy.doRequestInner(payBackUrl, 'GET', null, callback);
};

var doMultiparty = function (req, res) {
    var appendParams = getAppendParams(req, res);
    if (!appendParams) return;
    _cb.webserver.application.doMultiparty(req, res, appendParams);
};

var getDebugModeCorpAlias = function () {
    return { alias: 'system' };
};

var getDebugModeTemplateAlias = function (corpTpl, req) {
    var dbgCorpTpl = { templateAlias: {} };
    var reqCorpTpl = req && req.query['template'] || conf.debugTemplateAlias;
    dbgCorpTpl.templateAlias['L'] = reqCorpTpl || corpTpl.templateAlias['L'] || '';
    dbgCorpTpl.templateAlias['M'] = reqCorpTpl || corpTpl.templateAlias['M'] || '';
    return dbgCorpTpl;
};

var getCorpInfo = function (req, webDomain) {
    if (_isPrivateCloud)
        return getCorpInfoInner(req, _corpInfo);
    var host = (webDomain || req.header('host')).trim().toLocaleLowerCase();
    if ((host === conf.demoWebDomain || host === 'localhost:' + conf.currentPort) && req && req.query.corpalias) {
        var corpAlias = req.query.corpalias.trim().toLocaleLowerCase();
        var corpInfo = _corpInfoDict[_corpAliasMap[corpAlias]];
        if (!corpInfo && corpAlias === 'system')
            corpInfo = _corpInfo;
        return getCorpInfoInner(req, corpInfo);
    }
    if (fromWechat(req)) {
        //var prefix = _cb.webserver.utility.isArray(req.query.wid) ? req.query.wid[0] : req.query.wid;
        var wid = req.query.wid.trim().toLocaleLowerCase();
        var corpInfo = _corpInfoDict[_corpWechatMap[wid]];
        if (!corpInfo && wid === _defaultWid)
            corpInfo = _corpInfo;
        return getCorpInfoInner(req, corpInfo);
    }
    var corpInfo = _corpInfoDict[_corpDomainMap[host]];
    if (!corpInfo && req && req.query.preview && req.query.corpalias) {
        var corpAlias = req.query.corpalias.trim().toLocaleLowerCase();
        var corpInfo = _corpInfoDict[_corpAliasMap[corpAlias]];
        if (!corpInfo && corpAlias === 'system')
            corpInfo = _corpInfo;
        return getCorpInfoInner(req, corpInfo);
    }
    if (!corpInfo && _possibleHost[host])
        corpInfo = _corpInfo;
    return getCorpInfoInner(req, corpInfo);
};

var getCorpInfoInner = function (req, corpInfo) {
    if (!corpInfo) return;
    if (isDebugMode(req))
        return _cb.webserver.utility.extend(true, {}, corpInfo, getDebugModeCorpAlias());
    return corpInfo;
};

var getCorpTpl = function (req, corpId) {
    if (!corpId) return;
    var corpTpl = _corpTplDict[corpId];
    if (!corpTpl) return;
    if (isDebugMode(req))
        return getDebugModeTemplateAlias(corpTpl, req);
    return corpTpl;
};

var getCorpConf = function (req, corpId) {
    if (!corpId) return;
    return _corpConfDict[corpId];
};

var execute = function (req, res) {
    var type = req.query['type'];
    switch (type) {
        case 'downloadTemplate':
            downloadTemplate(req, res);
            return;
        case 'enableTemplate':
            enableTemplate(req, res);
            return;
        case 'savePageConfig':
            savePageConfig(req, res);
            return;
        case 'previewPage':
            previewPage(req, res);
            return;
        case 'saveCorpInfo':
            saveCorpInfo(req, res);
            return;
        case 'saveCorpConf':
            saveCorpConf(req, res);
            return;
    }
    preprocess();
    executeInner(req, res);
};

var executeInner = function (req, res) {
    if (!beforeRender(executeInner, req, res)) return;
    var type = req.query['type'];
    var para = req.headers['para'];
    switch (type) {
        case 'template':
            processTemplate(req, res, para);
            return;
    }
    var corpInfo = getCorpInfo(req);
    if (!corpInfo) {
        _cb.webserver.application.renderError(res, '没有找着公司信息');
        return;
    }
    var corpId = corpInfo.id;
    var corpTpl = getCorpTpl(req, corpId);
    if (!corpTpl) {
        _cb.webserver.application.renderError(res, '没有找着公司模板信息');
        return;
    }
    var corpConf = getCorpConf(req, corpId);
    var jsonp = req.query.callback;
    var corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf);
    if (!jsonp)
        res.writeHead(200, _cb.webserver.header['.html']);
    var sizeParams = getSize(req, corpId);
    var mode = req.query['mode'];
    if (mode === 'batch') {
        _cb.webserver.application.renderText(res, '全部页面生成成功');
        _runner.executeTemplate(req, _cb.webserver.utility.extend({ corp: corp }, sizeParams), function () { }, function (err, result) {
            if (err) {
                if (!jsonp) {
                    _cb.webserver.application.renderError(res, err);
                } else {
                    var result = { code: 500, message: err.message };
                    _cb.webserver.application.renderJsonp(res, jsonp, result);
                }
            } else {
                if (!jsonp) {
                    _cb.webserver.application.renderText(res, '全部页面生成成功');
                } else {
                    var result = { code: 200, message: '全部页面生成成功' };
                    _cb.webserver.application.renderJsonp(res, jsonp, result);
                }
            }
        });
    } else {
        var route = req.query['route'];
        if (!route) {
            _cb.webserver.application.renderText(res, '没有页面需要生成');
        } else {
            _runner.executeTemplate(req, _cb.webserver.utility.extend({ route: route, corp: corp }, sizeParams), function (err, result) {
                if (err) {
                    if (!jsonp) {
                        _cb.webserver.application.renderError(res, err);
                    } else {
                        var result = { code: 500, message: err.message };
                        _cb.webserver.application.renderJsonp(res, jsonp, result);
                    }
                } else {
                    if (!jsonp) {
                        _cb.webserver.application.renderText(res, route + '页面生成成功');
                    } else {
                        var result = { code: 200, message: route + '页面生成成功' };
                        _cb.webserver.application.renderJsonp(res, jsonp, result);
                    }
                }
            });
        }
    }
};

var processTemplate = function (req, res, para) {
    res.writeHead(200, _cb.webserver.header['.html']);
    var reqParam;
    var tplParam;
    if (para) {
        reqParam = JSON.parse(para);
    } else {
        var sizeParams = getSize(req);
        if (_isPrivateCloud) {
            reqParam = { corpAlias: _corpInfo.alias };
        } else {
            reqParam = [];
            tplParam = [];
            var corpId = req.query['corpid'];
            var items = corpId && corpId.split('|');
            for (var attr in _needPatchCorps) {
                var corpTpl = _corpTplDict[attr];
                var templateAlias = corpTpl && corpTpl.templateAlias[sizeParams['size']];
                if (!templateAlias) continue;
                var corpInfo = _corpInfoDict[attr];
                var corpConf = _corpConfDict[attr];
                if (items) {
                    if (items.indexOf(corpInfo.id.toLocaleString()) !== -1) {
                        reqParam.push({ corpAlias: corpInfo.alias, templateAlias: templateAlias });
                        var corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf);
                        tplParam.push(_cb.webserver.utility.extend({ corp: corp }, sizeParams));
                    }
                } else {
                    reqParam.push({ corpAlias: corpInfo.alias, templateAlias: templateAlias });
                    var corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf);
                    tplParam.push(_cb.webserver.utility.extend({ corp: corp }, sizeParams));
                }
            }
        }
    }
    if (_cb.webserver.utility.isArray(reqParam) && !reqParam.length) {
        _cb.webserver.application.renderText(res, '没有模板需要复制&编译');
        return;
    }
    _runner.processTemplate(reqParam, function (err, result) {
        if (err) {
            _cb.webserver.application.renderError(res, err);
            return;
        }
        _cb.webserver.application.renderText(res, '模板复制&编译成功');
        _runner.executeTemplate(req, tplParam, function () { }, function (err1, result1) {
            err1 ? _cb.webserver.application.renderError(res, err1) : _cb.webserver.application.renderText(res, '模板复制&编译成功');
        });
    });
};

var mobilePackage = function (webDomain, version, callback) {
    log.logger.info(webDomain + ': 移动打包开始', 'mobilePackage');
    var corpInfo = getCorpInfo(null, webDomain);
    if (!corpInfo) {
        log.logger.info(webDomain + ': 移动打包域名无效', 'mobilePackage');
        if (callback)
            callback();
        return;
    }
    var corpId = corpInfo.id;
    var corpTpl = getCorpTpl(null, corpId);
    var templateAlias = corpTpl && corpTpl.templateAlias['M'];
    if (!templateAlias) {
        log.logger.info(webDomain + ': 移动打包模板无效', 'mobilePackage');
        if (callback)
            callback();
        return;
    }
    var corpConf = getCorpConf(null, corpId);
    var reqParam = { corpAlias: corpInfo.alias, templateAlias: templateAlias };
    // package模式，默认保持原样不压缩
    var tplParam = { corp: _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf), size: 'M', mode: 'package', webDomain: webDomain, version: version };
    _runner.processTemplate(reqParam, function (err, result) {
        if (err) {
            log.logger.error(err.message, 'mobilePackage');
            if (callback)
                callback(err);
            return;
        }
        _runner.executeTemplate(null, tplParam, function (err1, result1) {
            if (err1) {
                log.logger.error(err1.message, 'mobilePackage');
                if (callback)
                    callback(err1);
            } else {
                log.logger.info(webDomain + ': 移动打包成功', 'mobilePackage');
                if (callback)
                    callback();
            }
        });
    });
};

var batchMobilePackage = function () {
    if (!_packageConfig) return;
    var needPackageCorps = [];
    for (var webDomain in _packageConfig)
        needPackageCorps.push(_cb.webserver.utility.extend(true, {}, { webDomain: webDomain }, _packageConfig[webDomain]));
    var asyncParams = [];
    needPackageCorps.forEach(function (packageCorp) {
        if (!packageCorp.package) return;
        asyncParams.push(function (asyncCallback) {
            mobilePackage(packageCorp.webDomain, packageCorp.version, asyncCallback);
        });
    });
    async.series(asyncParams);
};

var checkPackageUpdate = function (req, res) {
    var host = req.header('host').toLocaleLowerCase();
    var package = _packageConfig && _packageConfig[host];
    if (package && package.version !== req.query.version) {
        var appUrl = req.protocol + '://' + host + '/package/' + package.name + (req.query.osName == 'Android' ? '.apk' : '.ipa');
        _cb.webserver.application.renderJson(res, { code: 200, data: {
            isUpdate: true,
            updateUrl: appUrl
        }
        });
    } else {
        _cb.webserver.application.renderJson(res, { code: 200, data: { isUpdate: false} });
    }
};

var processTemplateInner = function (isDefault) {
    log.logger.info('模板复制&编译开始', 'processTemplateInner');
    var reqParam = [];
    var tplParam = [];
    if (isDefault) {
        constructPatchParams(_corpInfo, _corpTpl, _corpConf, reqParam, tplParam);
    } else {
        for (var attr in _needPatchCorps) {
            constructPatchParams(_corpInfoDict[attr], _corpTplDict[attr], _corpConfDict[attr], reqParam, tplParam);
        }
    }
    if (_cb.webserver.utility.isArray(reqParam) && !reqParam.length) {
        log.logger.info('没有模板需要复制&编译', 'processTemplateInner');
        return;
    }
    _runner.processTemplate(reqParam, function (err, result) {
        if (err) {
            log.logger.error(err.message, 'processTemplateInner');
            return;
        }
        _runner.executeTemplate(null, tplParam, function (err1, result1) {
            if (err1) {
                log.logger.error(err1.message, 'processTemplateInner');
            } else {
                log.logger.info('模板复制&编译成功', 'processTemplateInner');
            }
        });
    });
};

var constructPatchParams = function (corpInfo, corpTpl, corpConf, reqParam, tplParam) {
    if (!corpTpl) return;
    var corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf);
    var templateAliasObj = {};
    var templateAliasArray = [];
    for (var attr in corpTpl.templateAlias) {
        var templateAlias = corpTpl.templateAlias[attr];
        if (!templateAliasObj[templateAlias]) {
            templateAliasObj[templateAlias] = true;
            templateAliasArray.push(templateAlias);
        }
        tplParam.push({ corp: corp, size: attr, refreshConfig: true });
    }
    reqParam.push({ corpAlias: corpInfo.alias, templateAlias: templateAliasArray });
};

var downloadTemplate = function (req, res) {
    var params = req.body;
    var corpInfo = getCorpInfoInner(null, _corpInfoDict[params.corpid]);
    if (!corpInfo) {
        _cb.webserver.application.renderJson(res, { code: '500', message: '没有找着公司信息' });
        return;
    }
    if (!params.templateAlias) {
        _cb.webserver.application.renderJson(res, { code: '500', message: '没有找着公司模板信息' });
        return;
    }
    var templateAlias;
    if (_cb.webserver.utility.isArray(params.templateAlias)) {
        templateAlias = [];
        var templateAliasObj = {};
        params.templateAlias.forEach(function (item) {
            if (templateAliasObj[item]) return;
            templateAliasObj[item] = true;
            templateAlias.push(item);
        });
    } else {
        templateAlias = params.templateAlias;
    }
    _runner.processTemplate({ corpAlias: corpInfo.alias, templateAlias: templateAlias }, function (err) {
        if (!params.used) {
            var result = err ? { code: '500', message: err.message} : { code: '200', message: '模板下载成功' };
            _cb.webserver.application.renderJson(res, result);
        } else {
            var result = err ? { code: '500', message: err.message} : { code: '200', message: '模板下载&启用成功' };
            _cb.webserver.application.renderJson(res, result);
            enableTemplateInner(req, res, corpInfo, params.used, function () { }, function (err) {
                var result = err ? { code: '500', message: err.message} : { code: '200', message: '模板下载&启用成功' };
                _cb.webserver.application.renderJson(res, result);
            });
        }
    });
};

var enableTemplate = function (req, res) {
    var params = req.body;
    var corpInfo = getCorpInfoInner(null, _corpInfoDict[params.corpid]);
    if (!corpInfo) {
        _cb.webserver.application.renderJson(res, { code: '500', message: '没有找着公司信息' });
        return;
    }
    var result = { code: '200', message: '模板启用成功' };
    _cb.webserver.application.renderJson(res, result);
    enableTemplateInner(req, res, corpInfo, params.used, function () { }, function (err) {
        var result = err ? { code: '500', message: err.message} : { code: '200', message: '模板启用成功' };
        _cb.webserver.application.renderJson(res, result);
    });
};

var enableTemplateInner = function (req, res, corpInfo, templateAlias, callback) {
    var logInfo;
    try {
        logInfo = JSON.stringify(templateAlias);
    } catch (e) {
        logInfo = templateAlias;
    }
    log.logger.info('模板启用输入的templateAlias: ' + logInfo, 'communication.enableTemplateInner');
    var corpId = corpInfo.id;
    var corpTpl = getCorpTpl(null, corpId) || { templateAlias: {} };
    for (var attr in templateAlias) {
        corpTpl.templateAlias[attr] = templateAlias[attr];
    }
    rebuildCorpTpl(corpId, corpTpl);
    logInfo = JSON.stringify(corpTpl.templateAlias);
    log.logger.info('模板启用输出的templateAlias: ' + logInfo, 'communication.enableTemplateInner');
    var corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, _corpConfDict[corpId]);
    var tplParam = [];
    for (var attr in templateAlias) {
        tplParam.push({ corp: corp, size: attr });
    }
    _runner.executeTemplate(req, tplParam, callback);
};

var savePageConfig = function (req, res) {
    compilePage(req, res, false, function (err) {
        var result = err ? { code: '500', message: err.message} : { code: '200', message: '页面配置保存&编译成功' };
        _cb.webserver.application.renderJson(res, result);
    });
};

var previewPage = function (req, res) {
    compilePage(req, res, true, function (err) {
        var result = err ? { code: '500', message: err.message} : { code: '200', message: '预览页面生成成功' };
        _cb.webserver.application.renderJson(res, result);
    });
};

var compilePage = function (req, res, preview, callback) {
    var params = req.body;
    var corpInfo = getCorpInfoInner(null, _corpInfoDict[params.corpid]);
    if (!corpInfo) {
        _cb.webserver.application.renderJson(res, { code: '500', message: '没有找着公司信息' });
        return;
    }
    var corpId = corpInfo.id;
    var corpTpl = getCorpTpl(null, corpId);
    if (!corpTpl) {
        _cb.webserver.application.renderJson(res, { code: '500', message: '没有找着公司模板信息' });
        return;
    }
    var corpConf = getCorpConf(null, corpId);
    var route = req.query['route'] || 'home';
    var subroute = req.query['subroute'];
    var corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf);
    var paras = { route: route, corp: corp, size: getSize(req, corpId).size, para: req.body };
    if (subroute)
        paras.subroute = subroute;
    if (preview) {
        paras.mode = 'preview';
        paras.keepOrigin = true;
        paras.overrideConfig = false;
    }
    _runner.execTemplateEngine(req, paras, callback);
};

var saveCorpInfo = function (req, res) {
    var item = req.body.corpration;
    if (!item || !item.id || !item.cAlias) {
        var result = { code: '200' };
        _cb.webserver.application.renderJson(res, result);
        return;
    }
    var corpId = item.id;
    var mode = req.body.mode;
    if (mode === 'domain') {
        modifyWebDomain(corpId, item, res);
        return;
    }
    if (mode === 'wid') {
        modifyWids(corpId, item, res);
        return;
    }
    rebuildCorpInfo(corpId, item);
    if (mode === 'init') {
        var result = { code: '200' };
        _cb.webserver.application.renderJson(res, result);
        return;
    }
    if (mode === 'distribution') {
        modifyDistribution(corpId, req, res);
        return;
    }
    var corpTpl = _corpTplDict[corpId];
    if (corpTpl) {
        var corp = _cb.webserver.utility.extend(true, {}, _corpInfoDict[corpId], corpTpl, _corpConfDict[corpId]);
        var tplParam = [];
        for (var attr in corpTpl.templateAlias) {
            var tplItem = { corp: corp, size: attr, postProcessCSS: false, postProcessJS: false };
            if (mode === 'theme')
                tplItem.postProcessCSS = true;
            tplParam.push(tplItem);
        }
        var result = { code: '200', message: '模板编译成功' };
        _cb.webserver.application.renderJson(res, result);
        _runner.executeTemplate(req, tplParam, function () { }, function (err) {
            var result = err ? { code: '500', message: err.message} : { code: '200', message: '模板编译成功' };
            _cb.webserver.application.renderJson(res, result);
        });
    } else {
        var result = { code: '200' };
        _cb.webserver.application.renderJson(res, result);
    }
};

var modifyWebDomain = function (corpId, item, res) {
    var corpInfo = _corpInfoDict[corpId];
    var oldWebDomain = corpInfo && corpInfo.webDomain && corpInfo.webDomain.trim().toLocaleLowerCase();
    if (oldWebDomain) {
        delete _corpDomainMap[oldWebDomain];
        if (oldWebDomain.substr(0, 4) === 'www.')
            delete _corpDomainMap[oldWebDomain.substr(4)];
    }
    rebuildCorpInfo(corpId, item);
    var webDomain = item.cWebDomain && item.cWebDomain.trim().toLocaleLowerCase();
    if (webDomain) {
        _corpDomainMap[webDomain] = corpId;
        if (webDomain.substr(0, 4) === 'www.')
            _corpDomainMap[webDomain.substr(4)] = corpId;
    }
    var result = { code: '200' };
    _cb.webserver.application.renderJson(res, result);
};

var modifyWids = function (corpId, item, res) {
    var corpInfo = _corpInfoDict[corpId];
    var oldWids = corpInfo && corpInfo.wids;
    if (_cb.webserver.utility.isArray(oldWids) && oldWids.length) {
        oldWids.forEach(function (wid) {
            if (!wid) return;
            delete _corpWechatMap[wid.trim().toLocaleLowerCase()];
        });
    }
    rebuildCorpInfo(corpId, item);
    var wids = item.wids;
    if (_cb.webserver.utility.isArray(wids) && wids.length) {
        wids.forEach(function (wid) {
            if (!wid) return;
            _corpWechatMap[wid.trim().toLocaleLowerCase()] = corpId;
        });
    }
    var result = { code: '200' };
    _cb.webserver.application.renderJson(res, result);
};

var modifyDistribution = function (corpId, req, res) {
    var corpTpl = _corpTplDict[corpId];
    if (corpTpl) {
        var corp = _cb.webserver.utility.extend(true, {}, _corpInfoDict[corpId], corpTpl, _corpConfDict[corpId]);
        _runner.executeTemplate(req, { size: 'M', mode: 'wechat', route: 'index', corp: corp }, function (err) {
            var result = err ? { code: '500', message: err.message} : { code: '200', message: '模板编译成功' };
            _cb.webserver.application.renderJson(res, result);
        });
    } else {
        var result = { code: '200' };
        _cb.webserver.application.renderJson(res, result);
    }
};

var saveCorpConf = function (req, res) {
    if (!req.body || !req.body.iCorpId) {
        var result = { code: '200' };
        _cb.webserver.application.renderJson(res, result);
        return;
    }
    var corpId = req.body.iCorpId;
    rebuildCorpConf(corpId, { storeSetting: req.body });
    var corpTpl = _corpTplDict[corpId];
    if (corpTpl) {
        var corp = _cb.webserver.utility.extend(true, {}, _corpInfoDict[corpId], corpTpl, _corpConfDict[corpId]);
        var sizeParams = getSize(req, corpId);
        _runner.executeTemplate(req, _cb.webserver.utility.extend({ route: 'list|detail', corp: corp }, sizeParams), function (err) {
            var result = err ? { code: '500', message: err.message} : { code: '200', message: '模板编译成功' };
            _cb.webserver.application.renderJson(res, result);
        });
    } else {
        var result = { code: '200' };
        _cb.webserver.application.renderJson(res, result);
    }
};

var getTemplate = function (req, res) {
    var corpInfo = getCorpInfo(req);
    var corpId = corpInfo && corpInfo.id;
    var corpTpl = getCorpTpl(req, corpId);
    var corpConf = getCorpConf(req, corpId);
    var sizeParams = getSize(req, corpId);
    var route = req.query.route || 'home';
    var version = req.query.version;
    // designer模式，默认保持原样不压缩，并从数据库读取配置信息
    var params = { route: route, version: version, mode: 'designer', keepOrigin: true, refreshConfig: true, overrideConfig: false };
    _cb.webserver.utility.extend(params, sizeParams);
    params.corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf);
    var callback = function (err, result) {
        var jsonObj = err ? _cb.webserver.utility.extend({ code: 500 }, err) : { code: 200, data: result };
        _cb.webserver.application.renderJson(res, jsonObj);
    };
    _runner.execTemplateEngine(req, params, callback);
};

var getWidgetHtml = function (req, res) {
    var corpInfo = getCorpInfo(req);
    var corpId = corpInfo && corpInfo.id;
    var corpTpl = getCorpTpl(req, corpId);
    var corpConf = getCorpConf(req, corpId);
    var sizeParams = getSize(req, corpId);
    var params = {};
    _cb.webserver.utility.extend(params, sizeParams);
    params.corp = _cb.webserver.utility.extend(true, {}, corpInfo, corpTpl, corpConf);
    var callback = function (err, result) {
        var jsonObj = err ? _cb.webserver.utility.extend({ code: 500 }, err) : { code: 200, data: result };
        _cb.webserver.application.renderJson(res, jsonObj);
    };
    _runner.getWidgetHtml(params, callback);
};

module.exports = {
    renderMemberTemplate: renderMemberTemplate,
    renderTemplate: renderTemplate,
    redirectService: redirectService,
    payNotifyWechat: payNotifyWechat,
    payBackWechat: payBackWechat,
    doMultiparty: doMultiparty,
    execute: execute,
    getTemplate: getTemplate,
    getWidgetHtml: getWidgetHtml,
    checkPackageUpdate: checkPackageUpdate
};