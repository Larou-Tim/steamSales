


$(document).ready(function () {
   $('.modal').modal();
  $('.parallax').parallax();
  $(".button-collapse").sideNav();
  $(document).on("submit", "#name-form", handleGameSearch);
  $(".game-tag-show, .hover-box").hover(function () {
    $(this).children().show();
  }, function () {
    $(".hover-box").hide();
  });

  $(document).on("click", "#updateSales", function () {
    $.ajax({
      method: "GET",
      url: "/findSales",
    }).done(function () {
      location.reload();

    })
  });

  function handleGameSearch() {
    var nameInput = $("#game_name_search").val();

    // Don't do anything if the name fields hasn't been filled out
    if (!nameInput.trim().trim()) {
      return;
    }

    var action_src = "/game/" + nameInput;
    var your_form = document.getElementById('name-form');
    your_form.action = action_src;

  }


  $(document).on("click", "#note-save", function () {
    // Grab the id associated with the article from the submit button
    var thisId = $(this).attr("game-id");

    var noteText = $(this).parent().parent().find("#game-note-input").val();
    //update current content if its there 
    // since i'm using handlebars other option i know is to reload
    //does not scale if someone else is adding notes to the same page
    $(this).parents().eq(4).find("#current-game-note").text(noteText);


    // Run a POST request to change the note, using what's entered in the inputs
    $.ajax({
      method: "POST",
      url: "/notes/" + thisId,
      data: {
        // Value taken from title input
        // Value taken from note textarea
        body: noteText
      }
    })
      // With that done
      .done(function (data) {
        // Log the response

        // Empty the notes section
        $("#notes").empty();
      });

    // Also, remove the values entered in the input and textarea for note entry
    updateNoteText(thisId);
    $("#game-note-input").val("");

  });

  function updateNoteText(id) {

  }

});