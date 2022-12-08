const socket = io();

const welcomeForm = document.getElementById("welcome");
const messageForm = document.getElementById("message");
const roomForm = document.getElementById("room");
const innerWelcomeForm = welcomeForm.querySelector("form");

const video = document.getElementById("myFace")
const muteBtn = document.getElementById("mute")
const videoBtn = document.getElementById("camera")

const camerasEle = document.getElementById("cameras");
const fileUpload = document.getElementById("file_upload");

let camStatus = false;
let audioStatus = false;

let roomName = "";
welcomeForm.hidden = false;
roomForm.hidden = true;

let mySteam;
let peerConn;
let dataChannel;
let fileUploaded;



async function getCameras()
{
    try
    {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = mySteam.getVideoTracks()[0];
        cameras.forEach(camera => {
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

function makeConnection()
{
    peerConn = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    });
    peerConn.addEventListener("icecandidate", handleIceCandidateProcess);
    peerConn.addEventListener("addstream", handleAddStream);
    mySteam.getTracks().forEach((stream) => peerConn.addTrack(stream, mySteam));
}

function handleAddStream(data)
{
    console.log("Received a stream from peer")
    const peersStream = document.getElementById("peer");
    peersStream.srcObject = data.stream
    console.log("Peer's stream:   ",data)
    console.log("My stream:   ",mySteam);
}

function handleIceCandidateProcess(data)
{
    console.log("sent ice")
    socket.emit("ice", data.candidate, roomName);
    console.log("room name: ",roomName);
}

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

function addMessage(message)
{
    const welcomeMsg = roomForm.querySelector("ul");
     const li = document.createElement("li");
     li.innerText = message;
     welcomeMsg.appendChild(li);
}

function shareFileWithPeer()
{
    if(fileUploaded)
    {
        const fileName = fileUploaded.name;
        dataChannel = peerConn.createDataChannel(fileName);
        dataChannel.binaryType = 'arraybuffer';
        dataChannel.onopen = async () => 
        {
            console.log("datachannel opened");
            const fileArray = await fileUploaded.arrayBuffer();
            dataChannel.send(fileArray);
        }
    }
}

function downloadFile(blob, fileName){
    console.log("downloading file")
    const a = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove()
  };

camerasEle.addEventListener("input", (inp)=>
{
    getMedia(inp.value)
})


muteBtn.addEventListener("click", ()=>{
    mySteam.getAudioTracks().forEach( track => track.enabled = !track.enabled)
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


videoBtn.addEventListener("click", ()=>{
    mySteam.getVideoTracks().forEach( track => track.enabled = !track.enabled)
    if(!camStatus)
    {
        videoBtn.innerText = "Turn On Camera";
    }
    else
    {
        videoBtn.innerText = "Turn Off Camera";
    }
    camStatus = !camStatus
});


camerasEle.addEventListener("input", async (input)=>{
    await getMedia(camerasEle.value);
    if(peerConn)
    {
        const videoTrack = mySteam.getVideoTracks()[0];
        const videoSender = peerConn.getSenders().find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
});


fileUpload.addEventListener('change', (event) => 
{
    fileUploaded = event.target.files[0];
    console.log(fileUploaded)
    shareFileWithPeer()
});

welcomeForm.addEventListener("submit", async (event) => 
{
    event.preventDefault();
    const roomN = welcomeForm.querySelector("#roomname");
    const name = welcomeForm.querySelector("#name");
    roomName = roomN.value;
    socket.emit("name", name.value, roomName);
    await getMedia();
    makeConnection();
    socket.emit("room" , roomN.value, () => 
    {
        welcomeForm.hidden = true;
        roomForm.hidden = false;
        const roomIdentity = document.getElementById("roomName");
        roomIdentity.innerText = `Room No: ${roomName}`;
        
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
    roomN.value = ""
    name.value = ""
});


socket.on("ice", (ice)=>
{
    console.log("received candidate")
    console.log(ice)
    peerConn.addIceCandidate(ice);
})

socket.on("welcome", async (name) => 
{
    shareFileWithPeer()
    if(dataChannel)
    {
        dataChannel.addEventListener("message", (event) => {
            console.log("message event called in welcome")
            const { data } = event;
            console.log(data)
            try {
              const blob = new Blob([data]);
              downloadFile(blob, dataChannel.label);
              dataChannel.close();
            } catch (err) {
              console.log('File transfer failed');
            }
          });
    }
    addMessage(name+" joined the chat room");
    const rtcOffer = await peerConn.createOffer();
    peerConn.setLocalDescription(rtcOffer);
    socket.emit("offer",rtcOffer, roomName);
});


socket.on("offer", async (offer) => 
{
    peerConn.addEventListener("datachannel", (event) => 
    {
        console.log("received file")
        dataChannel = event.channel;
        console.log("datachannel:   ",dataChannel);
        dataChannel.binaryType = 'arraybuffer';
        dataChannel.addEventListener("message", (event) => {
            console.log("message evenet called")
            const { data } = event;
            console.log(data)
            try {
              const blob = new Blob([data]);
              downloadFile(blob, dataChannel.label);
              dataChannel.close();
            } catch (err) {
              console.log('File transfer failed');
            }
          });
    });
    peerConn.setRemoteDescription(offer);
    const ans = await peerConn.createAnswer();
    console.log("answer:   ",ans);
    peerConn.setLocalDescription(ans);
    socket.emit("answer", ans, roomName);
});

socket.on("bye", (name)=>{
    addMessage(name+" left the chat room!");
})

socket.on("new_message", (msg) => 
{
    addMessage(msg);
});

socket.on("answer", (ans) => 
{
    peerConn.setRemoteDescription(ans);
})

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