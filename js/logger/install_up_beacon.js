(function(window,document,undefined){
	
	//处理uuid js脚本
	// start of UUID class file
	function UUID(){
		this.id = this.createUUID();
	}
	UUID.prototype.valueOf = function(){ return this.id; }
	UUID.prototype.toString = function(){ return this.id; }
	UUID.prototype.createUUID = function(){
		var dg = new Date(1582, 10, 15, 0, 0, 0, 0);
		var dc = new Date();
		var t = dc.getTime() - dg.getTime();
		var h = '-';
		var tl = UUID.getIntegerBits(t,0,31);
		var tm = UUID.getIntegerBits(t,32,47);
		var thv = UUID.getIntegerBits(t,48,59) + '1'; // version 1, security version is 2
		var csar = UUID.getIntegerBits(UUID.rand(4095),0,7);
		var csl = UUID.getIntegerBits(UUID.rand(4095),0,7);

		var n = UUID.getIntegerBits(UUID.rand(8191),0,7) + 
				UUID.getIntegerBits(UUID.rand(8191),8,15) + 
				UUID.getIntegerBits(UUID.rand(8191),0,7) + 
				UUID.getIntegerBits(UUID.rand(8191),8,15) + 
				UUID.getIntegerBits(UUID.rand(8191),0,15); // this last number is two octets long
		return tl + h + tm + h + thv + h + csar + csl + h + n; 
	}
	UUID.getIntegerBits = function(val,start,end){
		var base16 = UUID.returnBase(val,16);
		var quadArray = new Array();
		var quadString = '';
		var i = 0;
		for(i=0;i<base16.length;i++){
			quadArray.push(base16.substring(i,i+1));	
		}
		for(i=Math.floor(start/4);i<=Math.floor(end/4);i++){
			if(!quadArray[i] || quadArray[i] == '') quadString += '0';
			else quadString += quadArray[i];
		}
		return quadString;
	}
	UUID.returnBase = function(number, base){
		var convert = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
	    if (number < base) var output = convert[number];
	    else {
	        var MSD = '' + Math.floor(number / base);
	        var LSD = number - MSD*base;
	        if (MSD >= base) var output = this.returnBase(MSD,base) + convert[LSD];
	        else var output = convert[MSD] + convert[LSD];
	    }
	    return output;
	}
	UUID.rand = function(max){
		return Math.floor(Math.random() * max);
	}
	// end of UUID class file
	
	
		
    /*安装采集脚本的js程序*/
    // upLogger对象是采集脚本对外提供的操作对象
    if (window.upLogger){//如果不为空，直接返回，避免重复安装
        return;
    }
    var cookieUtil = {//cookie操作工具类
        setCookie:function(sName,sValue,oExpires,sPath,sDomain,bSecure){
            var currDate = new Date(),
            //记录cookie有效期，24 * 60 * 60* 1000为1天，传入的oExpires表示几天后失效
            sExpires = typeof oExpires == 'undefined'?'':';expires=' + new Date(currDate.getTime() + (oExpires * 24 * 60 * 60* 1000)).toUTCString();
			document.cookie = sName + '=' + sValue + sExpires + ((sPath == null)?'':(' ;path=' + sPath)) + ((sDomain == null)?'':(' ;domain=' + sDomain)) + ((bSecure == true)?' ; secure':'');
        },
        getCookie:function(sName){
            var regRes = document.cookie.match(new RegExp("(^| )" + sName + "=([^;]*)(;|$)"));
		   return (regRes != null)?unescape(regRes[2]):'-';
        }        
    };
//    var btsVal = cookieUtil.getCookie('b_t_s'),//b_t_s的cookie作用1.标识该页面是否已经安装了采集脚本；2.记录采集脚本的有效期
//        startTime = 0,
//        intervalTime = 3 * 24 * 60 * 60 * 1000,
//        currIntervalTime = new Date().getTime() - 1200000000000,
//        domainHead = (document.URL.substring(0,document.URL.indexOf('://'))) + '://';
//    if (btsVal != '-' && btsVal.indexOf('t') != -1){
//        var getBtsTime = btsVal.substring(btsVal.indexOf('t') + 1,btsVal.indexOf('x'));
//            getCurrInterVal = currIntervalTime - getBtsTime;
//        if (getCurrInterVal > intervalTime){
//            startTime = currIntervalTime;
//            cookieUtil.setCookie('b_t_s',btsVal.replace('t' + getBtsTime + 'x', 't' + currIntervalTime + 'x'), 10000, '/');
//        }else{
//            startTime = getBtsTime;
//        }
//    }else{
//        if (btsVal == '-'){
//            cookieUtil.setCookie('b_t_s','t' + currIntervalTime + 'x', 10000, '/');    
//        }else{
//            cookieUtil.setCookie('b_t_s',btsVal + 't' + currIntervalTime + 'x', 10000, '/');        
//        }
//        startTime = currIntervalTime;
//    }
    
    //wufeng修改，将其做为用户cookie标记，1天重置一次，有效期不超过1天
    var btsVal = cookieUtil.getCookie('b_t_s'),//b_t_s的cookie作用1.标识该页面是否已经安装了采集脚本；2.记录采集脚本的有效期
    startTime = 0,
    //留存当前时间
    curr = new Date(),
    currIntervalTime=curr.getTime(),//获取当前时间到1970-1-1的毫秒数
    //计算当前时间到当天23点59分59秒的时间差（毫秒）
    nowDataEnd=Date.parse(curr.getFullYear()+"-"+(curr.getMonth()+1)+"-"+curr.getDate()+' 23:59:59.999'),
    differenceTime=nowDataEnd-currIntervalTime,
    domainHead = (document.URL.substring(0,document.URL.indexOf('://'))) + '://';
    if (btsVal != '-' && btsVal.indexOf('t') != -1&&btsVal.length>15){
    	var getBtsTime = btsVal.substring(btsVal.indexOf('t') + 1,btsVal.indexOf('x'));
    	strs=getBtsTime.split("_"); 
    	if(currIntervalTime-strs[0]>strs[1]){
    		//虽然b_t_s没失效，但是夸天了，所以需要重新赋值
    		cookieUtil.setCookie('b_t_s',btsVal.replace('t' + getBtsTime + 'xs', 't' + currIntervalTime + '_' + differenceTime +'_'+ strs[2] + 'x'), 1, '/');
    		startTime = currIntervalTime;
    	}else{
    		startTime = strs[0];
    	}
    }else{
    	if (btsVal == '-'||btsVal.length<=15){
    		//先安装uuid.js
    		var uuid = new UUID().createUUID();
    		//设置唯一cookie标识
    		cookieUtil.setCookie('b_t_s','t' + currIntervalTime + '_' + differenceTime + '_' + uuid + 'x', 1, '/');
    	}
    	startTime = currIntervalTime;
    }
    
    document.write('<script defer src="'+'http://pv.sohu.com/cityjson'+'"><\/script>');//安装采集ip地址插件
    document.write('<script defer src="' + 'http://int.dpool.sina.com.cn/iplookup/iplookup.php?format=js' + '"><\/script>'); //安装采集ip地址插件
    document.write('<script defer src="' + location.protocol + '//' + location.host + '/js/logger/up_beacon.js?' + startTime + '"><\/script>'); //安装采集脚本
//    document.write('<script src="' + domainHead + 'yl.yonyouup.com/js/UPLogger/up_beacon.js?' + startTime + '"><\/script>');//安装采集脚本
//    document.write('<script defer src="' + domainHead + 'yla.yonyouup.com/js/UPLogger/up_beacon.js?' + startTime + '"><\/script>');//安装采集脚本
//    document.write('<script src="' + domainHead + 'localhost/js/UPLogger/up_beacon.js?' + startTime + '"><\/script>');//安装采集脚本
})(window,document);

var cookieUtil = {//cookie操作工具类
        setCookie: function (sName, sValue, oExpires, sPath, sDomain, bSecure) {
            var currDate = new Date(),
            //记录cookie有效期，24 * 60 * 60* 1000为1天，传入的oExpires表示几天后失效
                sExpires = typeof oExpires == 'undefined' ? '' : ';expires=' + new Date(currDate.getTime() + (oExpires * 24 * 60 * 60 * 1000)).toUTCString();
            document.cookie = sName + '=' + sValue + sExpires + ((sPath == null) ? '' : (' ;path=' + sPath)) + ((sDomain == null) ? '' : (' ;domain=' + sDomain)) + ((bSecure == true) ? ' ; secure' : '');
        },
        getCookie: function (sName) {
            var regRes = document.cookie.match(new RegExp("(^| )" + sName + "=([^;]*)(;|$)"));
            return (regRes != null) ? unescape(regRes[2]) : '-';
        }
    };