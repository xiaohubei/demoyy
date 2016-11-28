$(function (){
	//debugger;
	var slides = $(".slides");
	var slideInner = $(".slideInner");
	var slideInnerImage = $(".slideInner a");
	var slideControl = $(".slide_control");
	var slideDot = $(".slide_dot a");
	var dotLen = slideDot.length;
	var currentIndex = 0;
	var showImage = function (){
		slideDot.removeClass("active");
		$(slideDot[currentIndex]).addClass("active");
		slideInnerImage.removeClass("active");
		$(slideInnerImage[currentIndex]).addClass("active");
	};
	var timer = setInterval(function (){
		currentIndex++;
		if(currentIndex > dotLen-1){
			currentIndex = 0;
		}
		showImage();
	},2500)
	slideControl.find(".prev").click(function (){
		currentIndex--;
		if(currentIndex < 0){
			currentIndex = dotLen-1;
		}
		showImage()
	})
	slideControl.find(".next").click(function (){
		currentIndex++;
		if(currentIndex > dotLen-1){
			currentIndex = 0;
		}
		showImage()
	})
	slideDot.click(function (e){
		currentIndex =  $(this).data("index");
		showImage()
	});

	slides.hover(function(){
		slideControl.show();
	}, function(){
		slideControl.hide();
	});

})