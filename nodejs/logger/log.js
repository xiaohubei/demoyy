var fs = require('fs');
var path = require('path');
var log4js = require('log4js');
var conf = require('../common/conf');

fs.existsSync('logs') || fs.mkdirSync('logs');
if (conf.isDebugMode) {
    log4js.configure(path.resolve(__dirname, 'debug.json'));
} else if (conf.needPatch) {
    log4js.configure(path.resolve(__dirname, 'patch.json'));
} else {
    log4js.configure(path.resolve(__dirname, 'default.json'));
}
var DEFAULT_FORMAT = ':remote-addr - -' +
  ' ":method :url HTTP/:http-version"' +
  ' :status :response-timems ":referrer"' +
  ' ":user-agent"';
var logger = log4js.getLogger('upmall');
logger.setLevel('INFO');
exports.logger = logger;
exports.use = function (app) {
    app.use(log4js.connectLogger(logger, { level: 'auto', format: DEFAULT_FORMAT }));
}