cb.views.register('ListViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.getProxyData = function (widgetName) {
	    var queryString = new cb.util.queryString();
	    // 是否积分商品标识
	    var isSalePoints = queryString.get("isSalePoints");
		if (widgetName == "search_detail") {
			return {
				categoryid: queryString.get("categoryid") || "",
				keyword: encodeURIComponent(queryString.get("keyword")) || ""
			};
		}
		if (widgetName == "product_list" || widgetName === 'sales_charts') {
		    var params = {
		        "pagesize": 12,
		        "pageindex": 1,
		        "where": []
		    };
            // 是积分商品
		    if (isSalePoints) {
		        var obj = {
		            "fieldname": "productAttribute",
		            "valuefrom": "2",
		        }
		        params.where.push(obj);
		    } else {
		        var obj = {
		            "fieldname": "productAttribute",
		            "valuefrom": "1",
		        }
		        params.where.push(obj);
		    }
			if (widgetName === 'sales_charts') {
				var widget = this.getWidget(widgetName);
				var config = widget.getConfig();
				params.pagesize = config.limit;
				params.order = config.order;
			}
			for (var item in queryString.query) {
				if (item.indexOf("props_") != -1) {
					var props = item.substr(6);
					var obj = {
						"fieldname": "props_id",
						"valuefrom": props,
						"valueto": "'" + queryString.query[item] + "'"
					}
					params.where.push(obj);
				} else if (item.indexOf("saleprice") != -1) {
					var value = queryString.query[saleprice];
					var obj = {
						"fieldname": "saleprice",
						"valuefrom": value.substring(0, value.indexOf(",")),
						"valueto": value.substr(value.indexOf(","))
					}
					params.where.push(obj);
				} else {
					var obj = {
						"fieldname": item,
						"valuefrom": queryString.query[item]
					}
					params.where.push(obj);
				}
			}
			return {
				"queryCondition": params
			};
		}
	};
	view.prototype.init = function() {
		cb.rest.ContextBuilder.promotion();
	}
	return view;
});