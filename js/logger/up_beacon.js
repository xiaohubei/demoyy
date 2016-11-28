function logger(window,document,undefined,up_WXAccountId, up_UserID, up_OpenID,corpid,memberid, url){
    // upLogger对象是采集脚本对外提供的操作对象
    if (window.upLogger){//如果不为空，直接返回，避免重复安装
        return;
    }
    var upBeaconUtil ={//日志记录工具类
        jsName:'up_beacon.js',//程序名称
        defaultVer:20150525,//版本日期,将本地127.0.0.1改为了目前服务地址，本地“10.1.42.63”
        getVersion:function(){//获取版本号
            var e = this.jsName;
            var a = new RegExp(e + "(\\?(.*))?$");
            var d = document.getElementsByTagName("script");
            for (var i = 0;i < d.length;i++){
                var b = d[i];
                if (b.src && b.src.match(a)){
                    var z = b.src.match(a)[2];
                    if (z && (/^[a-zA-Z0-9]+$/).test(z)){
                         return z;
                    }
                }
            }
            return this.defaultVer;
        },
        setCookie:function(sName,sValue,oExpires,sPath,sDomain,bSecure){//设置cookie信息
            var currDate = new Date(),
                sExpires = typeof oExpires == 'undefined'?'':';expires=' + new Date(currDate.getTime() + (oExpires * 24 * 60 * 60* 1000)).toUTCString();
            document.cookie = sName + '=' + sValue + sExpires + ((sPath == null)?'':(' ;path=' + sPath)) + ((sDomain == null)?'':(' ;domain=' + sDomain)) + ((bSecure == true)?' ; secure':'');
        },
        getCookie:function(sName){//获取cookie信息
            var regRes = document.cookie.match(new RegExp("(^| )" + sName + "=([^;]*)(;|$)"));
            return (regRes != null)?unescape(regRes[2]):'-';
        },
        getRand:function(){// 生产页面的唯一标示
            var currDate = new Date();
            var randId = currDate.getTime() + '-';    
            for (var i = 0;i < 32;i++)
            {
                randId += Math.floor(Math.random() * 10);    
            }
            return randId;
        },
        parseError:function(obj){
            var retVal = '';
            for (var key in obj){
                retVal += key + '=' + obj[key] + ';';    
            }
            return retVal;
        },
        getParam:function(obj,flag){// 参数转化方法
            var retVal = null;
            if (obj){
                if (upBeaconUtil.isString(obj) || upBeaconUtil.isNumber(obj)){
                    retVal = obj;    
                }else{
                    if (upBeaconUtil.isObject(obj)){
                        var tmpStr = '';
                        for (var key in obj){
                            if (obj[key] != null && obj[key] != undefined){
                                var tmpObj = obj[key];
                                if (upBeaconUtil.isArray(tmpObj)){
                                    tmpObj = tmpObj.join(',');    
                                }else{
                                    if (upBeaconUtil.isDate(tmpObj)){
                                        tmpObj = tmpObj.getTime();    
                                    }
                                }
                                tmpStr += key + '=' + tmpObj + '&';
                            }
                        }
                        tmpStr = tmpStr.substring(0,tmpStr.length - 1);
                        retVal = tmpStr;
                    }else{
                        if (upBeaconUtil.isArray(obj)){
                            if (upBeaconUtil.length & upBeaconUtil.length > 0){
                                retVal = obj.join(',');
                            }
                        }else{
                            retVal = obj.toString();    
                        }
                    }
                }
            }
            
            if (!retVal){
                retVal = '-';    
            }
            
            if (flag){
                retVal = encodeURIComponent(retVal);
                retVal = this.base64encode(retVal);
            }
            return retVal;
        },
        base64encode: function(G) {//base64加密
            var A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var C, E, z;
            var F, D, B;
            z = G.length;
            E = 0;
            C = "";
            while (E < z) {
                F = G.charCodeAt(E++) & 255;
                if (E == z) {
                    C += A.charAt(F >> 2);
                    C += A.charAt((F & 3) << 4);
                    C += "==";
                    break
                }
                D = G.charCodeAt(E++);
                if (E == z) {
                    C += A.charAt(F >> 2);
                    C += A.charAt(((F & 3) << 4) | ((D & 240) >> 4));
                    C += A.charAt((D & 15) << 2);
                    C += "=";
                    break
                }
                B = G.charCodeAt(E++);
                C += A.charAt(F >> 2);
                C += A.charAt(((F & 3) << 4) | ((D & 240) >> 4));
                C += A.charAt(((D & 15) << 2) | ((B & 192) >> 6));
                C += A.charAt(B & 63)
            }
            return C
        },
        getDomain:function(){//获取网站的域名
            return document.URL.substring(document.URL.indexOf("://") + 3,document.URL.lastIndexOf("\/"));
        },
        isString:function(obj){// 判断是不是String类型
            return (obj != null) && (obj != undefined) && (typeof obj == 'string') && (obj.constructor == String);    
        },
        isNumber:function(obj){// 判断是否是数组
            return (typeof obj == 'number') && (obj.constructor == Number);    
        },
        isDate:function(obj){// 判断是否是日期
            return obj && (typeof obj == 'object') && (obj.constructor == Date);
        },
        isArray:function(obj){//判断是否是数组
            return obj && (typeof obj == 'object') && (obj.constructor == Array);    
        },
        isObject:function(obj){//判断是否是对象
            return obj && (typeof obj == 'object') && (obj.constructor == Object)    
        },
        trim:function(str){// 去除左右两边空格
            return str.replace(/(^\s*)|(\s*$)/, "");;
        }
    },
    beacon_vist_num = isNaN(beacon_vist_num = +upBeaconUtil.getCookie('up_beacon_vist_count')) ? 1:beacon_vist_num + 1;// 从cookie里获取访问次数
    upBeaconUtil.setCookie('up_beacon_vist_count',beacon_vist_num,1);//记录新的访问次数,过期时间是1天
    var setUpBeaconId = function(){
        var sUpBeaconId = upBeaconUtil.trim(upBeaconUtil.getCookie('up_beacon_id'));
        if (sUpBeaconId == undefined || sUpBeaconId == null || sUpBeaconId == '' || sUpBeaconId == '-'){
            upBeaconUtil.setCookie('up_beacon_id',(upBeaconUtil.getDomain() + '.' + (new Date()).getTime()));
        }        
    }(),
    beaconMethod = {
        uvId:'up_beacon_id',
        memId:'up_dw_track',
//        beaconUrl:'yl.yonyouup.com/a.gif',//记录访问日志的url
//        errorUrl:'yl.yonyouup.com/error.html',//记录错误日志的url
//        clickUrl:'yl.yonyouup.com/click.html',//记录click日志的url 
        beaconUrl:'yla.yonyouup.com/a.gif',//记录访问日志的url//localhost:8081
        errorUrl:'yla.yonyouup.com/error.html',//记录错误日志的url
        clickUrl:'yla.yonyouup.com/click.html',//记录click日志的url 
//        beaconUrl:'localhost/a.gif',//记录访问日志的url
//        errorUrl:'localhost/error.html',//记录错误日志的url
//        clickUrl:'localhost/click.html',//记录click日志的url 
        pageId:typeof _beacon_pageid != 'undefined'?_beacon_pageid:(_beacon_pageid = upBeaconUtil.getRand()),//生产pageId(页面唯一标示)
   	
        //wufeng增加，获取IP和IP所属地区
        client_ip:returnCitySN['cip'],
//        client_ip:"http://yonyouup.com",
        //client_area:encodeURIComponent(returnCitySN['cname']),
        client_area:encodeURIComponent(remote_ip_info['country']+'_'+remote_ip_info['province']+'_'+remote_ip_info['city']),
//        client_area:"中国_北京市_北京",
        protocol:function(){//请求的协议例如http://
            var reqHeader = location.protocol;
            if ('file:' === reqHeader){
                reqHeader = 'http:';    
            }
            return reqHeader + '//';
        },
        tracking:function(){// 记录访问日志的方法（对外）
            this.beaconLog();
        },
        getRefer:function(){// 获取上游页面信息
            var reqRefer = document.referrer;
            reqRefer == location.href && (reqRefer = '');
            try{
                reqRefer = '' == reqRefer ? opener.location:reqRefer;
                reqRefer = '' == reqRefer ? '-':reqRefer;
            }catch(e){
                reqRefer = '-';
            }
            return reqRefer;
        },
        beaconLog:function(){// 记录访问日志方法
            try{
//                var httpHeadInd = document.URL.indexOf('://'),
                var httpUrlContent = '{' + upBeaconUtil.getParam(url) + '}',
                    hisPageUrl = '{' + upBeaconUtil.getParam(this.getRefer()) + '}',
                    ptId = upBeaconUtil.getCookie(this.memId),
                    cId = upBeaconUtil.getCookie(this.uvId),
                    btsVal = upBeaconUtil.getCookie('b_t_s'),
                    beanconMObj = {};
//                	console.log("hisPageUrl====="+hisPageUrl);
//                    console.log("beaconLog ptId====="+ptId);
//                	console.log("beaconLog memId====="+this.memId);
//                	console.log("test==========cookieUtil======"+testUtil.getTest);
//                	console.log("beaconLog uvId====="+this.uvId);
//                    console.log("beaconLog cId====="+cId);
                var btsFlag = btsVal == '-' || btsVal.indexOf('s') == -1;
                if (ptId != '-'){
                    beanconMObj.memId = ptId;    
                }
                if (btsFlag){
                    beanconMObj.subIsNew = 1;
//                    upBeaconUtil.setCookie('b_t_s',btsVal == '-' ? 's' : (btsVal + 's'),10000,'/');
                    upBeaconUtil.setCookie('b_t_s',btsVal == '-' ? 's' : (btsVal + 's'),1,'/');
                }else{
                    beanconMObj.subIsNew = 0;    
                }
                var logParams = '{' + upBeaconUtil.getParam(beanconMObj) + '}',
                logPageId = this.pageId,
                logTitle = document.title;
//                console.log("logParams===="+logParams);
                if (logTitle.length > 25){
                    logTitle = logTitle.substring(0,25);
                }
                logTitle = encodeURIComponent(logTitle);
                var logCharset = (navigator.userAgent.indexOf('MSIE') != -1) ? document.charset : document.characterSet,
                    logQuery = '{' + upBeaconUtil.getParam({
                    	cPageId:logPageId,
                    	cTitle:logTitle,
                    	cCharset:logCharset,
                    	cSR:(window.screen.width + '*' + window.screen.height)
                    }) + '}';
                //处理浏览器类型
                var logBrowser;
                var Sys = {};
            	var browserName=navigator.userAgent.toLowerCase();  
            	if(/msie/i.test(browserName) && !/opera/.test(browserName)){  
            	    //alert("IE");
            	    Sys.ie = browserName.match(/msie ([\d.]+)/)[1];
            	}else if(/firefox/i.test(browserName)){  
            	    //alert("Firefox");  
            	    Sys.firefox = browserName.match(/firefox\/([\d.]+)/)[1];
            	}else if(/chrome/i.test(browserName) && /webkit/i.test(browserName) && /mozilla/i.test(browserName)){  
            	    //alert("Chrome");  
            	    Sys.chrome = browserName.match(/chrome\/([\d.]+)/)[1];
            	}else if(/opera/i.test(browserName)){  
            	    //alert("Opera");   
            	    Sys.opera = browserName.match(/opera.([\d.]+)/)[1];
            	}else if(browserName.match(/MicroMessenger/i) == 'micromessenger'){
            		//微信内置浏览器
            		Sys.wixin = 'weixin';
            	}else if(/webkit/i.test(browserName) &&!(/chrome/i.test(browserName) && /webkit/i.test(browserName) && /mozilla/i.test(browserName))){  
            	    //alert("Safari");
            	    Sys.safari = browserName.match(/safari\/([\d.]+)/)[1];
            	}else{
            		logBrowser='unKnow';
            	    //alert("unKnow");  
            	}
            	if(Sys.ie) logBrowser='IE: '+Sys.ie;
                if(Sys.firefox) logBrowser='Firefox: '+Sys.firefox;
                if(Sys.chrome) logBrowser='Chrome: '+Sys.chrome;
                if(Sys.opera) logBrowser='Opera: '+Sys.opera;
                if(Sys.safari) logBrowser='Safari: '+Sys.safari;
                if(Sys.wixin) logBrowser='weixin';
                
                //记录业务信息
//    			sparam.WXAccountID//微信公众号id（必需）
//    			sparam.UserID//易联客户id
//    			sparam.BusinessID//具体哪个功能id（哪个转盘，哪个金蛋）
//    			sparam.OpenID//参与用户id
//    			sparam.type//点击类型（0：按钮，1：图片，2：链接，3：其他）(必需)
//    			sparam.clickTarget//页面控件id
//    			sparam.pageURL//页面地址
//    			sparam.pageId//页面id，留在本页怎么点按钮，不变
//    			sparam.param//按钮提交请求参数
                
                //获取微信公众号id(修改：由服务端配合，从cookie里取)
//                var up_WXAccountId=upBeaconUtil.getCookie('up_WXAccountId');
//                console.log("1.up_WXAccountId="+up_WXAccountId);
//                //易联客户id
//                var up_UserID=upBeaconUtil.getCookie('up_UserID');
//                console.log("2.up_UserID="+up_UserID);
//                //获取参与用户id
//                var up_OpenID=upBeaconUtil.getCookie('up_OpenID');
//                console.log("3.up_OpenID="+up_OpenID);
                if(up_OpenID=='-'){
                	//重定向后，从url中获取，不知道为啥重定向后从cookie拿不到，之后可以
                	if (httpUrlContent.indexOf("?") != -1) {
                		var str = httpUrlContent.substr(1);
                		strs = str.split("&");
                		for(var i = 0; i < strs.length; i ++) {
                			if(strs[i].split("=")[0]=='oid'){
                				up_OpenID=strs[i].split("=")[1];
                				up_OpenID=up_OpenID.substring(1,up_OpenID.length-1);
                			}
                		}
                	}
                }
                //获取具体功能id
                var up_BusinessID=upBeaconUtil.getCookie('up_BusinessID');
                var sparam = {
                	cLogURL:httpUrlContent,
                	cLogHisRefer:hisPageUrl,
                	cLogParams:logParams,
                    cLogQuery:logQuery,
                    //wufeng增加，客户点id和地区
                    cLogClientIP:'{' +this.client_ip+ '}',
                    cLogClientArea:'{' +this.client_area+ '}',
                    cLogClientVisitNum:'{' +beacon_vist_num+ '}',
                    cLogBrowser:'{' +logBrowser+ '}',
                    cWXAccountID:'{' +upBeaconUtil.getParam(up_WXAccountId)+ '}',
                    cUserID:'{' +upBeaconUtil.getParam(up_UserID)+ '}',
                    cBusinessID:'{' +up_BusinessID+ '}',
            		cOpenID:'{' + upBeaconUtil.getParam(up_OpenID) + '}',
            		cBts:'{' +upBeaconUtil.getCookie('b_t_s')+ '}',
            		iCorpID:'{'+upBeaconUtil.getParam(corpid)+'}',
                	iMemberID:'{'+upBeaconUtil.getParam(memberid)+'}'
                };
//                console.log("beaconUrl the last param========"+JSON.stringify(sparam));
                this.sendRequest(this.beaconUrl,sparam);
            }catch(ex){
                this.sendError(ex);    
            }
        },
        clickLog:function(sparam){// 记录点击日志
//			sparam.WXAccountID//微信公众号id（必需）
//			sparam.UserID//易联客户id
//			sparam.BusinessID//具体哪个功能id（哪个转盘，哪个金蛋）
//			sparam.OpenID//参与用户id
//			sparam.type//点击类型（0：按钮，1：图片，2：链接，3：其他）(必需)
//			sparam.clickTarget//页面控件id
//			sparam.pageURL//页面地址
//			sparam.pageId//页面id，留在本页怎么点按钮，不变
//			sparam.param//按钮提交请求参数
			
            try{
            	//获得页面地址
               // var httpHeadInd = document.URL.indexOf('://'),
                var httpUrlContent = '{' +upBeaconUtil.getParam(url)+ '}',
                hisPageUrl = '{' + upBeaconUtil.getParam(this.getRefer()) + '}',
            	//页面基本情况获取，同页面载入
            	logPageId = this.pageId,
            	logTitle = document.title;
                if (logTitle.length > 25){
                    logTitle = logTitle.substring(0,25);
                }
                logTitle = encodeURIComponent(logTitle);
                var logCharset = (navigator.userAgent.indexOf('MSIE') != -1) ? document.charset : document.characterSet,
                    logQuery = '{' + upBeaconUtil.getParam({
                    	cPageId:logPageId,
                    	cTitle:logTitle,
                    	cCharset:logCharset,
                    	cSR:(window.screen.width + '*' + window.screen.height)
                    }) + '}';
                //处理浏览器类型
                var logBrowser;
                var Sys = {};
            	var browserName=navigator.userAgent.toLowerCase();  
            	if(/msie/i.test(browserName) && !/opera/.test(browserName)){  
            	    //alert("IE");
            	    Sys.ie = browserName.match(/msie ([\d.]+)/)[1];
            	}else if(/firefox/i.test(browserName)){  
            	    //alert("Firefox");  
            	    Sys.firefox = browserName.match(/firefox\/([\d.]+)/)[1];
            	}else if(/chrome/i.test(browserName) && /webkit/i.test(browserName) && /mozilla/i.test(browserName)){  
            	    //alert("Chrome");  
            	    Sys.chrome = browserName.match(/chrome\/([\d.]+)/)[1];
            	}else if(/opera/i.test(browserName)){  
            	    //alert("Opera");   
            	    Sys.opera = browserName.match(/opera.([\d.]+)/)[1];
            	}else if(/webkit/i.test(browserName) &&!(/chrome/i.test(browserName) && /webkit/i.test(browserName) && /mozilla/i.test(browserName))){  
            	    //alert("Safari");
            	    Sys.safari = browserName.match(/safari\/([\d.]+)/)[1];
            	}else{
            		logBrowser='unKnow';
            	    //alert("unKnow");  
            	}
            	if(Sys.ie) logBrowser='IE: '+Sys.ie;
                if(Sys.firefox) logBrowser='Firefox: '+Sys.firefox;
                if(Sys.chrome) logBrowser='Chrome: '+Sys.chrome;
                if(Sys.opera) logBrowser='Opera: '+Sys.opera;
                if(Sys.safari) logBrowser='Safari: '+Sys.safari;
            	
                //获取微信公众号id(修改：由服务端配合，从cookie里取)
//                var up_WXAccountId=upBeaconUtil.getCookie('up_WXAccountId');
//                console.log("up_WXAccountId="+up_WXAccountId);
//                //易联客户id
//                var up_UserID=upBeaconUtil.getCookie('up_UserID');
//                console.log("up_UserID="+up_UserID);
//                //获取参与用户id
//                var up_OpenID=upBeaconUtil.getCookie('up_OpenID');
//                console.log("up_OpenID="+up_OpenID);
//                //获取具体功能id
//                var up_BusinessID=upBeaconUtil.getCookie('up_BusinessID');
//                console.log("up_BusinessID具体功能id="+up_BusinessID);
                if (upBeaconUtil.isObject(sparam)){// 当传入参数是javascript对象
                	sparam.cLogURL=httpUrlContent;
                	sparam.cLogHisRefer=hisPageUrl;
                	sparam.cLogQuery=logQuery;
                	sparam.cLogClientIP='{' +this.client_ip+ '}';
                	sparam.cLogClientArea='{' +this.client_area+ '}';
                	sparam.cLogClientVisitNum='{' +beacon_vist_num+ '}';
                	sparam.cLogBrowser='{' +logBrowser+ '}';
                	sparam.cWXAccountID='{' +up_WXAccountId+ '}';
                	sparam.cUserID='{' +up_UserID+ '}';
                	sparam.cBusinessID='{' +up_BusinessID+ '}';
                	sparam.cOpenID='{' +up_OpenID+ '}';
                	sparam.cBts='{' +upBeaconUtil.getCookie('b_t_s')+ '}';
                	sparam.iCorpID='{'+corpid+'}';
                	sparam.iMemberID='{'+memberid+'}';
                	//处理业务相关参数，调用也赋值数据
                	if(null!=sparam.cLogParams){
                		sparam.cLogParams= '{' + upBeaconUtil.getParam(sparam.cLogParams) + '}';
                	}
                	if(null!=sparam.iClickType){
                		sparam.iClickType= '{' + sparam.iClickType + '}';
                	}
                	if(null!=sparam.cClickTarget){
                		sparam.cClickTarget= '{' + upBeaconUtil.getParam(sparam.cClickTarget) + '}';
                	}
                	if(null!=sparam.cDesc){
                		sparam.cDesc= '{' + upBeaconUtil.getParam(sparam.cDesc) + '}';
                	}
                	if(null!=sparam.cRequestURL){
                		sparam.cRequestURL= '{' + upBeaconUtil.getParam(sparam.cRequestURL) + '}';
                	}
                	if(null!=sparam.cServiceName){
                		sparam.cServiceName= '{' + upBeaconUtil.getParam(sparam.cServiceName) + '}';
                	}
                	
                	
//                	sparam.WXAccountID=up_WXAccountId;
//                	sparam.ModelID=up_ModelID;
//                	sparam.BusinessID=up_BusinessID;
//                	sparam.OpenID=up_OpenID;
//                	sparam.pageURL=httpUrlContent;
//                  sparam.pageId = clickPageId;
                }else{
                    if (upBeaconUtil.isString(sparam) && sparam.indexOf('=') > 0){// 当传入参数是字符串
                    	sparam += '&cLogURL='+httpUrlContent;
                    	//参数cLogParams不处理，因为本身是字符串，但要求两边加{}
                    	sparam += '&cLogQuery='+logQuery;
                    	sparam += '&cLogClientIP='+'{' +this.client_ip+ '}';
                    	sparam += '&cLogClientArea='+'{' +this.client_area+ '}';
                    	sparam += '&cLogClientVisitNum='+'{' +beacon_vist_num+ '}';
                    	sparam += '&cLogBrowser='+'{' +logBrowser+ '}';
                    	sparam += '&cWXAccountID='+'{' +up_WXAccountId+ '}';
                    	sparam += '&cUserID='+'{' +up_UserID+ '}';
                    	sparam += '&cBusinessID='+'{' +up_BusinessID+ '}';
                    	sparam += '&cOpenID='+'{' +up_OpenID+ '}';
                    	sparam += '&cBts='+'{' +upBeaconUtil.getCookie('b_t_s')+ '}';
                    	sparam += '&iCorpID='+'{'+corpid+'}';
                    	sparam += '&iMemberID='+'{'+memberid+'}';
//                        sparam += '&WXAccountID=' + up_WXAccountId;
//                        sparam += '&ModelID=' + up_ModelID;
//                        sparam += '&BusinessID=' + up_BusinessID;
//                        sparam += '&OpenID=' + up_OpenID;
//                        sparam += '&pageURL=' + httpUrlContent;
//                        sparam += '&pageId=' + clickPageId;
                    }else{
                        if (upBeaconUtil.isArray(sparam)){// 当传入参数是数组
                        	//数组暂时不支持
//                            sparam.push("WXAccountID=" + up_WXAccountId);
//                            sparam.push("ModelID=" + up_ModelID);
//                            sparam.push("BusinessID=" + up_BusinessID);
//                            sparam.push("OpenID=" + up_OpenID);
//                            sparam.push("pageURL=" + httpUrlContent);
//                            sparam.push("pageId=" + clickPageId);
//                            sparam = sparam.join('&');//数组转化为字符串
                        }else{// 其他数据类型
                            sparam = {
                            		cLogURL:httpUrlContent,
                            		cLogHisRefer:hisPageUrl,
                                	cLogQuery:logQuery,
                                	cLogClientIP:'{' +this.client_ip+ '}',
                                	cLogClientArea:'{' +this.client_area+ '}',
                                	cLogClientVisitNum:'{' +beacon_vist_num+ '}',
                                	cLogBrowser:'{' +logBrowser+ '}',
                                	cWXAccountID:'{' +up_WXAccountId+ '}',
                                	cUserID:'{' +up_UserID+ '}',
                                	cBusinessID:'{' +up_BusinessID+ '}',
                                	cOpenID:'{' +up_OpenID+ '}',
                                	cBts:'{' +upBeaconUtil.getCookie('b_t_s')+ '}',
                                	iCorpID:'{'+corpid+'}',
                                	iMemberID:'{'+memberid+'}'
//                            		WXAccountID:up_WXAccountId,
//                            		ModelID:up_ModelID,
//                            		BusinessID:up_BusinessID,
//                            		OpenID:up_OpenID,
//                            		pageURL:httpUrlContent,
//                            		pageId:clickPageId
                            		};    
                        }
                    }
                }
//                console.log("clickUrl the last param======"+JSON.stringify(sparam));
                this.sendRequest(this.clickUrl, sparam);// 发送点击日志
            }catch(ex){
                this.sendError(ex);        
            }
        },
        sendRequest:function(url,params){// 日志发送方法
            var urlParam = '',currDate = new Date();
            try{
                if (params){
                    urlParam = upBeaconUtil.getParam(params,false);
                    urlParam = (urlParam == '')?urlParam:(urlParam + '&');
                }
                var tmpUrlParam = 'ver={' + upBeaconUtil.getVersion() + '}&time={' + currDate.getTime()+ '}';
                url = this.protocol() + url + '?' + urlParam + tmpUrlParam;
                
                var logImage = new Image();
                logImage.onload = function(){
                    logImage = null;    
                }
                logImage.src = url;
            }catch(e){
                this.sendError(e);
            }
        },
        sendError:function(ex){// 发送错误日志
            var errURIParams = upBeaconUtil.parseError(ex),
                errURL = this.errorUrl + '?type=send&exception=' + encodeURIComponent(errURIParams.toString()),
                errImage = new Image();
            errImage.onload = function(){
                errImage = null;    
            };
            errImage.src = this.protocol() + errURL;
        }
    };
    beaconMethod.tracking();
    window.upLogger = beaconMethod;//构建window的upLogger对象
}
/*var httpHeadInd = document.URL.indexOf('://');
var url = document.URL.substring(httpHeadInd + 2);//获取url
var up_WXAccountId=cookieUtil.getCookie('up_WXAccountId');

var corpId = cookieUtil.getCookie('corpid');
var memberid = cookieUtil.getCookie('memberid');
//易联客户id
var up_UserID=cookieUtil.getCookie('up_UserID');
//获取参与用户id
var up_OpenID=cookieUtil.getCookie('up_OpenID');

logger(window,document, undefined,up_WXAccountId, up_UserID, up_OpenID,corpId,memberid,url);*/

