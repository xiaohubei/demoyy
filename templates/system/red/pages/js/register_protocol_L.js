cb.views.register('RegisterProtocolViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.init = function() {
		var list = {};
		var proxy = cb.rest.DynamicProxy.create({
			loadlist: {
				url: 'client/ArticleTypes/loadlist',
				method: 'POST',
				options: {
					token: true
				}
			}
		});
		proxy.loadlist({}, function(err, result) {
			var _self = this;
			if (err) {
				alert(err.message);
			} else {
				for (var i = 0; i < result.length; i++) {
					if (result[i].tName == "会员注册协议") {
						list = result[i].childNodes;
					}
				}
				// 获得注册协议分类
				var html = this.render($("#registerClassfyTpl").html(), {
					registerClassfyList: list
				});
				var _this = this;
				$("#registerClassfy").empty().append(html);
				// 点击事件
				$(".registerClassfyType").click(function() {
					// 获得分类id
					var typeId = $(this).attr('data-id');
					$('#registerType').show();
					$('#articleDetail').hide();
					var proxy = cb.rest.DynamicProxy.create({
						getArticlesByType: {
							url: 'client/Articles/getArticlesByType',
							method: 'GET',
							options: {
								token: true
							}
						}
					});
					proxy.getArticlesByType({
						typeId: typeId
					}, function(articlesByTypeErr, ArticlesByTypeResult) {
						if (articlesByTypeErr) {
							alert(articlesByTypeErr.message);
						} else {
							if (ArticlesByTypeResult.data.length > 0) {
								// 获得注册协议分类
								var registerTypeHtml = self.render($("#registerTypeTpl").html(), {
									registerTypeList: ArticlesByTypeResult.data
								});
								$("#registerType").empty().append(registerTypeHtml);
								// 点击事件
								$(".registerType").click(function() {
									// 获得分类id
									var articleId = $(this).attr('data-id');
									var proxy = cb.rest.DynamicProxy.create({
										getArticleById: {
											url: 'client/Articles/getArticleById',
											method: 'GET',
											options: {
												token: true
											}
										}
									});
									proxy.getArticleById({
										articleid: articleId
									}, function(articleByIdErr, articleByIdResult) {
										if (articleByIdErr) {
											alert(articleByIdErr.message);
										} else {
											$('#registerType').hide();
											$('#articleDetail').show();
											$('.articleTitle').html(articleByIdResult.articleIndex.title);
											$('.articleContent').html(articleByIdResult.content);
										}
									}, this);
								});
							}

						}
					}, this);
				});
				// 默认显示服务条款说明
				if (list.length > 0) {
					var proxy = cb.rest.DynamicProxy.create({
						getArticlesByType: {
							url: 'client/Articles/getArticlesByType',
							method: 'GET',
							options: {
								token: true
							}
						}
					});
					proxy.getArticlesByType({
						typeId: list[0].id
					}, function(articlesByTypeErr, ArticlesByTypeResult) {
						if (articlesByTypeErr) {
							alert(articlesByTypeErr.message);
						} else {
							// 获得注册协议分类
							self = this;
							var registerTypeHtml = this.render($("#registerTypeTpl").html(), {
								registerTypeList: ArticlesByTypeResult.data
							});
							$("#registerType").empty().append(registerTypeHtml);
							// 点击事件
							$(".registerType").click(function() {
								// 获得分类id
								var articleId = $(this).attr('data-id');
								var proxy = cb.rest.DynamicProxy.create({
									getArticleById: {
										url: 'client/Articles/getArticleById',
										method: 'GET',
										options: {
											token: true
										}
									}
								});
								proxy.getArticleById({
									articleid: articleId
								}, function(articleByIdErr, articleByIdResult) {
									if (articleByIdErr) {
										alert(articleByIdErr.message);
									} else {
										$('#registerType').hide();
										$('#articleDetail').show();
										$('.articleTitle').html(articleByIdResult.articleIndex.title);
										$('.articleContent').html(articleByIdResult.content);
									}
								}, this);
							});


						}
					}, this);
				}
			}
		}, this);
	};
	return view;
});