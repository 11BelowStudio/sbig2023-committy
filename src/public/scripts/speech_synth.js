
function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


const ttsDone = new Event("tts_done");

const has_tts = (
    ('speechSynthesis' in window)
    &&
    window.speechSynthesis !== undefined
    &&
    window.speechSynthesis.getVoices().length > 0
);

let voices = [];

function randomItem(values){
    return values[Math.floor(Math.random() * values.length)];
}

function populateVoiceList() {

    if (!has_tts){
        return;
    }

    const synth = window.speechSynthesis;
    voices = synth.getVoices();

}


  
populateVoiceList();
  
if (has_tts && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}



function speak_this(words_to_speak){
    if ((!has_tts) || voices.length == 0){
        window.dispatchEvent(ttsDone);
    }

    speechSynthesis.resume();
    
    const utterThis = new SpeechSynthesisUtterance(words_to_speak);
    utterThis.voice = randomItem(voices);

    utterThis.onend = e=> {
        window.dispatchEvent(ttsDone);
    };

    utterThis.onerror = e=> {
        window.dispatchEvent(ttsDone);
    };

    speechSynthesis.speak(utterThis);
}