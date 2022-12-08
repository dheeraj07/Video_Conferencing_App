const socket = io();

const welcomeForm = document.getElementById("welcome");
const messageForm = document.getElementById("message");
const roomForm = document.getElementById("room");

const video = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const videoBtn = document.getElementById("camera");
const camerasEle = document.getElementById("cameras");

let camStatus = false;
let audioStatus = false;

let roomName = "";
welcomeForm.hidden = false;
roomForm.hidden = true;

let mySteam;


async function getCameras()
{
    try
    {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = mySteam.getVideoTracks()[0];
        cameras.forEach(camera => 
        {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label == camera.label)
            {
                option.selected = true;
            }
            camerasEle.appendChild(option);
        })
    }catch(e)
    {
        console.log(e);
    }
}

camerasEle.addEventListener("input", (inp)=>
{
    getMedia(inp.value);
})

async function getMedia(deviceId)
{
    const initialConstraints = 
    {
        audio: true,
        video: {facingMode: "user"} 
    }
    const cameraConstr = 
    {
        audio: true,
        video: {deviceId: {exact: deviceId}}
    }
    try{
        mySteam = await navigator.mediaDevices.getUserMedia(deviceId ? cameraConstr:initialConstraints);
        video.srcObject = mySteam;
        if(!deviceId)
        {
            await getCameras();
        }
    }
    catch(e)
    {
        console.log(e);
    }
}


muteBtn.addEventListener("click", ()=>
{
    mySteam.getAudioTracks().forEach( track => track.enabled = !track.enabled);
    if(!audioStatus)
    {
        muteBtn.innerText = "Unmute";
    }
    else
    {
        muteBtn.innerText = "Mute";
    }
    audioStatus = !audioStatus;
});


videoBtn.addEventListener("click", ()=>
{
    mySteam.getVideoTracks().forEach( track => track.enabled = !track.enabled);
    if(!mute)
    {
        videoBtn.innerText = "Turn On Camera";
    }
    else
    {
        videoBtn.innerText = "Turn Off Camera";
    }
    camStatus = !camStatus;
});

function addMessage(message)
{
    const welcomeMsg = roomForm.querySelector("ul");
     const li = document.createElement("li");
     li.innerText = message;
     welcomeMsg.appendChild(li);
}

welcomeForm.addEventListener("submit", (event) => 
{
    event.preventDefault();
    const roomN = welcomeForm.querySelector("#roomname");
    const name = welcomeForm.querySelector("#name");
    roomName = roomN.value;
    socket.emit("name", name.value, roomName);
    socket.emit("room" , roomN.value, () => 
    {
        welcomeForm.hidden = true;
        roomForm.hidden = false;
        const roomIdentity = document.getElementById("roomName");
        roomIdentity.innerText = `Room ${roomName}`;
        
        messageForm.addEventListener("submit", event =>
        {
            event.preventDefault();
            const input = messageForm.querySelector("input");
            socket.emit("sendMessage", input.value, roomName, () => 
            {
                addMessage(`You: ${input.value}`);
            })
        });
    });
    roomN.value = "";
    name.value = "";
});

socket.on("welcome", (name) => 
{
     addMessage(name+" joined the chat room");
});

socket.on("bye", (name)=>
{
    addMessage(name+" left the chat room!");
})

socket.on("new_message", (msg) => 
{
    addMessage(msg);
});

socket.on("room_change", (rooms) => 
{
    const ul = welcomeForm.querySelector("ul");
    ul.innerHTML = "";
    for(let value of rooms.values())
    {
        for(var k in value)
        {
            const li = document.createElement("li");
            li.innerText = k +"  "+value[k]+" People\n";
            ul.append(li);
        }
    }
});

getMedia();