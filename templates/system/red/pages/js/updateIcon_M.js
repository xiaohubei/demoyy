var update = {};
update.cartIcon = function(){
	var proxy = cb.rest.DynamicProxy.create({
		getCartLists: {
			url: 'client/ShoppingCarts/getCartList',
			method: 'GET',
			options: {
				token: true,
				autoLogin: false
			}
		}
	});
	proxy.getCartLists(function(err, result) {
		if (err) {
			$$('.shoppingCartCount').hide();
			return;
		}
		// 底部导航栏目购物车的数量图标
		$$('.shoppingCartCount').text(result.lsCart.length);
		$$('.shoppingCartCount').show().removeClass('hide');
	});
}