cb.views.register('pointRuleController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
    	var _this = this;
        var proxy = cb.rest.DynamicProxy.create({ 
            getMemberPointRule:{
            	url:'member/Members/getMemberPointRule',
            	method:'get',
            	options:{token:true}
            }
        });
        //获取积分规则
        var getMemberPointRule = function(){
        	proxy.getMemberPointRule(
        		function(err,data){
        			if(err){
	                   alert("获取积分规则失败" + data);
	                   return;
	                }else{
	                    dealPointRule(data);
	                }
        		}
        	)
        };
        var dealPointRule = function(data){
        	var lists = data;
        	if(lists[0] == null){
        		$("#pointRule").empty().append('当前公司没有设置积分规则');
        	}else{
        		if(lists[0].bOutlineAccount == 1){
        			lists[0].bOutlineAccount = '是';
        		}else if(lists[0].bOutlineAccount == 0){
        			lists[0].bOutlineAccount = '否';
        		};
        		var tplstring = document.getElementById("pointRuleTpl");
				var html = _this.render(tplstring.innerHTML, {
					returnList: lists
				});
				$("#pointRule").empty().append(html);
        	}
			
        }
        getMemberPointRule();
    };
    
    return view;
});