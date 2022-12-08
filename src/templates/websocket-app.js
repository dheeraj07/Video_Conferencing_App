const socket = new WebSocket(`ws://${window.location.host}`);

const ul = document.querySelector("ul");
const messageForm = document.querySelector("#message");
const nameForm = document.querySelector("#name");
const messageList = {}

messageForm.addEventListener("submit", (event) =>
{
    event.preventDefault();
    const input = messageForm.querySelector("input");
    socket.send(makeMessage("message", input.value));
    input.value = "";
})

nameForm.addEventListener("submit",(event)=>
{
    event.preventDefault();
    const input = nameForm.querySelector("input");
    socket.send(makeMessage("nickName", input.value));
    input.value = "";

})

socket.addEventListener("open",()=>
{
    console.log("Connected to server!!");
});

socket.addEventListener("message",(message)=>
{
    console.log("Rceeived message: "+message.data);
    const liElement = document.createElement("li");
    liElement.innerText = message.data;
    ul.append(liElement);
})

socket.addEventListener("close",()=>
{
    console.log("Disconnected from server!!");
})

function makeMessage(type, payload)
{
    const msg = {type, payload};
    return JSON.stringify(msg);
}