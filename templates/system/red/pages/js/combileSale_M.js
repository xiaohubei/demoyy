cb.views.register('CombileSaleController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		getProductsByIds: {
			url: 'client/Products/getProductsByIds',
			method: 'POST',
		},
	});
	view.prototype.init = function() {
		var self = this;
		var query = this.getQuery();
		var combile = query.combile;
		var mainPro = query.mainPro;
		var thisView = this.getView();
		var arr = [];
		combile.combinProducts.forEach(function(item) {
			arr.push(item.productId);
		})
		this.proxy.getProductsByIds({
			ids: arr,
			packageId: query.id
		}, function(err, result) {
			result.unshift(mainPro);
			var html = this.render(thisView.find('script').html(), {
				data: result
			});
			$$('ul.li-content').html(html);
			this.register(thisView, result);
		}, this);
	};
	view.prototype.register = function(thisView, result) {
		var self=this;
		thisView.find('input[type="checkbox"]').on('click', function() {
			var checked = $$(this).prop('checked');
			if (!checked) {
				$$(this).prop('checked', false);
			} else {
				$$(this).prop('checked', true);
			}
		});
		thisView.find('.item-subtitle .button').click(function() {
			var id = $$(this).attr('data-id');
			var product = result.filter(function(item, arr, index) {
				return (id == item.id);
			})[0];
			if(product.lsSpecs.length>0){
			var html = self.render(thisView.find('#productDealSku').html(), {data: [product]});
		    $$('.popup-prodSUK').html(html);	
		    myApp.popup('.popup-prodSUK');
			}
		});
	}
	return view;
});