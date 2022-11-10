import express from "express";
const { instrument } = require("@socket.io/admin-ui");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = require("express")();
const httpServer = createServer(app);

const sio = new Server(httpServer, 
{
  cors: 
  {
    origin: ["https://admin.socket.io"],
    credentials: true
  }
});

instrument(sio, 
{
    auth: false
});
  
httpServer.listen(3000);

app.set('view engine', "pug");
app.set('views', __dirname+"/views")
app.use("/public", express.static(__dirname + '/public'));
app.get("/", (req, res) => res.render("home"));
app.get("/*",(req, res) => res.redirect("/"));

function publicRoom()
{
    const sids = sio.of("/").adapter.sids;
    const rooms = sio.of("/").adapter.rooms;
    const publicRooms = [];
    if(rooms != undefined)
    {
        rooms.forEach((value, key) => {
            let obj = {};
            if(sids.get(key) === undefined)
            {
                const peopl = countPeopleInRoom(key);
                obj[key] = peopl;
                publicRooms.push(obj);
            }
    
        });
    }
    return publicRooms;
}

function countPeopleInRoom(room)
{
    return sio.sockets.adapter.rooms.get(room).size
}

sio.on("connection", (socket) => 
{
    socket["name"] = "Anonymous";
    socket.onAny((event) => 
    {
        console.log(`Event is: ${event}`)
    });
    socket.on("name", (name) =>
    {
        socket["name"] = name;
    })
    socket.on("room", (roomName, funcb) => 
    {
        socket.join(roomName)
        funcb();
        socket.to(roomName).emit("welcome", socket.name);
        sio.sockets.emit("room_change", publicRoom());
    });
    socket.on("disconnecting", () => 
    {
        socket.rooms.forEach((eachRoom) => socket.to(eachRoom).emit("bye", socket.name)); 
    });

    socket.on("disconnect", () => 
    {
        sio.sockets.emit("room_change", publicRoom());
    });

    socket.on("sendMessage", (msg, roomName, funcb) =>
    {
        socket.to(roomName).emit("new_message", `${socket.name}: ${msg}`);
        funcb();
    });

    socket.on("offer", (offer, roomName)=>
    {
        console.log("offer received");
        socket.to(roomName).emit("offer", offer);
    });

    socket.on("answer", (ans, roomName) => 
    {
        socket.to(roomName).emit("answer", ans);
    });

    socket.on("ice", (ice, roomName) =>
    {
        socket.to(roomName).emit("ice", ice); 
    })
});