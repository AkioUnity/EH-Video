$(document).ready(function(){
	$('.profile-images-pub').slick({
		infinite: true,
		slidesToShow: 1,
		slidesToScroll: 1,
		//adaptiveHeight: true
	});	
	$('.profile-images-pri').slick({
		infinite: true,
		slidesToShow: 1,
		slidesToScroll: 1,
		//adaptiveHeight: true
	});	

	 $('video').each(function () {
	 	enableInlineVideo(this);
	 	this.addEventListener('touchstart', function () {
			video.play();
		});
	 });
	// $('.profile-img-delete').click(function(e){
	// 	var key = e.currentTarget.dataset.key
	// 	$.post('/')
	// })
})
