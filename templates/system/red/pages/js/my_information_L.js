cb.views.register('MyInformationViewController', function(controllerName) {
	var view = function(id, options) {
		cb.views.BaseView.call(this, id, options);
	};
	view.prototype = new cb.views.BaseView();
	view.prototype.controllerName = controllerName;
	var isHaveEmail = true;
	var defineInfo = [];
	view.prototype.init = function() {
		var proxy = cb.rest.DynamicProxy.create({
			getMemberByToken: {
				url: 'member/Members/getMemberByToken',
				method: 'POST',
				options: {
					token: true
				}
			},
			getMemberCdefine: {
				url: 'member/Members/getMemberSetting?isEnable=true',
				method: 'post',
				options: {
					token: true
				}
			}
		});
		// 加载个人信息
		proxy.getMemberByToken({}, function(err, result) {
			if (err) {
				alert("获取个人信息失败");
			} else {
				if(navigator.appName == 'Microsoft Internet Explorer' && navigator.appVersion.match(/8./i)=='8.'){
					result.isIe8 = true;
				}
				// 头像
				if (!result.cPortrait || result.cPortrait == "") {
					// 没有头像默认头像
					result.cPortrait = "http://i.jd.com/commons/img/no-img_mid_.jpg";
				}
				if (!result.cEmail || result.cEmail == '没有绑定邮箱') {
					result.cEmail = "没有绑定邮箱";
					isHaveEmail = false;
				}
				var model = result;
				if (!result.iPoints) {
					result.iPoints = 0;
				}
				
				if (!result.fConsumeAmount) {
					result.fConsumeAmount = 0;
				}

				if (result.fConsumeAmount) {
				    if (parseFloat(result.fConsumeAmount) < 0) {
				        result.fConsumeAmount = 0;
				    }
				}
				
				var myInformationHtml = this.render($('#myInformationTpl').html(), {
					list: result
				});
				var that = this;				
				$("#my_information_main").empty().append(myInformationHtml);
				if (result.cPhone && result.cPhone != "") {
					$("#valPhone").empty().append("修改");
				}
				if (isHaveEmail) {
					$("#submit_btn").empty().append("修改");
				} else {
					$("#submit_btn").empty().append("立即绑定");
				}
				// 立即绑定
				$("#submit_btn").click(function() {
					location.href = 'security_center';
				});
				
				// 用户名验证
				$('#nickName').blur(function(e) {
					if (!$('#nickName').val()) {
						$("#validateNickName").attr("class", "font-red");
						$("#validateNickName").empty().append("本项必填");
						return;
					} else {
						$("#validateNickName").removeClass("font-red")
						$("#validateNickName").empty().append("");
					}
				});
				//会员自定义项
				proxy.getMemberCdefine({}, function(err, data) {
					if (err) {
						alert("获取会员自定义项失败" + err);
						return;
					} else {						
						defineInfo = data;
						for (var i = 0; i < data.length; i++) {
							if(navigator.appName == 'Microsoft Internet Explorer' && navigator.appVersion.match(/8./i)=='8.'){
								data[i].isIe8 = true;
							}
							if(data[i].cType == 'date'){
								if(result[data[i].cDefineName] == ''){
									data[i].cText = null;
								}else{
									try{
										data[i].cText = (new Date(result[data[i].cDefineName])).toISOString().slice(0,10);
									}
									catch(e){
										data[i].cText = null;
									}
									
								}	
							}else{
								data[i].cText = result[data[i].cDefineName];
							}							
						}
						var myInformationExtend = that.render($('#myInformationExtendTpl').html(), {
							extendlist: data
						});
						$("#formInfo").find('.item:last').after(myInformationExtend);
					}
				});
				// 保存
				$(".save_btn").click(function() {
					//会员自定义项校验
					for (var i = 0; i < defineInfo.length; i++) {
						if (!defineInfo[i].isNull && !$('#' + defineInfo[i].id).val()) {
							alert(defineInfo[i].cTitle + "不为空");
							return;
						} if(defineInfo[i].iLength <$('#' + defineInfo[i].id).val().length){
							alert(defineInfo[i].cTitle + "的长度不能超过"+defineInfo[i].iLength );
							return;
						}
						else {
							model[defineInfo[i].cDefineName] = $('#' + defineInfo[i].id).val();
						}
					}

					// 密码相同认证
					if (!$('#nickName').val()) {
						$("#validateNickName").attr("class", "font-red");
						$("#validateNickName").empty().append("本项必填");
						return;
					} else {
						$("#validateNickName").removeClass("font-red")
						$("#validateNickName").empty().append("");
					}
					// 昵称
					model.cUserName = $("#nickName").val();
					// qq号
					model.cQQ = $("#cQQ").val();
					// 真实姓名
					model.cRealName = $("#realName").val();
					//生日
					model.dBirthday = $("#dBirthday").val();
					// 邮箱
					if($("#cEmailNum").text() == '没有绑定邮箱'){
						model.cEmail = null;
					}else{
						model.cEmail = $("#cEmailNum").text();
					}
					
					// 手机号码
					model.cPhone = $("#cPhoneNum").text();
					// 头像
					if($("#myPortraitUrl").val()){
						model.cPortrait = $("#myPortraitUrl").val();
					};					
					var proxy = cb.rest.DynamicProxy.create({
						saveInfo: {
							url: 'member/Members/save',
							method: 'POST',
							options: {
								token: true
							}
						}
					});
					proxy.saveInfo({
						model: model
					}, function(err, result1) {
						if (err) {
							alert("修改失败" + err.message);
						} else {
							alert("保存成功");
							location.reload();
						}

					});
				});
				// 修改手机
				$("#valPhone").click(function() {
					location.href = 'update_password?valType=3&cPhone=' + result.cPhone;
				});
				// 点击头像，上传图片
				$("#myPortrait").click(function() {
					location.href = 'upload_portrait';
				});
			    // 点击头像，上传图片
				$(".editPortrait").click(function () {
				    location.href = 'upload_portrait';
				});
				$('.portraitArea').hover(function () {
				    $('.editPortrait').show();
				}, function () {
				    $('.editPortrait').hide();
				});
			}

		}, this);

	};
	return view;
});