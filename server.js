const express = require("express");
let app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static('public'))

io.on("connection", function(socket) {
    console.log("A connection was made.");
    
    socket.on("disconnect", () => {
        console.log("Somebody left.");
    })
})

server.listen(3000);
console.log("Server running on port 3000");