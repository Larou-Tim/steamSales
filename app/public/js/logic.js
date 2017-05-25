$(document).on("click", "#updateSales", function () {

})


$(document).ready(function () {
  $('.parallax').parallax();
  $(".button-collapse").sideNav();
  //    $('.div-test').sideNav('hide');

  $(".game-tag-show, .hover-box").hover(function () {
    // var dataString = $(this).attr("data-values");
    // var dataArr = dataString.split(",");
    // for(var i in dataArr) {
    //   var chipDiv = $("<div>");
    //   chipDiv.attr("class","chip game-tag");
    //   chipDiv.text(dataArr[i]);
    //   $(".hover-box").append(chipDiv)
    // }
    // // <div class="chip game-tag">  </div> 
    // // console.log($(this).offset())
    // // console.log($(this).attr("data-values"))
    $(this).children().show();
  }, function () {
    $(".hover-box").hide();
  });

});