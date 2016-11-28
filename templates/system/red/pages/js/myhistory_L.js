cb.views.register('MyHistoryViewController', function(controllerName) {
	var view = function(id, options) {
		cb.views.BaseView.call(this, id, options);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getHistories: {
			url: 'client/ProductViewHistorys/getHistories',
			method: 'GET',
			options: {
				token: true,
				autoLogin: false
			}
		},
		delete: {
			url: 'client/ProductViewHistorys/delete',
			method: 'POST',
			options: {
				token: true,
				autoLogin: false
			}
		}
	});
	view.prototype.init = function() {
		var self=this;
		this.flag = false;
		this.getData({}, function(result) {
			self.register();
			self.regsiteronce();
			var option = '';
			if (result.classList) {
			    result.classList.forEach(function (item) {
			        option += '<option data-id=' + item[0].id + '>' + item[0].cName + '</option>'
			    })
			}
			
			$('select.classes').append(option);
		})
	}
	view.prototype.getData = function(param, callback) {
	    this.proxy.getHistories(param, function (err, result) {
			if (err) {
				alert(err.message);
			} else {
				var data = this.dealData(result.pager.data);
				var html = this.render($('#historyTPL').html(), {
					data: data
				});
				$('.main-contrent').html(html);
				callback(result);
			}
		}, this);
	}
	view.prototype.regsiteronce = function() {
		var self = this;
		$('.delete-btn').click(function() {
			if ($('.delete-icon').hasClass('hidden')) {
				self.flag = true;
			} else {
				self.flag = false;
			}
			$('.delete-today,.delete-icon').toggleClass('hidden');
		});
		$('.classes').change(function() {
			var options = $(this).children('option:selected');
			var id = options.attr('data-id');
			if(id){
				var param={classId:parseInt(id)}
			}else{
				var param={}
			}
            self.getData(param,function(result){
            	self.register();	
            });
		})
	}
	view.prototype.dealData = function (data) {
		var json = {};
		data.forEach(function (item) {
		    if (item.fSalePrice) {
		        item.fSalePrice = parseFloat(item.fSalePrice).toFixed(2);
		    }
		    if (item.firstViewPrice) {
		        item.firstViewPrice = parseFloat(item.firstViewPrice).toFixed(2);
		    }
			item.viewDate = item.viewDate.split(' ')[0];
			if (!json[item.viewDate]) {
				json[item.viewDate] = [];
			}
			json[item.viewDate].push(item);
		});
		return json;
	}
	view.prototype.register = function() {
		var self = this;
		$('.historyBox li').mouseover(function() {
			$(this).find('.delete-icon').removeClass('hidden');
		});
		$('.historyBox li').mouseout(function() {
			if (self.flag) return;
			$(this).find('.delete-icon').addClass('hidden');
		});
		$('.historyBox li .delete-icon').mouseover(function() {
			$(this).css('opacity', 1);
		});
		$('.historyBox li .delete-icon').mouseout(function() {
			$(this).css('opacity', 0.5);
		});
		$('.historyBox li .delete-icon').click(function() {
			var id = $(this).parent('li').attr('data-id');
			self.deleteHistory([parseInt(id)], $(this));
		});
		$('.delete-today').click(function() {
			var ids = [];
			var domUl = $(this).parents('.main_unit ').find('.contentbox ul');
			for (var i = 0; i < domUl.children('li').length; i++) {
				var id = domUl.children('li:eq(' + i + ')').attr('data-id');
				ids.push(id);
			}
			self.deleteHistory(ids, $(this));
		});
	}
	view.prototype.deleteHistory = function(ids, target) {
		this.proxy.delete({
			ids: ids
		}, function(err, result) {
			if (err) {
				alert(err.message);
			} else {
				if (target.hasClass('delete-icon')) {
					//只需要删除当前这一张 并判断是不是当天最后一张  如果是 就要全部删除
					var domLi = target.parent('li');
					if (domLi.siblings('li').length == 0) {
						domLi.parents('.main_unit ').remove();
					} else {
						domLi.remove();
					}
				} else {
					//删除某一天的
					target.parents('.main_unit ').remove();
				}
			}
		}, this);
	}
	return view;
});