function plusReady() {
    // 隐藏滚动条
    plus.webview.currentWebview().setStyle({
        scrollIndicator: 'none'
    });
    var backBtnCount = 0;
    // Android处理返回键
    plus.key.addEventListener('backbutton', function () {
        if (window.outerWebView) {
            window.outerWebView.close();
            delete window.outerWebView;
            return;
        }
        var theModal = document.querySelector(".modal.modal-in") || document.querySelector(".popup.modal-in"); //如果有弹窗的话, 关闭弹窗
        if (theModal && theModal.style.display == "block") {
            myApp.closeModal();
            return false;
        }
        var homePages = ["home", "category", "cart", "user"];
        var currPage = $$(".view-main.tab.active").data("page");
        if (homePages.indexOf(currPage) > -1) {
            if (backBtnCount == 0) {
                plus.nativeUI.toast("再次点击返回可退出！");
                setTimeout(function () {
                    backBtnCount = 0;
                }, 1000);
            }
            backBtnCount = backBtnCount + 1;
            if (backBtnCount == 2) {
                plus.runtime.quit();
            }
        } else {
            switch (currPage) {
                case "ForgetPwd":  //忘记密码页面,未进入系统
                    myApp.loginScreen();
                    myApp.popup('.popup.popup-login');
                    myApp.mainView.router.back();
                    break;
                case "productDetail": //规格半屏页,需要特殊处理
                    if ($$(".popup-prodSUK").length > 0 && $$(".popup-prodSUK")[0].style.display == "block") {
                        $$("div[data-page=protDetailPage] .close-popup").trigger("click");
                    }
                    else {
                        myApp.mainView.router.back();
                    }
                    break;
                default:
                    myApp.mainView.router.back();
            }
        }
    }, false);
}
if (window.plus) {
    plusReady();
} else {
    document.addEventListener('plusready', plusReady, false);
}