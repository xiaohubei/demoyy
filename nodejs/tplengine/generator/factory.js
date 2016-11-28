var generator = require('./common');
require('./basepage');
require('./commonpage');
require('./homepage');
require('./homepagemobile');
require('./homepagemobiledesign');
require('./memberpage');
require('./helppage');
require('./channelpage');
require('./partpage');
require('./otherpage');
require('./indexpage');

var pageGeneratorDict = {
    'CommonPage': [],
    'HomePage': [],
    'HomePageMobile': [],
    'HomePageMobileDesign': [],
    'MemberPage': [],
    'HelpPage': [],
    'ChannelPage': [],
    'PartPage': [],
    'OtherPage': [],
    'IndexPage': []
};

var getPageGenerator = function (req, params, callback) {
    var pageName;
    switch (params.route) {
        case 'header':
        case 'footer':
            pageName = 'CommonPage';
            break;
        case 'home':
            pageName = params.size === 'M' ? (params.mode === 'designer' ? 'HomePageMobileDesign' : 'HomePageMobile') : 'HomePage';
            break;
        case 'list':
            if (params.size === 'M') {
                pageName = 'OtherPage';
            } else {
                pageName = 'PartPage';
                params.fixed = ['content'];
            }
            break;
        case 'detail':
            if (params.size === 'M') {
                pageName = 'OtherPage';
            } else {
                pageName = 'PartPage';
                params.fixed = ['abstract', 'content'];
            }
            break;
        case 'index':
            pageName = 'IndexPage';
            break;
        case 'member':
            pageName = 'MemberPage';
            params.level = params.size === 'M' ? 0 : 1;
            break;
        case 'helpcenter':
            pageName = 'HelpPage';
            params.level = params.size === 'M' ? 0 : 1;
            break;
        case 'channel':
            pageName = 'ChannelPage';
            params.level = 1;
            break;
        default:
            pageName = 'OtherPage';
            break;
    };
    if (!generator[pageName]) {
        callback({ message: 'generator ' + pageName + ' is null', source: 'executeTemplateEngine' });
        return;
    }
    var pageGenerator;
    var pageGenerators = pageGeneratorDict[pageName];
    for (var i = 0, len = pageGenerators.length; i < len; i++) {
        if (!pageGenerators[i].isBusy) {
            pageGenerator = pageGenerators[i];
            pageGenerator.init(req, params, callback);
            break;
        }
    }
    if (!pageGenerator) {
        pageGenerator = new generator[pageName](req, params, callback);
        pageGenerators.push(pageGenerator);
    }
    pageGenerator.isBusy = true;
    return pageGenerator;
};

module.exports = {
    getPageGenerator: getPageGenerator
};