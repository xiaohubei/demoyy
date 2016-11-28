cb.views.register('DetailViewController', function(controllerName) {
	var view = function(views) {
		cb.views.BaseView.call(this, views);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.initFlag = false;
	view.prototype.proxy = cb.rest.DynamicProxy.create({
		//获取商品信息
		getData: {url: 'client/Products/index',method: 'GET',options: {token: true}},
		getRelatedProductList: {url: 'promotion/CombinationSalesService/getRelatedProductList',method: 'get',},
		//获取商品信息
		getProductsByIds: {url: 'client/Products/getProductsByIds',method: 'POST',},
		//添加购物车
		addcart: {url: 'client/ShoppingCarts/addCarts',method: 'post',options: {token: true,autoLogin: true,mask:true}},
		nowToOrder: {url: 'client/ShoppingCarts/orderNow',method: 'post',options: {token: true,autoLogin: true,mask:true}},
		//获取商品评价及咨询  只不过是参数不一样
		getconsulting: {url: 'member/Comments/query',method: 'get',options: {token: true}},
		saveConsulting: {url: 'member/Comments/save',method: 'post',options: {token: true}},
		// 获取好评、中评、差评率
		getProductEvaluate: {url: 'member/Comments/getProductEvaluate',method: 'get',options: {token: true}},
		addProductFavorite: {url: 'client/ProductFavorites/addProductFavorite',method: 'POST',options: {token: true}},
		getProductFavorites: {url: 'client/ProductFavorites/getProductFavorites',method: 'POST',options: {token: true}},
		//获取组合销售数据
		getCombinSaleList: {url: 'promotion/CombinationSalesService/getCombinSaleList',method: 'POST',options: {token: true,autoLogin: false}},
		goTOSettle: {url: 'client/Orders/GenerateOrderByShoppingCart',method: 'POST',options: {token: true,mask:true}}
	});
	view.prototype.init = function (views) {
		this.loginLogout();
		view.prototype.initFlag = false;
	    cb.rest.ContextBuilder.promotion();
		var queryString = new cb.util.queryString();
		var goods_id = queryString.get("goods_id");
		this.goods_id = goods_id;
		this.proxy.getData({
			id: goods_id
		}, function (error, result) {
			if (error) {
				ModalTip({
					message: "获取商品详情失败:" + error
				}, this);
				return;
			};
			if (result) {
                // 隐藏商品参数
			    if (result.lsProductParameters.length == 0) {
			        $('.productParameter').hide();
			    } else {
			        $('.productParameter').show();
			    }
				if (result.canPurchaseCount <= 0) {
					result.canPurchaseCount = 0;
				}
				if (result.promotion) { //存在促销活动时 分为两种：首件优惠和限购 不限购
					var quan;
					if (result.canPurchaseCount == 0) {
						quan = 0;
						for (var i = 0; i < result.lsProductSkus.length; i++) {
							if (quan < result.lsProductSkus[i].lInventoryCount) {
								result.lsProductSkus[i].lInventoryCount = quan;
							}
						}
					} else if (result.canPurchaseCount) {
						quan = result.canPurchaseCount;
						for (var i = 0; i < result.lsProductSkus.length; i++) {
							if (quan < result.lsProductSkus[i].lInventoryCount) {
								result.lsProductSkus[i].lInventoryCount = quan;
							}
						}
					}
				}
				this.productInfo = result;
				//渲染商品详情
				this.dealProductDetail(result);
				//显示商品评价
				this.dealProductEvaluate(goods_id);
				//商品描述
				this.dealProductDescription(result);
				//商品规格选择
				this.dealProductSkus(result);
				//组合销售
				if (result.iStatus == 1) { //商品如果下架就不要显示组合销售  没有任何意义
					this.dealCombineSale(result);
				}
			};
		}, this);
	};
	view.prototype.dealProductDetail = function (result) {
		if(result.productAttribute == 2){
			result.fSalePrice = result.salePoints;
		}
		$('#product-detail').data("itemData", result);
		var html = this.render($('#detail_productDetail').html(), {
			list: result
		});
		$('#product-detail').html(html);
		//单独处理sku选择
		var skuHtml = this.render($('#detail_skus').html(), {
			list: result
		}, false);
		$('#skus-select').html(skuHtml);
		if(result.isDisplayPrice == false){
			$('.goodsprice').html(result.priceAreaMessage);
			$('.mktprice1').css({'display':'none'});
			$('.cart').css({'display':'none'});
			$('.now-order').css({'display':'none'});
		}
	};
	view.prototype.dealProductDescription = function(result) {
		//处理商品描述 闪频扩展属性
		var data = {
			common: {
				brand_name: '无',
				cCode: result.cCode,
				cName: result.cName,
				dOnSaleTime: result.dOnSaleTime
			},
			lsProductProps: result.lsProductProps
		}
		if (result.brand && result.brand.brand_name) {
			data.common.brand_name = result.brand.brand_name;
		}
		if (data.common.dOnSaleTime) {
			data.common.dOnSaleTime = data.common.dOnSaleTime.split('.')[0];
		} else {
			data.common.dOnSaleTime = '暂无上架时间';
		}
		var html = this.render($('.extendattrsTpl').html(), {
			data: data
		});
		var $extendAttrs = $('.product-details').find('.extend-attributy');
		$extendAttrs.html(html);
		if ($('.product-details .hideAttr').length > 0) {
			$('.product-details .hideAttr').hide();
		}
		$('.product-details .moreAttrs').on('click', function() {
			$('.product-details .hideAttr').toggle();
			var inner = $(this).html();
			if (inner == '更多参数') {
				$(this).html('收起参数');
			} else {
				$(this).html('更多参数');
			}
		});
		$('.product-details').find("#cDescription").html(result.oProductSub.cDescription);
	};
	view.prototype.dealProductEvaluate = function(id) {
		this.proxy.getProductEvaluate({
			productID: id
		}, function(err, result) {
			if (err) {
				alert(err);
			} else {
				if (!result) {
					//当前商品暂无评价 直接显示即可 因为初始状态就是无数据显示模式
					$('.product-details').find('.percent dl:eq(1)').find('.d1 div').css('width', '0');
					$('.product-details').find('.percent dl:eq(2)').find('.d1 div').css('width', '0');
					$('.evaluationQuantities1').html(0);
					$('.coment_nav').show();
					$('#i-comment').show();
				} else {
					//有评价 要把comment_nav上的评论条数显示出来
					$('.product-details').find('.percentValue').html(result.starLevelRate3);
					var dl = $('.product-details').find('.percent dl');
					for (var i = 0; i < dl.length; i++) {
						var span, width;
						switch (i) {
							case 0: //好评
								span = "(" + result.starLevelRate3 + "%)";
								width = result.starLevelRate3 + '%';
								break;
							case 1: //好评
								span = "(" + result.starLevelRate2 + "%)";
								width = result.starLevelRate2 + '%';
								break;
							case 2: //好评
								span = "(" + result.starLevelRate1 + "%)";
								width = result.starLevelRate1 + '%';
								break;
						}
						$('.product-details').find('.percent dl:eq(' + i + ")").find('dt span').html(span);
						$('.product-details').find('.percent dl:eq(' + i + ")").find('.d1 div').css('width', width);
						$('.star' + (i + 1)).html('(' + result['starLevel' + (i + 1)] + ')');
					}
					$('#i-comment,.coment_nav').show();
					$('.allComments').html('(' + result.allCount + ')');
					$('.evaluationQuantities1').html(result.allCount);
				}
			}
		}, this);
	};
	view.prototype.dealProductSkus = function (result) {
		var isPoniterProduct =result.productAttribute;
		var skus = result.lsProductSkus;
		var skuResult = this.initSKU(skus,isPoniterProduct);
		if(isPoniterProduct == 2)
			$('#product-detail').find('.now-order span').html('立即兑换');
		if (result.iStatus == 0) {
			//商品下架
			this.resetProp(skuResult[""], result,isPoniterProduct);
			this.register(result);
			$('#product-detail .detaill-select ').html('此商品已下架');
		} else {
			//商品没下架，商品没有规格
			if (skus.length == 1 && skus[0].cSpecIds == "") {
				this.resetProp(skuResult[""], result,isPoniterProduct);
				this.register(result);
				return;
			} else {
				//商品有规格
				$('#product-detail').find('span[data-lsspecitem]').each(function() {
					var self = $(this);
					var specid = self.attr('data-lsspecitem');
					//if (!skuResult[specid])
						self.attr('disabled', 'disabled');
				}).click(this, function(e) {
					var len;
					var self = $(this);
					if (self.attr('disabled') == 'disabled') return;
					self.siblings().removeClass('active');
					self.toggleClass('active');
					var selectedspecs = $('#product-detail').find('span[data-lsspecitem].active');
					var selectedids = [];
					selectedspecs.each(function() {
						selectedids.push($(this).attr('data-lsspecitem'));
					});
					selectedids.sort(function(val1, val2) {
						return parseInt(val1) - parseInt(val2);
					});
					if (selectedspecs.length) {
						e.data.itemsIds = selectedids;
						e.data.resetProp(skuResult[selectedids.join(';')], result,isPoniterProduct);
						e.data.mainProductInfo = {
							sku: skuResult[selectedids.join(';')],
							isSpecs: selectedids
						};
						if (e.data.mainProductInfo.sku.prices && e.data.mainProductInfo.sku.prices.length) {
							if(result.isDisplayPrice == false){
								$('.goodsprice').html(result.priceAreaMessage);
								$('.mktprice1').css({'display':'none'});
								$('.goodsprice').html(result.priceAreaMessage);
								$('.mktprice1').css({'display':'none'});
								$('.cart').css({'display':'none'});
								$('.now-order').css({'display':'none'});
							}else{
								if(isPoniterProduct == 2)
						    		$('.goodsprice').text(parseFloat(e.data.mainProductInfo.sku.prices[0])+'积分');			
						    	else
						    		$('.goodsprice').text("￥" + parseFloat(e.data.mainProductInfo.sku.prices[0]).toFixed(2));
							}
						}
						if (e.data.mainProductInfo.sku.markPrices[0] && e.data.mainProductInfo.sku.markPrices.length) {
						    $('.mktprice1').text("￥" + parseFloat(e.data.mainProductInfo.sku.markPrices[0]).toFixed(2));
						}else{
							$('.mktprice1').text('');
						}
						var data_id = $('.recommend-styles li.active').attr('data-id');
						if (data_id) {
							var this_ul = $("ul.recommend-others[data-id=" + data_id + "]");
							e.data.recommendShow(this_ul, data_id);
						}
						len = selectedids.length;
					} else {
						$('#product-detail').find('.cart,.now-order').attr('disabled', true);
						if ($('#addtoShoppingCart').length > 0) {
							$('#addtoShoppingCart,#addtoShoppingCart span').attr('disabled', true);
						}
						//当所有的的规格项取消时 所有的参数设置成商品属性
						var picturesArray = result.lsAlbums;
						var html = e.data.render($('#detail_thumbnail').html(), {
							data: picturesArray
						});
						$('.detail_piTthumbnail').html(html);
						e.data.regiesterThumnail(picturesArray.length);
						$('.detail_piTthumbnail img:eq(0)').trigger('mouseover');
						if(isPoniterProduct == 2){
							$('#product-detail .curr-price em').html(result.salePoints+'积分'); //积分商品当前价格
						}else{
							$('#product-detail .curr-price em').html('￥' + result.fSalePrice.toFixed(2)); //当前价格
							$('#product-detail .curr-price del').html('￥' + (result.fMarkPrice.toFixed(2)));
						}				
						var data_id = $('.recommend-styles li.active').attr('data-id');
						if (data_id) {
							var this_ul = $("ul.recommend-others[data-id=" + data_id + "]");
							e.data.recommendShow(this_ul, data_id, result.fSalePrice.toFixed(2));
						}
						e.data.mainProductInfo.isSpecs = [];
					}
					//处理当前选中项无法匹配的其他规格项
					$('#product-detail').find('span[data-lsspecitem]').not(selectedspecs).not(self).each(function() {
						var siblingsselectedspec = $(this).siblings('.active');
						var testspecids = [];
						if (siblingsselectedspec.length) {
							var siblingsselectedid = siblingsselectedspec.attr('data-lsspecitem');
							for (var i = 0; i < len; i++) {
								(selectedids[i] != siblingsselectedid) && testspecids.push(selectedids[i]);
							}
						} else {
							testspecids = selectedids.concat();
						}
						testspecids = testspecids.concat($(this).attr('data-lsspecitem'));
						testspecids.sort(function(val1, val2) {
							return parseInt(val1) - parseInt(val2);
						});
						if (!skuResult[testspecids.join(';')]) {
							$(this).attr('disabled', 'disabled').removeClass('active');
						} else {
							$(this).removeAttr('disabled');
						}
					});
				});
				var isspecsIds = result.lsProductSkus[0].cSpecIds.split(';');
				for (var i = 0; i < isspecsIds.length; i++) {
					$('#product-detail').find('span[data-lsspecitem=' + isspecsIds[i] + ']').trigger('click');
				};
				if(result.isDisplayPrice == false){
					$('.goodsprice').html(result.priceAreaMessage);
					$('.mktprice1').css({'display':'none'});
					$('.cart').css({'display':'none'});
					$('.now-order').css({'display':'none'});
				}
				this.register(result);
			}
		}
	};
	view.prototype.dealCombineSale = function(data) {
		var _this = this;
		//组合销售逻辑部分
		var mergeProxy = cb.rest.MergeProxy.create();
		mergeProxy.add([{
			url: 'promotion/CombinationSalesService/getCombinSaleList',
			method: 'POST',
			options: {
				token: true,
				autoLogin: false
			}
		}, {
			url: 'promotion/CombinationSalesService/getRelatedProductList',
			method: 'get',
			options: {
			    token: true,
			    autoLogin: false
			}
		}], [{
			param: {
				productId: _this.goods_id
			}
		}, {
			productId: _this.goods_id
		}]);
		mergeProxy.submit(function (err, result) {
			if (result) {
				var $ulbox = $('.product-recommend');
				var $combile = $ulbox.find('ul li:eq(0)');
				var $related = $ulbox.find('ul li:eq(1)');
				if (result[0].data.combinSales&&result[0].data.combinSales.length > 0) {
					//组合销售有数据
					$ulbox.removeClass('hide');
					$combile.removeClass('hide').addClass('coment_navOnHover');
					result[0].data.combinSales.mainProduct = _this.productInfo;
					_this.combineSalesInfo = result[0].data.combinSales;
					_this.CombineSale = {
							data: data,
							result: result[0].data
						}
						//渲染组合销售
					var html = _this.render($('#combineSaleTpl').html(), {
						data: result[0].data.combinSales
					}, false);
					$('.product-recommend').show();
					$('.panes-first').html(html).show();
					$('.panes-first').show();
					var $cart = $('#product-detail').find('.cart');
					$('#addtoShoppingCart,#addtoShoppingCart span').attr('disabled', $cart.attr('disabled'));
					//组合销售套餐选择
					_this.selectCombineIndex = 0;
					$('.recommend-styles li').each(function(index) {
						$(this).click(function(e) {
							_this.selectCombineIndex = index;
							var data_id = e.target.attributes['data-id'].value;
							_this.recommendPackgeId = data_id;
							$('.recommend-styles li').removeClass("active");
							$(this).addClass("active");
							$('ul.recommend-others').hide();
							var $ul_recommend = $("ul.recommend-others[data-id=" + data_id + "]");
							$ul_recommend.show();
							_this.recommendShow($ul_recommend, data_id);
						})
					});
					$('.recommend-styles li:eq(0)').trigger('click');
					//组合销售套餐商品选择
					$('.panes-first  .recommendothers-box input[type=checkbox]').on('click', function(e) {
						var data_id = $('.recommend-styles li.active').attr('data-id');
						var $ul_recommend = $("ul.recommend-others[data-id=" + data_id + "]");
						_this.recommendShow($ul_recommend, data_id);
					});
					//组合销售套餐商品添加到购物车
					$('#addtoShoppingCart').on('click', this, function(e) {
						if ($(this).attr('disabled')) return;
						var getSelectProductId = function() {
							var selectIds = [];
							var allCombinSales = $('.panes-first  .recommendothers-box ul').eq(_this.selectCombineIndex).find("input[type=checkbox]");
							allCombinSales.each(function() {
								if (this.checked) {
									selectIds.push(parseFloat($(this).attr('data-id')));
								}
							})
							return selectIds;
						};
						var getSelectCombineSaleIds = function() {
								var ids = []
								var data = _this.combineSalesInfo[_this.selectCombineIndex].combinProducts;
								for (var i = 0; i < data.length; i++) {
									ids.push(data[i].productId);
								};
								return ids;
							}
							//获取已经选择组合套餐被选择商品的ids
						var selectedProductId = getSelectProductId();
						//获取已经选择组合套餐所有商品id
						var selectedCombineId = getSelectCombineSaleIds();
						//获取选择套餐所有商品信息
						_this.proxy.getProductsByIds({
							ids: selectedCombineId,
							packageId: $('.recommend-styles li.active').attr('data-id')
						}, function(err, result) {
							if (err) {
								ModalTip({
									message: err
								}, _this);
								return;
							};
							var newResult = [_this.productInfo].concat(result);
							_this.allResult = newResult; //加入购物车失败后 加入本地缓存中使用
							var htmlBody = _this.render($('#modalTpl').html(), {
								data: newResult
							}, false);
							$("#myModal .modal-content").html(htmlBody);
							//处理用户交互的信息
							//处理头部勾选
							var productCheckbox = $("#myModal .modal-header input[type=checkbox]");
							for (var i = 0; i < selectedProductId.length; i++) {
								productCheckbox.each(function(index) {
									if ($("#myModal .modal-header input[type=checkbox]:eq(" + index + ")").attr('data-id') == selectedProductId[i]) {
										$("#myModal .modal-header input[type=checkbox]")[index].checked = 'checked';
									}
								});
							};
							//处理勾选商品skus显示
							var chooseCombineProduct = function() {
								productCheckbox.each(function(index) {
									var $selected_input = $("#myModal .modal-header input[type=checkbox]:eq(" + index + ")");
									var $showblock = $("#myModal .modal-body li.detaill-select:eq(" + index + ")");
									if ($selected_input.prop('checked')) {
										$showblock.addClass('haveShow').show();
									} else {
										$showblock.removeClass('haveShow').hide();
									}
									var $detaill_select = $('#myModal').find('li.haveShow');
									for (var i = 0; i < $detaill_select.length; i++) {
										if (i % 2 == 0) {
											$detaill_select[i].style.clear = 'left';
										} else {
											$detaill_select[i].style.clear = 'none';
										}
									};
								});
							};
							$("#myModal .modal-body li.detaill-select:eq(0)").addClass('haveShow').show();
							_this.dealCombineSkus(newResult);
							chooseCombineProduct();
							_this.judgeSituation();
							$('#myModal').modal('show');
							//每次勾选商品时触发
							productCheckbox.click(function(e) {
								chooseCombineProduct();
								_this.judgeSituation();
							});
						})
					});
					if (result[1].data.relatedProduct.length > 0) {
						$related.removeClass('hide');
						var html=_this.render($('#relatedTPL').html(),{data:result[1].data.relatedProduct});
						$('.panes-seconds').html(html).hide();
						$('.panes-seconds .recommend-styles li').click(function(){
							var id=$(this).attr('data-id');
							$('.panes-seconds .related-ul').addClass('hide');
							$('.panes-seconds .related-ul[data-id='+id+']').removeClass('hide');
							$('.panes-seconds .recommend-styles li').removeClass('active');
							$(this).addClass('active');
						});
					}
				}
				else if (result[1].data.relatedProduct.length > 0) {
					// 没有组合销售 只有相关商品
					$ulbox.removeClass('hide');
					$('.panes-first').hide();
					$related.removeClass('hide').addClass('coment_navOnHover');
					var html = _this.render($('#relatedTPL').html(), { data: result[1].data.relatedProduct });
					$('.panes-seconds').html(html);
					$('.panes-seconds .recommend-styles li').click(function(){
						var id=$(this).attr('data-id');
						$('.panes-seconds .related-ul').addClass('hide');
						$('.panes-seconds .related-ul[data-id='+id+']').removeClass('hide');
						$('.panes-seconds .recommend-styles li').removeClass('active');
						$(this).addClass('active');
					});
				} 
				else {
					//均没有
				}
			} 
			else {
				alert(err.message);
			}

		});
	}
	view.prototype.dealCombineSkus = function(result) {
		var _this = this;
		//初始化sku
		var newSkus = [];
		//组合销售暂时没有下架情况
		for (var i = 0; i < result.length; i++) {
			if (result[i].iStatus == 0) {
				//商品下架
			} else {
				var skus = result[i].lsProductSkus;
				var skuResult = this.initSKU(skus);
				$selectedLi = $('li.detaill-select[data-id=' + result[i].id + ']');
				//商品没下架，商品没有规格
				if (skus.length == 1 && skus[0].cSpecIds == "") {
					var realSku = skuResult[''];
					if (realSku.count < 1) { //没有库存时 显示库存量 但是不能skuid设置为null;
						$selectedLi.data('skuid', null);
					} else {
						$selectedLi.data('skuid', realSku.ids[0]);
					}
					$selectedLi.find('.combineSaleCount').html(realSku.count);
					//因为当商品没有规格时 渲染模板时数据就是正确的
					$selectedLi.data('realSku', realSku);
				} else {
					//商品有规格
					var $productSkus = $selectedLi.find('.combineSaleSpecs').find('span[data-lsspecitem]');
					$selectedLi.data('skuResult', skuResult);
					$selectedLi.data('result', result[i]);
					$productSkus.each(function() {
						var self = $(this);
						var specid = self.attr('data-lsspecitem');
						if (!skuResult[specid])
							self.attr('disabled', 'disabled');
					}).click(this, function(e) {
					    $li_selected = $(this).closest('li.detaill-select');
						var skuResult = $li_selected.data('skuResult'); //规格项与skuid对应
						var productResult = $li_selected.data('result'); //当前商品信息
						var self = $(this);
						if (self.attr('disabled') == 'disabled') return;
						self.siblings().removeClass('active');
						self.toggleClass('active');
						var selectedspecs = self.closest('.combineSaleSpecs').find('span[data-lsspecitem].active');
						var selectedids = [];
						selectedspecs.each(function() {
							selectedids.push($(this).attr('data-lsspecitem'));
						});
						selectedids.sort(function(val1, val2) {
							return parseInt(val1) - parseInt(val2);
						});
						var len = selectedspecs.length;
						var skuDetail = skuResult[selectedids.join(';')];
						if (len == 0) { //全不选
							$li_selected.data('skuid', null);
							$li_selected.find('.combineSaleCount').html(productResult.lInventoryCount);
							$li_selected.find('.productPriceP span').html(productResult.fSalePrice.toFixed(2));
							if (productResult.fMarkPrice) {
							    $li_selected.find('.productPriceP del').html(productResult.fMarkPrice.toFixed(2));
							}
							
							$li_selected.data('realSku', {
								count: productResult.lInventoryCount,
								prices: [productResult.fSalePrice],
								markPrices: [productResult.fMarkPrice]
							});
						} else { //当前为每个规格都有选中状态  即对应的是完整的sku
							if (skuDetail.count < 1 || len < productResult.lsSpecs.length) { //没有库存时
								$li_selected.data('skuid', null);
							} else {
								$li_selected.data('skuid', skuDetail.ids[0]);
							}
							$li_selected.data('realSku', skuDetail);
							$li_selected.find('.combineSaleCount').html(skuDetail.count);
							$li_selected.find('.productPriceP span').html(skuDetail.prices[0].toFixed(2));
							if (skuDetail.markPrices[0]) {
							    $li_selected.find('.productPriceP del').html(skuDetail.markPrices[0].toFixed(2));
							}
							
						}
						e.data.judgeSituation();
						//处理当前选中项无法匹配的其他规格项
						$(this).closest('.combineSaleSpecs').find('span[data-lsspecitem]').not(selectedspecs).not(self).each(function() {
							var siblingsselectedspec = $(this).siblings('.active');
							var testspecids = [];
							if (siblingsselectedspec.length) {
								var siblingsselectedid = siblingsselectedspec.attr('data-lsspecitem');
								for (var i = 0; i < len; i++) {
									(selectedids[i] != siblingsselectedid) && testspecids.push(selectedids[i]);
								}
							} else {
								testspecids = selectedids.concat();
							}
							testspecids = testspecids.concat($(this).attr('data-lsspecitem'));
							testspecids.sort(function(val1, val2) {
								return parseInt(val1) - parseInt(val2);
							});
							if (!skuResult[testspecids.join(';')]) {
								$(this).attr('disabled', 'disabled').removeClass('active');
							} else {
								$(this).removeAttr('disabled');
							}
						});						
					});					
					var isspecsIds = result[i].lsProductSkus[0].cSpecIds.split(';');
					if (i == 0) {
						for (var n = 0; n < _this.mainProductInfo.isSpecs.length; n++) {
							$selectedLi.find('span[data-lsspecitem=' + _this.mainProductInfo.isSpecs[n] + ']').trigger('click');
						}
					} else {
						for (var j = 0; j < isspecsIds.length; j++) {
							$selectedLi.find('span[data-lsspecitem=' + isspecsIds[j] + ']').trigger('click');
						};
					}
				}
			}
		}
		$('.modal-footer .btn-ok').click(this, function(e) {
			if ($(this).attr('disabled')) return;
			var nowCount = parseInt($('.modal-footer input').val());
			var kucun = parseInt($('.modal-footer input').data('quantity'));
			if (nowCount <= kucun) {
				var newArr = [];
				var $showLi = $('.detaill-select.haveShow');
				if ($showLi.length == 1) {
					var shoppingcart = {
						"items": [{
							iSKUId: $showLi.data('skuid'),
							iQuantity: nowCount, //这里的数量应该和购买套餐数量保持一致 
							iProductId: parseFloat($showLi.attr('data-id'))
						}]
					};
					e.data.dealAddCart(shoppingcart);
				} else {
					for (var i = 0; i < $showLi.length; i++) {
						$realshowLi = $('.detaill-select.haveShow:eq(' + i + ")");
						var json = {
							"iSKUId": $realshowLi.data('skuid'),
							"iQuantity": nowCount, //默认是1  不能修改
							"iProductId": $realshowLi.attr('data-id'), //商品id
							"lPackageId": e.data.recommendPackgeId, //套餐id
							"iPackageNum": nowCount, //套餐数量一直是1  无效参数
							"bIsMain": false //是否主商品
						};
						if (i == 0) {
							json.bIsMain = true;
						}
						newArr.push(json);
					}
					var _arr = [];
					_arr.push(newArr);
					e.data.dealAddCart({
						items: _arr
					});
				}
			} else {
				alert('当前组合套餐最大购买套数是' + kucun + '套！请修改');
			}
		});
		$('.modal-footer input').keyup(this, function(e) {
			var quantity = $(this).val();
			var re = /^[0-9]*[1-9][0-9]*$/;
			if (quantity != '') {
				if (!(re.test(quantity))) {
					$(this).val(1);
				}
				e.data.judgeSituation(true);
			}
		});
		$('.modal-footer input').blur(this, function(e) {
			var quan = $(this).val();
			if (quan == '') {
				$(this).val(1);
				e.data.judgeSituation(true);
			}
		});
	};
	view.prototype.recommendShow = function($ul_recommend, data_id) {
		var newPrice, savePrice = 0;
		var selectedspecs = $('#product-detail').find('span[data-lsspecitem].active');
		if (selectedspecs.length) {
			newPrice = this.mainProductInfo.sku.prices[0]; //isSpecs
		} else {
			newPrice = this.CombineSale.data.fSalePrice;
		}
		var result = this.CombineSale.result;
		$checked_li = $ul_recommend.find('li.recommend-self div label input:checked');
		var checkedNum = $checked_li.length;
		for (var m = 0; m < checkedNum; m++) {
			for (var i = 0; i < result.combinSales.length; i++) {
				if (data_id == result.combinSales[i].id) {
					var oProduct = result.combinSales[i].combinProducts;
					for (var j = 0; j < oProduct.length; j++) {
						if ($checked_li.get(m).attributes['data-id'].value == oProduct[j].productId) {
							newPrice += oProduct[j].newPrice;
							savePrice += oProduct[j].price - oProduct[j].newPrice;
						}
					}
				}
			}
		};
		$('.recommend-box li.recommend-info .recommendQuantity').html(checkedNum);
		$('.recommend-box li.recommend-info .recommendPrice').html(newPrice.toFixed(2));
		$('.recommend-box li.recommend-info .recommend-save').html(savePrice.toFixed(2));
	}
	view.prototype.judgeSituation = function(setPrice) {
		//1、如果有一个显示出来的skuid是null  则把确认按钮置灰
		var $detaill_select = $('.detaill-select.haveShow');
		var flag = 0;
		if (!setPrice) {
			for (var i = 0; i < $detaill_select.length; i++) {
				var $thisSelect = $('.detaill-select.haveShow:eq(' + i + ')');
				var skuid = $thisSelect.data('skuid');
				if (skuid == null) { //包括库存为零时的情况
					$('.modal-footer .btn-ok,.modal-footer span input').attr('disabled', true);
				} else {
					flag++;
				}
			}
			if (flag == $detaill_select.length) {
				$('.modal-footer .btn-ok,.modal-footer span input').attr('disabled', false);
			}
		}
		var packageInfo = {
			minPrice: 0,
			maxPrice: 0,
			count: [],
			minMarkPrice: 0,
			maxMarkPrice: 0
		}
		var quantity = parseInt($('.modal-footer span input').val());
		for (var i = 0; i < $detaill_select.length; i++) {
			var $thisSelect = $('.detaill-select.haveShow:eq(' + i + ')');
			var realSku = $thisSelect.data('realSku');
			var skuCount = realSku.count;
			var skuPrice = realSku.prices;
			var skuMarkPrice = realSku.markPrices;
			packageInfo.count.push(skuCount);
			if (i > 0) {
				packageInfo.minPrice += Math.min.apply(Math, skuPrice) * quantity;
				packageInfo.maxPrice += Math.max.apply(Math, skuPrice) * quantity;
				packageInfo.minMarkPrice += Math.min.apply(Math, skuMarkPrice) * quantity;
				packageInfo.maxMarkPrice += Math.max.apply(Math, skuMarkPrice) * quantity;
			}
		}
		var promotion = this.productInfo.promotion;
		var mainSku = $('.detaill-select.haveShow:eq(0)').data('realSku');
		var fPrice = packageInfo.minPrice < packageInfo.maxPrice ? packageInfo.minPrice + '-' + packageInfo.maxPrice : packageInfo.maxPrice;
		var fMarkPrice = packageInfo.minMarkPrice < packageInfo.maxMarkPrice ? packageInfo.minMarkPrice + '-' + packageInfo.maxMarkPrice : packageInfo.maxMarkPrice;
		var fSavePrice = (fMarkPrice - fPrice).toFixed(2); //节省金额  当前是因为价格一样 所以直接做减法就行 
		if (promotion && promotion.lType == 0) { //首件优惠
			packageInfo.minPrice += ((quantity - 1) * Math.min.apply(Math, mainSku.markPrices) + Math.min.apply(Math, mainSku.prices));
			packageInfo.maxPrice += ((quantity - 1) * Math.max.apply(Math, mainSku.markPrices) + Math.max.apply(Math, mainSku.prices));
		} else {
			packageInfo.minPrice += Math.min.apply(Math, mainSku.prices) * quantity;
			packageInfo.maxPrice += Math.max.apply(Math, mainSku.prices) * quantity;
		}
		var fPrice = packageInfo.minPrice < packageInfo.maxPrice ? packageInfo.minPrice.toFixed(2) + '-' + packageInfo.maxPrice.toFixed(2) : packageInfo.maxPrice.toFixed(2);
		$('.modal-footer span input').data('quantity', Math.min.apply(Math, packageInfo.count));
		$('.modal-footer .packagePrice').html(fPrice); //因为价格一样 不会有区间形式
		$('.modal-footer .savePrice').html(fSavePrice);
	}
	view.prototype.dealAddCart = function(shoppingcart, isOrder) {
		var goods_id = this.goods_id;
		var items = shoppingcart.items[0];
		//如果items第一个元素为数组 则是组合销售  反之是单个商品加入购物车
		if (items instanceof Array) { //组合销售加入购物车
			this.proxy.addcart({
				items: cb.data.JsonSerializer.serialize([items])
			}, function(err, result) {
				if (result) {
					window.location.href = "cart_added?goods_id=" + goods_id;
				} else {
					var allResult = this.allResult;
					var cartList = JSON.parse(cb.util.localStorage.getItem("cartlist")) || [];
					var guid = this.isInCartList(cartList, items);
					if (guid) { //在购物车缓存中 
						var num = items[0].iQuantity;
						for (var i = 0; i < cartList.length; i++) {
							if (cartList[i] instanceof Array && guid == cartList[i][0].guid) {
								cartList[i] = this.getNewCartInfo(allResult, items, cartList[i]);
							}
						}
					} else {
						cartList.push(this.getNewCartInfo(allResult, items));
					}
					cb.util.localStorage.setItem("cartlist", JSON.stringify(cartList));
					window.location.href = "cart_added?goods_id=" + goods_id;
				}
			}, this);
		} else { //单个商品加入购物车
			var this_result = this.mainProductResult;
			var skuid = items.iSKUId;
			var iQuantity = parseInt(items.iQuantity);
			if (isOrder) {
				this.proxy.nowToOrder({
					item: items
				}, function(err, result) {
					if (err) {
						if (err.code == 900) {
							window.location.href = "login";
						} else {
							alert(err.message);
							return;
						}
					} else {
						//跳转到订单页面
						var shopping = {
							items: [{
								iCorpId: "21",
								iProductId: 324,
								iQuantity: iQuantity,
								iSKUId: skuid,
								id: result
							}]
						}
						this.proxy.goTOSettle(shopping, function(err, result) {
							if (err) {
								alert(err.message);
								return;
							} else {
								if (this_result.isGiftCard) {
									//根据普通商品和礼品卡不同 跳转页面不一致; 现在统一跳转
									window.location.href = "/orderGiftCard";
								} else {
									if(this_result.productAttribute == 2){
										window.location.href = "/orderExchange";
									}else{
										window.location.href = "/order";
									}
									
								}
							}
						});
					}
				}, this);
			} else {
				this.proxy.addcart({
					items: cb.data.JsonSerializer.serialize([items])
				}, function(err, result) {
					if (err) {
						var cartlist = JSON.parse(cb.util.localStorage.getItem("cartlist")) || [];
						var json = {
							Osku: this_result.lsProductSkus.filter(function(item, index, array) {
								return (item.id == skuid);
							}),
							isSpecs: this_result.lsSpecs,
							oDefaultAlbum: this_result.oDefaultAlbum,
							cCode: this_result.cCode,
							cName: this_result.cName,
							iSKUId: skuid,
							iQuantity: items.iQuantity || 1,
						};
						if (this_result.promotion) {
							json.promotion = this_result.promotion;
							if (this_result.canPurchaseCount) {
								json.canPurchaseCount = this_result.canPurchaseCount;
							}
						}
						//如果skuid已经在cartlist中，那么就将对应的item中数量增加并且将信息更新为最新商品信息
						if (cartlist.some(function(item, index, array) {
								return (item.iSKUId == skuid);
							})) {
							cartlist.forEach(function(item, index, array) {
								if (item.iSKUId == skuid) {
									json.iQuantity = parseInt(item.iQuantity) + iQuantity || 1;
									array[index] = json;
								}
							});
						} else {
							cartlist.push(json);
						}
						//shoppingcart.items[0].cName = $('#product-detail').data('itemData').cName;
						cb.util.localStorage.setItem("cartlist", JSON.stringify(cartlist));
						window.location.href = "cart_added?goods_id=" + goods_id;
					} else {
						window.location.href = "cart_added?goods_id=" + goods_id;
					}
				});
			}

		}
	}
	view.prototype.getNewCartInfo = function(allResult, items, oNum) {
		var newarr = [];
		var guid = new Date().valueOf();
		for (var i = 0; i < items.length; i++) {
			var json;
			for (var j = 0; j < allResult.length; j++) {
				if (items[i].iProductId == allResult[j].id) {
					var this_result = allResult[j];
					var skuid = items[i].iSKUId;
					json = {
						Osku: this_result.lsProductSkus.filter(function(item, index, array) {
							return (item.id == skuid);
						}),
						isSpecs: this_result.lsSpecs,
						oDefaultAlbum: this_result.oDefaultAlbum,
						cCode: this_result.cCode,
						cName: this_result.cName,
						iSKUId: skuid,
						iQuantity: items[i].iQuantity,
						lPackageId: items[i].lPackageId,
						iPackageNum: items[i].iPackageNum,
						bIsMain: items[i].bIsMain,
						guid: guid
					};
					if (oNum) {
						for (var m = 0; m < oNum.length; m++) {
							if (skuid == oNum[m].iSKUId) {
								json.iQuantity += parseInt(oNum[m].iQuantity);
								json.iPackageNum += parseInt(oNum[m].iPackageNum);
							}
						}
					}
					if (items[i].bIsMain && allResult[j].promotion) {
						json.promotion = allResult[j].promotion;
						if (allResult[j].canPurchaseCount) {
							json.canPurchaseCount = allResult[j].canPurchaseCount;
						}
					}
					newarr.push(json);
				}
			}
		}
		return newarr;
	}
	view.prototype.isInCartList = function(cartlist, items) {
		var trunValue = false;
		var cartIds = [];
		for (var i = 0; i < cartlist.length; i++) {
			if (cartlist[i] instanceof Array && cartlist[i].length == items.length && cartlist[i][0].lPackageId == items[0].lPackageId) {
				var arr = [];
				for (var j = 0; j < cartlist[i].length; j++) {
					arr.push(cartlist[i][j].iSKUId);
				}
				arr.sort();
				cartIds.push({
					guid: cartlist[i][0].guid,
					ids: arr
				});
			}
		}
		var itemIds = items.map(function(item, index, array) {
			return item.iSKUId
		});
		itemIds.sort();
		for (var i = 0; i < cartIds.length; i++) {
			if (cartIds[i].ids.toString() == itemIds.toString()) {
				trunValue = cartIds[i].guid;
			}
		}
		return trunValue;
	}
	view.prototype.register = function (result) {
		this.mainProductResult = result;
		var goods_id = this.goods_id;
		//数量和库存量比较
		$('#product-detail').find("#iQuantity").on("change", function(e) {
			var reg = new RegExp('^[0-9]*[1-9][0-9]*$'); //正则表达式  用来判断正整数。。。
			if (reg.test($(this).val())) {
				var skuid = $('#product-detail').find('.cart').data('skuid') ? parseFloat($('#product-detail').find('.cart').data('skuid')) : $('#product-detail').find('.cart').data('skuid');
				if (!skuid && !result.lsSpecs.length && !result.lsSpecItemAlbums.length) {
					skuid = result.lsProductSkus[0].id;
				}
				var iQuantity = $("#iQuantity").val() ? parseInt($("#iQuantity").val()) : 0;
				for (var i = 0, len = result.lsProductSkus.length; i < len; i++) {
					if (skuid == result.lsProductSkus[i].id) {
						var uplevel = result.lsProductSkus[i].lInventoryCount;
					}
				}
				if (iQuantity >= uplevel) {
					$(this).val(uplevel);
					$('.quantityAdd').prop('disabled', true);
					$('.quantityReduce').prop('disabled', false);
					return;
				} else {
					$("#iQuantity").css("border", "1px solid rgb(238, 238, 238)");
					$("#iQuantity").parent().children("span").remove();
				}
			} else {
				$(this).val(1);
				$('.quantityAdd').prop('disabled', false);
				$('.quantityReduce').prop('disabled', true);
			}
		});
		//数量加减
		$('.quantityReduce').on('click', this, function(e) {
			if ($(this).prop('disabled')) {} else {
				var quantity = parseInt($('#product-detail').find("#iQuantity").val());
				if (quantity === 2) {
					$(this).prop('disabled', true);
				}
				quantity--
				$('#product-detail').find("#iQuantity").val(quantity);
				$('.quantityAdd').prop('disabled', false);
			}
		});
		$('.quantityAdd').on('click', this, function(e) {
			var quantity = parseInt($('#product-detail').find("#iQuantity").val());
			var skuid = $('#product-detail').find('.cart').data('skuid') ? parseFloat($('#product-detail').find('.cart').data('skuid')) : $('.product-details').find('.cart').data('skuid');
			if (!skuid && !result.lsSpecs.length && !result.lsSpecItemAlbums.length) {
				skuid = result.lsProductSkus[0].id;
			}
			for (var i = 0, len = result.lsProductSkus.length; i < len; i++) {
				if (skuid == result.lsProductSkus[i].id) {
					var uplevel = result.lsProductSkus[i].lInventoryCount;
				}
			}
			if (quantity === parseInt(uplevel) - 1) {
				$(this).prop('disabled', true);
			}
			quantity++;
			$('#product-detail').find("#iQuantity").val(quantity);
			$('.quantityReduce').prop('disabled', false);
		});
		//添加购物车
		$('#product-detail').find('.cart,.now-order').click(this, function(e) {
			if ($(this).attr('disabled') == 'disabled') return;
			var querystring = new cb.util.queryString();
			if ($(this).hasClass('now-order')) {
				var $cart = $(this).prev('.cart');
				var skuid = $cart.data('skuid') ? parseFloat($cart.data('skuid')) : $cart.data('skuid');
			} else {
				var skuid = $(this).data('skuid') ? parseFloat($(this).data('skuid')) : $(this).data('skuid');
			}

			if (!skuid && !result.lsSpecs.length && !result.lsSpecItemAlbums.length) {
				skuid = result.lsProductSkus[0].id;
			}
			var iQuantity = parseFloat($("#iQuantity").val()) || 0
			for (var i = 0, len = result.lsProductSkus.length; i < len; i++) {
				if (skuid == result.lsProductSkus[i].id) {
					var uplevel = result.lsProductSkus[i].lInventoryCount;
				}
			}
			if (iQuantity > uplevel) {
				$("#iQuantity").css("border", "1px solid red");
				if (!$("#iQuantity").parent().children("span").length) {
					$("#iQuantity").parent().append('<span style="color:red;">此商品存货不足!</span>');
				}
				return;
			} else {
				$("#iQuantity").css("border", "1px solid rgb(238, 238, 238)");
				$("#iQuantity").parent().children("span").remove();
			}
			if (iQuantity == 0) {
				$("#iQuantity").css("border", "1px solid red");
				if (!$("#iQuantity").parent().children("span").length) {
					$("#iQuantity").parent().append('<span style="color:red;">此商品数量不能为0!</span>');
				}
				return;
			}
			var shoppingcart = {
				"items": [{
					iSKUId: skuid,
					iQuantity: $("#iQuantity").val() || 0,
					fSalePrice: parseFloat($(".goodsprice").html().substr(1)),
					iProductId: parseFloat(querystring.get("goods_id"))
				}]
			};
			if ($(this).hasClass('now-order')) {
				e.data.dealAddCart(shoppingcart, true);
			} else {
				e.data.dealAddCart(shoppingcart);
			}
		});
		//注册 评论tabs  click事件
		$('.coment_nav ul li').on('click', this, function(e) {
			$('.coment_nav ul li').removeClass('coment_navOnHover');
			$(this).addClass('coment_navOnHover');
			var index = $(this).index();
			var params = {
				type: 2,
				productID: goods_id,
				commentStatus: 0,
				pageIndex: 1,
				pageSize: 10,
				starLevel: 4 - index
			};
			if (index == 0) {
				delete params.starLevel;
			}
			e.data.proxy.getconsulting(params, function(err, result) {
				if (result.models.length == 0) {
					$('.commentsTable').children('.commentItem').remove();
					$('div.detail_noComment').show();
					$('.detail_btnGroup').hide();
				} else {
					var self = this;
					self.dateChangeFormat(result);
					$('div.detail_noComment').hide();
					this.dealCommentSpec(result);
					var html = this.render($('#detail_commentTable').html(), {
						data: result.models
					}, false);
					$('.commentsTable').html(html);
					for (var i = 0; i < result.models.length; i++) {
						var movePX = (result.models[i].iStars - 1) * 20;
						$('.show_star:eq(' + i + ")").css('background-position', '0px ' + (-81 - movePX) + 'px');
					}
					var pages = Math.ceil(result.modelsCount / 10);
					$('.detail_btnGroup').createPage({
						pageCount: pages,
						current: 1,
						unbind: true,
						backFn: function(p) {
							//p就是当前点击页面
							params.pageIndex = p;
							self.proxy.getconsulting(params, function(err, result) {
								self.dateChangeFormat(result);
								self.dealCommentSpec(result);
								var html = self.render($('#detail_commentTable').html(), {
									data: result.models
								}, false);
								$('.commentsTable').html(html);
								for (var i = 0; i < result.models.length; i++) {
									var movePX = (result.models[i].iStars - 1) * 20;
									$('.show_star:eq(' + i + ")").css('background-position', '0px ' + (-81 - movePX) + 'px');
								}
							});
						}
					}, self);
					$('.detail_btnGroup').show();
				}
			}, e.data);
		});
		$('.consulting_nav ul li').on('click', this, function (e) {
			$('.consulting_nav ul li').removeClass('coment_navOnHover');
			$(this).addClass('coment_navOnHover');
			var type;
			var index = $(this).index();
			switch (index) {
				case 0:
					type = 1;
					break;
				case 1:
					type = 11;
					break;
				case 2:
					type = 12;
					break;
				case 3:
					type = 13;
					break;
			}
			var param = {
				productID: goods_id,
				type: type,
				commentStatus: 0,
				pageIndex: 1,
			    isShowReply:false,
				pageSize: 10
			};
			e.data.getconsulting(param);
		});
		//tab页签激活评论状态
		$('.product-details').find('.clearfix .nav-tabs li').on('click', this, function(e) {
			var index = $(this).index();
			if (index == 0) {
				//商品详情页签激活
			} else if (index == 1) {
				var data = result.lsProductParameters;
				if (data.length == 0) {
				    $('.productParameter').hide();
					//$('.parameter-detailP').html('此商品暂无详细参数');
				} else {
				    $('.productParameter').show();
					var html = e.data.render($('#detail-params').html(), {
						data: data
					}, false);
					$('.parameter-detail').html(html);
				}
			} else if (index == 2) {
				//全部评论加载
				$('.coment_nav ul li:eq(0)').trigger('click');
			} else {
				$('.consulting_nav ul li:eq(0)').trigger('click');
			}
		});
		$('#publishedConsulting input[type=radio]').on('click', function() {
			$('.radioError').hide();
		});
		$('#publishedConsulting textarea').on('focus', function() {
			$('.textareaError').hide();
			$(this).css('color', '#000');
		});
		$('#publishedConsulting button').on('click', this, function(e) {
			if ($('#publishedConsulting input[type=radio]:checked').length == 0) {
				$('#publishedConsulting .radioError').show();
			} else {
				if ($('#publishedConsulting textarea').val() == '') {
					$('#publishedConsulting .textareaError').show();
				} else {
					//提交即可
					var content = $('#publishedConsulting textarea').val();
					var type = $('#publishedConsulting input[type=radio]:checked').val();
					//type: 1=>>商品咨询  2=>>配送咨询   3=>>售后咨询  
					switch (type) {
						case '1':
							type = 11;
							break;
						case '2':
							type = 12;
							break;
						case '3':
							type = 13;
							break;
					}
					var param = {
						model: {
							iType: type,
							iProduct_Id: goods_id,
							cComment: content
						}
					};
					e.data.proxy.saveConsulting(param, function(err, result) {
						if (result) { //保存成功
							alert('发表成功');
							$('#publishedConsulting input[type=radio]').prop('checked', false);
							$('#publishedConsulting textarea').val('');
						} else {
							alert(err);
						}
					});
				}
			}
		});
		$('.searchBtn').on('click', this, function (e) {
			var keyWord = $(this).prev('input').val();
			if (keyWord == '') {
				//$(this).prev('input').css('borderColor','red');
				alert('请输入要查询的关键字');
			} else {
				var param = {
					productID: goods_id,
					keyWord: keyWord,
					type: 1,
					commentStatus: 0,
				    isShowReply:false,
					pageIndex: 1,
					pageSize: 10
				};
				e.data.getconsulting(param);
			}
		});
		// 收藏商品
		$('.collect span').on('click', this, function(e) {
			var token = cb.rest.AppContext.token;
			e.data.proxy.addProductFavorite({
				ids: [goods_id]
			}, function(err, data) {
				if (err) {
					alert(err.message);
					return;
				} else {
					alert('收藏成功');
				}
			});
		});
		$('.evaluationQuantities').on('click', this, function(e) {
			$('.clearfix .nav-tabs li,.tab-content .tab-pane').removeClass('active');
			$('.product-details').find('.clearfix .nav-tabs li:eq(2)').trigger('click').addClass('active');
			$('.product-details  .tab-content .tab-pane:eq(2)').addClass('active');
		});
		$('.promotion-arrow').on('click', this, function(e) {
			var $promotion = $(this).closest('div').find('.promotionTips');
			$('.promotionTips').not($promotion).hide();
			$promotion.toggle();
			$(this).css('display', 'inline-block');
		});
		$('.our-activity').on('click', this, function(e) {
			$(this).next('div').show();
		});
		$('.activity-detail .unmore').on('click', this, function() {
			$(this).parents('.activity-detail').hide();
		});
		$('.product-recommend .nav-first li').click(function(){
			if($(this).hasClass('coment_navOnHover')){
				return;
			}else{
				var index=$(this).index();
				$('.product-recommend .nav-first li').removeClass('coment_navOnHover')
			    $(this).addClass('coment_navOnHover');
			    if(index==0){
			    	$('.panes-first').show();
			    	$('.panes-seconds').hide();

			    }else{
			    	$('.panes-first').hide();
			    	$('.panes-seconds').show();
			    }
			}
		});
	};
	view.prototype.regiesterThumnail = function (length) { //轮播图处理逻辑
	    var this_length = length;
		var index = 5; //这里是正常情况下显示五张图片
		$('.detail_piTthumbnail img').mouseover(function () {
			$('.detail_piTthumbnail img').css({
				border: "2px solid white"
			});
			$(this).css({
				border: "2px solid #e4393c"
			});
			$('.detailBigImg  img').attr('src', $(this).attr('data-bigimage'));
		});
		$('.arrow_left').off('click');
		$('.arrow_left').on('click', this, function(e) {
			//判断停止条件
			if (this_length <= 5) {} else {
				if (index == 5) {} else {
					$('.detail_piTthumbnail ul').animate({
						right: '-=82px'
					}); //移动一张图片的宽度  73就是图片宽度
					index--;
				}
			}
		});
		$('.arrow_right').off('click')
		$('.arrow_right').on('click', this, function(e) {
			//判断停止条件
			if (this_length <= 5) {} else {
				if (index == this_length) {} else {
					$('.detail_piTthumbnail ul').animate({
						right: '+=82px'
					});
					index++;
				}
			}
		});
	}
	view.prototype.resetProp = function (sku, result,isPoniterProduct) {
		//----一下是对商品图册数组进行处理
		var itemsIds = this.itemsIds || [];
		var picturesArray = [];
		if (result.lsSpecItemAlbums.length > 0) { //对result中规格图片（及缩略图）进行处理
			for (var i = 0; i < itemsIds.length; i++) {
				for (var j = 0; j < result.lsSpecItemAlbums.length; j++) {
					if (itemsIds[i] == result.lsSpecItemAlbums[j].iSpecItemId) {
						picturesArray.push(result.lsSpecItemAlbums[j]);
					}
				}
			}
		}
		if (picturesArray.length == 0) {
			picturesArray = result.lsAlbums;
		}
		picturesArray.forEach(function(item){
			item.cName=result.cName;
		})
		var html = this.render($('#detail_thumbnail').html(), {
			data: picturesArray
		});
		$('.detail_piTthumbnail').html(html);
		this.regiesterThumnail(picturesArray.length);
		$('.detail_piTthumbnail img:eq(0)').trigger('mouseover');
		//------商品缩略图处理完成   end   

		//----下面是分情况处理  
		//1、当商品下架后  就不要走后面的逻辑了  
		if (result.iStatus == 0) {
			return;
		} else {			
			var maxPrice = Math.max.apply(Math, sku.prices).toFixed(2);
			var minPrice = Math.min.apply(Math, sku.prices).toFixed(2);		
			var code = sku.codes.length ? sku.codes[0] : '';
			var maxMarkPrice = Math.max.apply(Math, sku.markPrices);
			var minMarkPrice = Math.min.apply(Math, sku.markPrices);
			var markPrice = '￥' + (maxMarkPrice > minMarkPrice ? minMarkPrice + '-' + maxMarkPrice : maxMarkPrice);
			if(isPoniterProduct ==2){
				var maxPrice = Math.max.apply(Math, sku.prices);
				var minPrice = Math.min.apply(Math, sku.prices);	
				var price = (maxPrice > minPrice ? minPrice + '-' + maxPrice : maxPrice)+'积分';
				$('.mktprice1').hide();
			}else{
				var price = '￥' + (maxPrice > minPrice ? minPrice + '-' + maxPrice : maxPrice);
			}
			//var reducePrice = '￥' + (maxMarkPrice - maxPrice);
			if(result.isDisplayPrice == false){
				$('.goodsprice').html(result.priceAreaMessage);
				$('.mktprice1').css({'display':'none'});
				$('.cart').css({'display':'none'});
				$('.now-order').css({'display':'none'});
			}else{
				$('#product-detail .curr-price em.goodsprice').html(price); //销售价格
				$('#product-detail .curr-price del').html(markPrice); //市场价格	
			}					
			//$('.evaluationQuantities1').html(this.allCount);
			var $cart = $('#product-detail').find('.cart');
			var $nowOrder = $('#product-detail').find('.now-order');
			var $quantity = $('#iQuantity');
			$('.quantityReduce,.quantityAdd').prop('disabled', true);
			$quantity.val(1);
			var selectedspecs = $('#product-detail').find('span[data-lsspecitem].active');
			var len = selectedspecs.length;
			if (len == result.lsSpecs.length) {
				if (sku.count > 0) {
					if ($('#addtoShoppingCart').length > 0) {
						$('#addtoShoppingCart,#addtoShoppingCart span').attr('disabled', false);
					}
					$cart.removeAttr('disabled');
					$nowOrder.removeAttr('disabled');
					$quantity.removeAttr('disabled');
					$('.errorInventory').html('').hide();
					if (sku.count > 1) {
						$('.quantityAdd').prop('disabled', false);
					}
				} else {
					$cart.attr('disabled', 'disabled');
					$nowOrder.attr('disabled', 'disabled');
					$quantity.attr('disabled', 'disabled');
					if ($('#addtoShoppingCart').length > 0) {
						$('#addtoShoppingCart,#addtoShoppingCart span').attr('disabled', true);
					}
					$('.errorInventory').html(sku.promptMsgs[0]).show();
				}
				$('.quantityItem').show();
			} else {
				$('.quantityItem').hide();
				$('#product-detail').find('.cart,.now-order').attr('disabled', true);
				if ($('#addtoShoppingCart').length > 0) {
					$('#addtoShoppingCart,#addtoShoppingCart span').attr('disabled', true);
				}
			}
			$('.kucun').html(sku.count);
			$('.kucunTips').html(sku.promptMsgs);
			var id = sku.ids.length ? sku.ids[0] : '';
			$cart.data('skuid', id);
		}		
	};
	view.prototype.initSKU = function(data,isPoniterProduct) {
		var SKUResult = {};
		if (data.length === 1 && data[0].cSpecIds === '') {
			this.constructSKU(SKUResult, "", data[0],isPoniterProduct);
			return SKUResult;
		}
		data.forEach(function(sku) {
			var skuKey = sku.cSpecIds;
			var skuKeyAttrs = skuKey.split(';');
			skuKeyAttrs.sort(function(val1, val2) {
				return parseInt(val1) - parseInt(val2);
			});
			// 对每个SKU信息key属性值进行拆分组合
			var combArr = this.arrayCombine(skuKeyAttrs);
			combArr.forEach(function(item) {
				var key = item.join(';');
				this.constructSKU(SKUResult, key, sku,isPoniterProduct);
			}, this);
			this.constructSKU(SKUResult, skuKeyAttrs.join(';'), sku,isPoniterProduct);
		}, this);
		return SKUResult;
	};
	view.prototype.constructSKU = function(SKUResult, key, sku,isPoniterProduct) {
		if(isPoniterProduct ==2){
			sku.fSalePrice = sku.salePoints;
		}
		if (SKUResult[key]) {
			SKUResult[key].count += sku.lInventoryCount;
			SKUResult[key].prices.push(sku.fSalePrice);
			SKUResult[key].codes.push(sku.cCode);
			SKUResult[key].ids.push(sku.id);
			SKUResult[key].markPrices.push(sku.fMarkPrice);
			SKUResult[key].promptMsgs.push(sku.promptMsg);
		} else {
			SKUResult[key] = {
				count: sku.lInventoryCount,
				prices: [sku.fSalePrice],
				codes: [sku.cCode],
				ids: [sku.id],
				markPrices: [sku.fMarkPrice],
				promptMsgs: [sku.promptMsg]
			};
		}
	};
	view.prototype.arrayCombine = function(targetArr) {
		if (!targetArr || !targetArr.length) return [];
		var len = targetArr.length;
		var resultArrs = [];
		for (var n = 1; n < len; n++) {
			var flagArrs = this.getFlagArrs(len, n);
			while (flagArrs.length) {
				var flagArr = flagArrs.shift();
				var combArr = [];
				for (var i = 0; i < len; i++) {
					flagArr[i] && combArr.push(targetArr[i]);
				}
				resultArrs.push(combArr);
			}
		}
		return resultArrs;
	};
	view.prototype.getFlagArrs = function(m, n) { // 获得从m中取n的所有组合
		if (!n || n < 1) return [];
		var resultArrs = [],
			flagArr = [],
			isEnd = false,
			i, j, leftCnt;
		for (i = 0; i < m; i++) {
			flagArr[i] = i < n ? 1 : 0;
		}
		resultArrs.push(flagArr.concat());
		while (!isEnd) {
			leftCnt = 0;
			for (i = 0; i < m - 1; i++) {
				if (flagArr[i] == 1 && flagArr[i + 1] == 0) {
					for (j = 0; j < i; j++) {
						flagArr[j] = j < leftCnt ? 1 : 0;
					}
					flagArr[i] = 0;
					flagArr[i + 1] = 1;
					var aTmp = flagArr.concat();
					resultArrs.push(aTmp);
					if (aTmp.slice(-n).join('').indexOf('0') == -1) {
						isEnd = true;
					}
					break;
				}
				flagArr[i] == 1 && leftCnt++;
			}
		}
		return resultArrs;
	};
	view.prototype.getconsulting = function (param) {
	    param.isShowReply = false;
	    this.proxy.getconsulting(param, function (err, result) {
			if (result) {
				if (result.models.length == 0) {
					$('.consulting').html('<li class="detail_noComment">「暂无咨询」</li>');
					$('.consulting .detail_noComment').show();
					$('.consultingPagesBtn').hide();
				} else {
				   
					this.dateChangeFormat(result);
					var self = this;
					var html = this.render($('#detail_consultingTable').html(), {
						data: result.models
					}, false);
					$('.consulting').html(html);
					$('.consulting .detail_noComment').hide();
					$('.consultingPagesBtn').show();
					var pages = Math.ceil(result.modelsCount / 10);
					$(".consultingPagesBtn").createPage({
						pageCount: pages,
						current: 1,
						unbind: true,
						backFn: function(p) {
							//p就是当前点击页面
							self.proxy.getconsulting({
								productID: param.productID,
								type: param.type,
								commentStatus: 0,
								pageIndex: p,
								pageSize: 10
							}, function(err, result) {
								var html = self.render($('#detail_consultingTable').html(), {
									data: result.models
								}, false);
								$('.consulting').html(html);
							});
						}
					}, self);
					$('.consultingPagesBtn').show();
				}
			} else {
				alert(err);
			}
		}, this);
	};
	view.prototype.dateChangeFormat = function(result) {
		result.models.forEach(function(item, index, array) {
			if (item.dTime) {
				item.dTime = item.dTime.split('.')[0];
			}
			if (item.dTimeReply) {
				item.dTimeReply = item.dTimeReply.split('.')[0];
			}

		});
	}
	view.prototype.dealCommentSpec = function(result) {
		//通过skuid获取到对应的规格名称 规格项名称
		var mainPro = this.productInfo;
		for (var i = 0; i < result.models.length; i++) {
			result.models[i].specs = [];
			var productSkus = mainPro.lsProductSkus;
			for (var j = 0; j < productSkus.length; j++) {
				if (productSkus[j].id == result.models[i].iProductSKU_Id) {
					var specs = productSkus[j].cSpecIds.split(';');
					for (var m = 0; m < specs.length; m++) {
						for (var n = 0; n < mainPro.lsSpecs.length; n++) {
							for (var z = 0; z < mainPro.lsSpecs[n].lsSpecItem.length; z++) {
								if (specs[m] == mainPro.lsSpecs[n].lsSpecItem[z].id) {
									result.models[i].specs.push({
										spec: mainPro.lsSpecs[n].cName,
										itemName: mainPro.lsSpecs[n].lsSpecItem[z].cSpecItemName,
									});
								}
							}
						}
					}
				}
			}
		}
	}
	view.prototype.loginLogout = function (){
        var self = this;
        var token = cb.rest.AppContext.token;
        var userName = cb.rest.AppContext.cUserName;
        var upHeader = $(".up-header");
        var welcome = $(".up-header .welcome");
        if (!token) {
            $(".up-header .login").show();
            if (userName) {
                welcome.html(welcome.html() + ', ' + userName);
            }
        } else {
            $(".up-header .logout").hide();
            welcome.html(userName + ', ' + welcome.html());
        }
        $(".up-header .logout").click(function (e){
            self.proxy.logout(function (err, result) {
                if (err) return;
                //localStorage.removeItem('userData');
                cb.data.CookieParser.delCookie('token');
                $(".up-header .login").hide();
                $(".up-header .logout").show();
                //location.href = '/';
            });
        });
        $(".up-header .pull-right .cygqrcode").hover(function (){
            $(".up-header .cygqrcode img").show();
        }, function (){
            setTimeout(function (){
                $(".up-header .cygqrcode img").hide();
            },1000);
        });
    };
	return view;
});