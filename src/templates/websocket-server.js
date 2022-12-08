const wss = new WebSocket.Server({server});
const connections = [];

wss.on("connection", (socket) =>
{
    socket["nickName"] = "Anonymous";
    connections.push(socket);
    console.log("Connected with Browser");

    socket.addEventListener("close", ()  =>
    {
        console.log("Connection is closed with a browser");
    });

    socket.on("message", (message) => 
    {
       const parsed = JSON.parse(message);
       switch(parsed.type)
       {
        case "message":
            connections.forEach((aSocket) => aSocket.send(`${socket.nickName}: ${parsed.payload}`));
            break;
        case "nickName":
            socket["nickName"] = parsed.payload;
            console.log(parsed.payload);
            break;
       }
    });

    socket.on('message', (message, isBinary) => 
    {
        const messageString = isBinary ? message : message.toString('utf8');
        connections.forEach((aSockets) => aSockets.send(message.toString()));
    });
});