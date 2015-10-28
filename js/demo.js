is_precise = true;

function setHelp(msg) {
    $("#help").html(msg);
}

function clearHelp() {
    setHelp("");
}

function resetSim() {
    // Reativa dica para os botões
    $("#reset").hover(function(){setHelp("Reinicia a simulação.")}, clearHelp);
    $("#advance").hover(function(){setHelp("Avança a simulação. (Um pulso de clock)")}, clearHelp);
    $("#int-type").hover(function(){setHelp("Escolhe entre interrupções precisas ou imprecisas.")}, clearHelp);
}

$(function(){
    $("#int-type").click(function(){
        is_precise = !is_precise;
        $("#int-type").html(is_precise ? "Precisa" : "Imprecisa");
    });

    $("#advance").click(function(){
        $("#stack > tbody:last-child").prepend("<tr><td>0xFFAA</td><td>Oi</td></tr>");
        //if(state == ativo) avanca(); else comeca();
    });

    $("#reset").click(function(){
        $("#execute").css("background-color", "red");
    });

});


