is_precise = true;

$(document).ready(function(){
    $("#int-type").click(function(){
        is_precise = !is_precise;
        $("#int-type").html(is_precise ? "Precisa" : "Imprecisa");
    });
});
