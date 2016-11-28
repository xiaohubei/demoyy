cb.views.register('MyReturnController', function (controllerName) {
    var view = function (widgets) {
        cb.views.BaseView.call(this, widgets);
    };
    view.prototype = new cb.views.BaseView();
    view.prototype.controllerName = controllerName;
    view.prototype.init = function () {
        var queryString = new cb.util.queryString();
        var detailid = queryString.get("detailid");
        var proxy = cb.rest.DynamicProxy.create({
            getData: {url: 'client/Orders/getReturnDetail',method: 'GET',options: { token: true }},
            submit: {url: 'client/SaleReturns/save',method: 'POST',options: { token: true }},
            upload: {url: '/FileUpload/uploadAlbum',method: 'POST',options: { token: true }},
            getReasonContentList: {url: 'client/OrderCancelReason/getReasonContentList',method: 'GET',options: { token: true }}
        });
        var _result ;
        var _this = this;
        var errMessage = {
                quantity:0,
                money:0,
                description:1,
            };
        //获取退货订单详情
        proxy.getData({"iDetailId":detailid},function (err, result) {
            if(err){
                console.log("没有返回信息"+err);
                $('#returninfo').html("<p style='font-size:14px; margin:10px;'>没有返回退货信息 ----"+err.message +"<p>")
                return;
            };
            if(result) {
                _result = result;
                _result.way = "returngood";
                productinfoshow(result);
                //待发货状态下只显示退款按钮
                if(result.cNextStatus == "DELIVERGOODS"){
                    _result.way = "returnmoney";
                };
                tplRender(_result);
            }
        });
        //获取退货原因
        //订单关闭：type:orderclose
        //退货：type：orderrefund
        var getReturnReason = function (cb){
            proxy.getReasonContentList({type:"orderrefund"},function (err, result){
                if(result){
                    result = result || [];
                    var html='';
                    for(var i=0; i<result.length; i++){
                        html+='<option>'+result[i].reason+'</option>';
                    };
                    $('#reason').find('select').empty().html(html);
                };
            });
        };
        //渲染模版
        var tplRender = function (result){
            var html = '';
            if(result){
                html =_this.render( $('#returngoodTpl').html(),{data:result});
            };
            $("#returninfo").empty().append(html);
            //绑定点击事件
            getReturnReason();
            bindClick();
        }
        //提交申请退款
        var submitReturn = function(data){
            var postData= {
                "iDetailId":detailid,
                "reason":$('#reason').find("option:selected").text(),
                "quantity":$('#quantity input').val(),
                "money":$('#money input').val(),
                "description":$('#description textarea').val(),
            };
            postData.oAttachments=data;
            proxy.submit(postData,function (err, result) {
                if(err){
                    ModalTip({message:err.message},_this);
                    return ;
                }
                if(result || !err){
                    var callBack = function (data){
                        location.href="myorder";
                    }
                    ModalTip({message:"成功申请退货(退款)",cb:callBack},_this);
                }
            });
        }
        //是否符合提交条件
        var canPostData = function (){
            if(_result.way == "returnmoney" )errMessage.quantity = 1;
            if(errMessage.quantity && errMessage.money && errMessage.description ){
                return 1;
            }
            return 0;
        };

        //绑定事件
        var bindClick=function(){
            var oAttachments=[];
            //提交退货申请按钮
            $('#returnPost button').on('click', function () {
                if(!canPostData()){
                    $('#returnPost .errorwaning').show();
                    setTimeout(function(){
                        $('#returnPost .errorwaning').hide();
                    },2000);
                    return false;
                }
                submitReturn(oAttachments);
            });
            //上传图片
            $("#uploadpic").diyUpload({
                url:'/client/FileUpload/uploadAlbum',
                success:function( data ) {
                    oAttachments.push({"cFileName":data.data.imgname,"cOriginalName":data.data.cOriginalName,"cFolder":data.data.cFolder});
                },
                error:function( err ) {
                    console.info( err );
                }
            })
            //选项卡
            $('#return_tabs li').each(function (index){
                $(this).on('click', function(){
                    if($(this).attr("data-returnway") == 'returngood'){
                        _result.way = 'returngood';
                    }else if($(this).attr("data-returnway") == 'returnmoney'){
                        _result.way = 'returnmoney';
                    }
                    tplRender(_result);
                    $('#return_tabs li').removeClass('active');
                    $('#return_tabs li').eq(index).addClass('active');
                    errMessage = {
                        quantity:0,
                        money:0,
                        description:1,
                    };
                })
            });
            //各种信息提示
            errorTipEvent()
        }
        //各种信息提示
        var errorTipEvent = function(obj, rule, mes){
            //退款数量
            $('#quantity input').on("change",function(){
                if(parseFloat($(this).val())>_result.iQuantity || parseFloat($(this).val())< 0){
                    $('#quantity span').addClass('errortip');
                    errMessage.quantity = 0;
                }else{
                    $('#quantity span').removeClass('errortip');
                    errMessage.quantity = 1;
                }
            })
            //退款金额
            $('#money input').on("change",function(){
                var inputMoney =$(this).val()? parseFloat($(this).val()) : 0;
                var maxMoney = parseFloat(_result.fCanReturnMoney.toFixed(2));
                if(inputMoney > maxMoney){
                    $('#money span').addClass('errortip');
                    errMessage.money = 0;
                }else if(inputMoney != 0 && inputMoney < 0.01){
                    $('#money span.tip').addClass('errortip');
                    errMessage.money = 0;
                }else{
                    $('#money span').removeClass('errortip');
                    errMessage.money = 1;
                }

            })
            //退款说明
            $('#description textarea').on("change",function(){
                if($(this).val().length > 500){
                    $('#description span').addClass('errortip');
                    errMessage.description = 0;
                }else{
                    $('#description span').removeClass('errortip');
                    errMessage.description = 1;
                }
            });
        }
        //处理商品信息展示
        var productinfoshow = function (data){
            $("#productinfo img").attr('src',cb.util.adjustImgSrc(data.DefaultImage));
            $("#productinfo .cOrderNo").text(data.cOrderNo);
            $("#productinfo .cProductName").text(data.cProductName);
        };

    }
    return view;
});