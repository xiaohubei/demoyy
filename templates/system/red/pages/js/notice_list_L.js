cb.views.register('NoticeListViewController', function(controllerName) {
	var view = function(widgets) {
		cb.views.BaseView.call(this, widgets);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	view.prototype.init = function() {
		var queryString = new cb.util.queryString();
		var noticeId = queryString.get("id");
		var proxy = cb.rest.DynamicProxy.create({
			getIndexNotices: {
				url: 'client/Notices/getIndexNotices',
				method: 'GET',
				options: {
					token: true
				}
			}
			
		});
		proxy.getIndexNotices({
			size: 9
		}, function(NoticesErr, NoticesResult) {
			if (NoticesErr) {
				alert(NoticesErr.message);
			} else {
				// 获得注册协议分类
				var html = this.render($("#noticeTitleListTpl").html(), {
					noticeTitleList: NoticesResult.notices
				});
				$("#noticeTitleList").empty().append(html);
				// 点击事件
				$('.noticeType').click(function() {
					// 获得分类id
					var typeId = $(this).attr('data-id');
					var proxy = cb.rest.DynamicProxy.create({
						getNoticeById: {
							url: 'client/Notices/getNotice',
							method: 'GET',
							options: {
								token: true
							}
						}
					});
					proxy.getNoticeById({
						id: typeId
					}, function(NoticeErr1, NoticeResult1) {
						if (NoticeErr1) {
							alert(NoticeErr1.message);
						} else {
							if (NoticeResult1.cNoticeType == 'URL') {
								window.open(NoticeResult1.cUrl);
							} else {
								$('.articleTitle').html(NoticeResult1.cTitle);
								$('.articleContent').html(NoticeResult1.oNoticeDetail.cContent);
								$('.articleAttach').html(getAttach(NoticeResult1));
							}

						}
					}, this);
				});
				var proxy = cb.rest.DynamicProxy.create({
					getNotice: {
						url: 'client/Notices/getNotice',
						method: 'GET',
						options: {
							token: true
						}
					}
				});
				proxy.getNotice({
					id: noticeId
				}, function(NoticeErr, NoticeResult) {
					if (NoticeErr) {
						alert(NoticeErr.message);
					} else {
						$('.articleTitle').html(NoticeResult.cTitle);
						$('.articleContent').html(NoticeResult.oNoticeDetail.cContent);
						$('.articleAttach').html(getAttach(NoticeResult));
					}
				}, this);
			}
		}, this);
	};
	var getAttach = function(NoticeResult1){
		var str = "";
		if (NoticeResult1.oAttachments.length > 0) {
			for (var i = 0; i < NoticeResult1.oAttachments.length; i++) {				
				str += '<a href='  + cb.util.adjustAttachPath(NoticeResult1.oAttachments[i].cUrl)+ ' style="padding-right:20px">' + NoticeResult1.oAttachments[i].cOriginalName + '</a>';
				
			}
		}
		return str;
	}
	return view;
});