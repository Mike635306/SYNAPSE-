const msgBox = document.querySelector('#chat-msg-dialog');
const msgInput = document.querySelector('#message-input');
const sendMsgBtn = document.querySelector('#send-msg');
const mobileMenuBtn = document.querySelector('#mobile_menu');
const audioMsgBtn = document.querySelector('#audio-msg');
const sendAudioMsgbtn = document.querySelector('#audio-msg-notif');
const openModalBtn = document.getElementById("openBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const modal = document.getElementById("modal");
const modalOverlay = document.getElementById("modalOverlay");
const modalFileInput = document.getElementById("modalFileInput");
const modalSendFileBtn = document.getElementById("modalSendFileBtn");
const modalFileLabel = document.getElementById("modalFileLabel");

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


const openModal = () => {
    modal.classList.remove("hidden");
};

const closeModal = () => {
    modal.classList.add("hidden");
    modalFileInput.value = "";
    modalFileLabel.textContent = "";
    modalSendFileBtn.disabled = true;
};


let audioChunks = [];
let isAudioRecording = false;
let mediaRecording;



mobileMenuBtn.addEventListener('click', ()=>{
    const aside = document.querySelector('.right-bar-overlay');
    aside.classList.toggle('active');
})

let user = prompt('Enter your name');
const socket = io();



const createMessage = (msg,name) => {    

    let now = new Date();
    let currentDate  = `${  String(now.getHours()).padStart(2,'0') } : ${String(now.getMinutes()).padStart(2,'0')}`;

    return( `
            <div class="message">
            
                    <div class="fotor"><img src="./assets/circle-user-round.svg" alt=""></div>
                    <div class="message_overlay">
                        <div class="message_name">${escapeHtml(String(name))}</div>
                        <p>${escapeHtml(String(msg))}</p>   
                        <div class="date">${currentDate}</div>
                   </div>
            </div>
           
         `)

};

const createFileMessage = (innerHtml, name) => {
    let now = new Date();
    let currentDate = `${String(now.getHours()).padStart(2, "0")} : ${String(now.getMinutes()).padStart(2, "0")}`;
    return `
            <div class="message message--file">
                    <div class="fotor"><img src="./assets/circle-user-round.svg" alt=""></div>
                    <div class="message_overlay">
                        <div class="message_name">${escapeHtml(name)}</div>
                        ${innerHtml}
                        <div class="date">${currentDate}</div>
                   </div>
            </div>`;
};


const sendMessage = () => {
     
    let user_data = {msg:msgInput.value,user_name:user};
     
     if(msgInput.value.length == 0 ){
        alert('Мы не можем отправить пустую строку')
        // throw new Error('Пустая строка: Невозможно отправить пустое сообщение');
        return;
     }

     socket.emit('chat message', user_data);    
     console.log('Сообщение успешно отправлено')
     msgInput.value = ''; // Очищаем поле ввода после отправки
}


const audioMessage = async() =>{
    if(isAudioRecording){
       mediaRecording.stop()
       isAudioRecording = !isAudioRecording;
         sendAudioMsgbtn.classList.toggle('active');
        return;
    }else{
      try {
       const stream = await navigator.mediaDevices.getUserMedia({audio:true})
       mediaRecording = new MediaRecorder(stream);
       mediaRecording.ondataavailable = (e) => {
       audioChunks.push(e.data) 
       }
       mediaRecording.onstop = async () => {
        console.log('запись')
        const blob = new Blob(audioChunks,{type:'audio/webm'});
        audioChunks = [];
        socket.emit('voice message',blob);
       }
       mediaRecording.start()
       isAudioRecording = !isAudioRecording;
        sendAudioMsgbtn.classList.toggle('active');
      } catch (e) {
        alert("Нет доступа к микрофону или запись не поддерживается");
        console.error(e);
      }
    }
     
}

//Тип отправки сообщения через Enter
window.addEventListener('keypress', (e)=>{
    let pressedKey = e.key;
    if(pressedKey == 'Enter'){
         sendMessage();
    }
})
//Тип отправки сообщения через кнопку
sendMsgBtn.addEventListener('click', ()=>{
    sendMessage();
});
audioMsgBtn.addEventListener('click',()=>{
    audioMessage();
});






socket.on('chat message', (data)=>{
 
    const {msg,user_name} = data;
    msgBox.innerHTML += createMessage(msg,user_name);
})

socket.on('voice message',(data)=>{
    const blob = new Blob([data],{type:'audio/webm'})
    const url = URL.createObjectURL(blob)
   msgBox.innerHTML += `<audio src="${url}" controls ></audio>`;

})

socket.on("file message", (meta, data) => {
    playNotificationBeep();
    const blob = new Blob([data], { type: meta.type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const safeName = escapeHtml(meta.name || "file");
    const isImage = meta.type && meta.type.startsWith("image/");
    const inner = isImage
        ? `<p class="message_file-preview"><a href="${url}" download="${safeName}"><img src="${url}" alt=""></a></p>`
        : `<p class="message_file-link"><a href="${url}" download="${safeName}">${safeName}</a></p>`;
    msgBox.innerHTML += createFileMessage(inner, meta.user_name);
});

const sendSelectedFile = () => {
    const file = modalFileInput.files?.[0];
    if (!file) {
        alert("Выберите файл");
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        socket.emit(
            "file message",
            {
                name: file.name,
                type: file.type || "application/octet-stream",
                user_name: user,
            },
            reader.result
        );
        closeModal();
    };
    reader.readAsArrayBuffer(file);
};

modalFileInput.addEventListener("change", () => {
    const file = modalFileInput.files?.[0];
    if (file) {
        modalFileLabel.textContent = file.name;
        modalSendFileBtn.disabled = false;
    } else {
        modalFileLabel.textContent = "";
        modalSendFileBtn.disabled = true;
    }
});

modalSendFileBtn.addEventListener("click", sendSelectedFile);

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);


