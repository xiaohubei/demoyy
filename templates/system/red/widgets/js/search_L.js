cb.widgets.register('Search', function(widgetType) {
	var widget = function(id, options) {
		cb.widgets.BaseWidget.call(this, id, options);
	};
	widget.prototype = new cb.widgets.BaseWidget();
	widget.prototype.widgetType = widgetType;
	widget.prototype.getProxy = function() {
		return {
			url: 'client/PopularKeywords/getList',
			method: 'GET'
		};
	}
	widget.prototype.getTemplate = function() {
		return $("#keylist").html()
	}
	widget.prototype.runTemplate = function(err, result) {
		var query= new cb.util.queryString().query;
		var keyword=query.keyword;
		var $input=this.getElement().find('.search_box_t input');
		if(keyword){
		$input.val(keyword)	
		}
		if (err) {
			alert(err.message);
			return;
		}
		var data = result.pkword;
		var keyWord = {
			list: []
		};
		for (var i = 0; i < data.length; i++) {
			if (data[i].isDefault) {
				keyWord.isDefault = data.slice(i, i+1)[0];
			} else {
				keyWord.list.push(data[i]);
			}
		}
			//处理热门关键词展示
		var html = this.render({
			hotKey: keyWord.list
		});
		$('.key-list').html(html);
		//处理搜索框默认关键词
		if (keyWord.isDefault) {
			$input.attr('placeHolder', keyWord.isDefault.name)
		}
		this.getElement().find('.search_box_t button').click(this, function(e) {
			e.data.redirectSearchPage(keyWord.isDefault);
		});
		this.getElement().keydown(this, function(e) {
			if (e.keyCode !== 13) return;
			e.data.redirectSearchPage(keyWord.isDefault);
		});
	};

	widget.prototype.redirectSearchPage = function(isDefault) {
		var $input = this.getElement().find('.search_box_t input');
		value = $input.val();
		if (value == '' && isDefault) {
			if (isDefault.targetUrl) {
				location.href = isDefault.targetUrl;
			} else {
				location.href = '/list?keyword=' + encodeURIComponent(isDefault.name);
			}
		} else {
			location.href = '/list?keyword=' + encodeURIComponent($input.val());
		}
	};
	return widget;
});