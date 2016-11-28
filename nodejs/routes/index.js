var url = require('url');
var express = require('express');
var router = express.Router();
var conf = require('../common/conf');
var log = require('../logger/log');
var cb = require('../common/cube');
var communication = require('./communication');
var urlencoded = require('body-parser').urlencoded({ extended: false });

router.get('/client/getWebServerConfig', function (req, res) {
    cb.webserver.application.getWebServerConfig(req, res);
});

router.get('/client/checkPackageUpdate', function (req, res) {
    communication.checkPackageUpdate(req, res);
});

router.post('/client/batchSubmit', function (req, res) {
    communication.redirectService(req, res, true);
});

router.all('/client/Pay/payNotify', urlencoded, function (req, res) {
    var bodyData = JSON.stringify(req.body);
    log.logger.info('请求数据：' + bodyData, '/client/Pay/payNotify');
    communication.redirectService(req, res, false, function (err, result) {
        if (result.code === 200 && result.data) {
            log.logger.info('返回数据：' + bodyData + '\t' + result.data, '/client/Pay/payNotify');
            res.end(result.data);
        }
    });
});

router.all('/client/Pay/payBack', urlencoded, function (req, res) {
    communication.redirectService(req, res, false, function (err, result) {
        if (result.code === 200 && result.data)
            res.redirect(result.data);
    });
});

router.all('/client/Pay/payNotifyWechat', urlencoded, function (req, res) {
    log.logger.info('请求地址：' + req.url, '/client/Pay/payNotifyWechat');
    var bodyData = JSON.stringify(req.body);
    log.logger.info('请求数据：' + bodyData, '/client/Pay/payNotifyWechat');
    communication.payNotifyWechat(req, res, function (err, result) {
        if (result.code === 200 && result.data) {
            log.logger.info('返回数据：' + bodyData + '\t' + result.data, '/client/Pay/payNotifyWechat');
            res.end(result.data);
        }
    });
});

router.get('/client/Pay/loopVirtualRequest', function (req, res) {
    communication.payBackWechat(req, res, function (err, result) {
        cb.webserver.application.renderJson(res, result);
    });
});

// 微信上传
router.post('/client/FileUpload/uploadWx', function (req, res) {
    communication.redirectService(req, res);
});

// 微信上传头像到易联
router.post('/client/FileUpload/uploadAvatarWx', function (req, res) {
    communication.redirectService(req, res);
});

router.post('/client/FileUpload/*', function (req, res) {
    communication.doMultiparty(req, res);
});

router.post('/FileUpload/uploadeditor', function (req, res) {
    communication.doMultiparty(req, res);
});

router.all('/communication', function (req, res) {
    communication.execute(req, res);
});

router.get('/templatedesigner', function (req, res) {
    var queryString = new cb.webserver.utility.queryString(req.url);
    if (queryString.has('token')) {
        res.cookie('YONYOUUP_SESSION', queryString.get('token'), {
            encode: function (val) {
                return val;
            },
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        queryString.del('token');
        res.redirect(queryString.href());
        return;
    }
    var urlPath = '/templatedesigner/index.html';
    cb.webserver.application.render(res, urlPath);
});

router.get('/client/getTemplate', function (req, res) {
    debugger;
    communication.getTemplate(req, res);
});

router.get('/client/getWidgetHtml', function (req, res) {
    communication.getWidgetHtml(req, res);
});

router.get('/', function (req, res) {
    debugger;
    communication.renderTemplate(req, res, { route: 'home' });
});

router.get('/cart', function (req, res) {
    communication.renderMemberTemplate(req, res, { route: 'cart' });
});

router.get('/member', function (req, res) {
    communication.renderMemberTemplate(req, res, { route: 'member', subroute: 'index' });
});

router.get('/member/:subroute', function (req, res) {
    var subroute = req.params['subroute'];
    communication.renderMemberTemplate(req, res, { route: 'member', subroute: subroute });
});
router.get('/helpcenter', function (req, res) {
    communication.renderTemplate(req, res, { route: 'helpcenter', subroute: 'index' });
});

router.get('/helpcenter/:subroute', function (req, res) {
    var subroute = req.params['subroute'];
    communication.renderTemplate(req, res, { route: 'helpcenter', subroute: subroute });
});

router.get('/channel/:subroute', function (req, res) {
    var subroute = req.params['subroute'];
    communication.renderTemplate(req, res, { route: 'channel', subroute: subroute });
});

router.get('/:route', function (req, res) {
    debugger;
    var route = req.params['route'];
    communication.renderTemplate(req, res, { route: route });
});

router.all('/photo/*', function (req, res) {
    var uri = url.parse(req.url);
    var urlPath = uri && uri.pathname;
    if (!urlPath) return;
    cb.webserver.application.renderFromPlay(req, res, urlPath);
});
router.all('/attachments/*', function (req, res) {
    var uri = url.parse(req.url);
    var urlPath = uri && uri.pathname;
    if (!urlPath) return;
    cb.webserver.application.renderFromPlay(req, res, urlPath);
});

router.all('/client/ClientBaseMember/captcha', function (req, res) {
    var uri = url.parse(req.url);
    var urlPath = uri && uri.pathname;
    if (!urlPath) return;
    cb.webserver.application.renderFromPlay(req, res, urlPath);
});

// 暂时直接读取易联服务开发分销功能
router.all('/app/shop.php/Shop/Distributor/*', function (req, res) {
    cb.webserver.application.redirectServiceToYILIAN(req, res);
});

router.all('*', function (req, res, next) {
    var contentType = req.header('content-type');
    var isService = contentType && contentType.indexOf('application/json') !== -1;
    if (isService) {
        communication.redirectService(req, res);
        return;
    }
    next();
    return;
    var uri = url.parse(req.url);
    var urlPath = uri && uri.pathname;
    if (!urlPath) return;
    cb.webserver.application.render(res, urlPath);
});

module.exports = router;