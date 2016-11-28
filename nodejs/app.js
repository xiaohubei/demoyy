var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var rootPath = require('./common/conf').rootPath;
//console.log('__dirname: ' + __dirname);
//console.log('rootPath: ' + rootPath);

var routes = require('./routes/index');
//var users = require('./routes/users');

var app = express();
require('./logger/log').use(app);

app.use('/client/Pay/payNotify', function (req, res, next) {
    if (req.header('content-type') !== 'application/x-www-form-urlencoded;charset=utf-8')
        req.headers['content-type'] = 'application/x-www-form-urlencoded;charset=utf-8';
    next();
});

app.use('/client/Pay/payNotifyWechat', function (req, res, next) {
    req.headers['content-type'] = 'application/x-www-form-urlencoded;charset=utf-8';
    next();
});

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//var iconPath = path.resolve(rootPath, 'img', 'logo.ico');
//app.use(favicon(iconPath));
//app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(express.static(path.dirname(__dirname)));

//app.use('/', routes);
//app.use('/users', users);
app.use(routes);
app.use(express.static(rootPath));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.end("error:" + err.message);
        /*res.render('error', {
        message: err.message,
        error: err
        });*/
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.end("error:" + err.message);
    /*res.render('error', {
    message: err.message,
    error: err
    });*/
});


module.exports = app;
