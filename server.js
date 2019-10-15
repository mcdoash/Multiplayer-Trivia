const express = require("express");
let app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const request = require("request");

let rooms = [];
let currentRoom = [];


//serve static files
app.use(express.static('public'))


//socket.io events
io.on("connection", function(socket) {
    console.log("A connection was made.");
    
    //a user has disconnected
    socket.on("disconnect", () => {
        //disconnection, decrease number of users
        rooms[socket.roomIndex].userNum--;
        
        //REMOVE USER
        
        console.log(socket.username + " left.");
        
        //if there are no users connected
        if(rooms[socket.roomIndex].userNum === 0){
            console.log("No users connected.")
            //stop game
        }
    });
    
    //a user attemted to join a room
    socket.on("attempedJoin", data => {
        let code = data.code;
        let name = data.name;
        let validCode = false;
        
        for(let i=0; i<rooms.length; i++) {
            if(rooms[i].id == code) {
                validCode = true;
                break;
            }
        }
        if(validCode == false) {
            socket.emit("alert", "Invalid code");
        }
        else {
            socket.username = name;
            
            socket.join(code, () => {
                setUpUser();
            });
        }
    });
    
    //a user created a room
    socket.on("createRoom", name => {
        //room name is the id of the client who created it
        rooms.push({id: ("room-" + socket.id), userNum: 0, numAnswered: 0, qNum: 0, questions: []});
        
        socket.username = name;
        
        socket.join(("room-" + socket.id), () => { 
            setUpUser();
        });
    });
    
    
    function setUpUser() {
        socket.score = 0;
        socket.room = Object.values(socket.rooms)[1];
        
        console.log(socket.username + " joined " + socket.room + "!");
        
        //find index of room array socket is in to change values
        let index = rooms.findIndex(r => r.id == socket.room);
        
        socket.roomIndex = index;
        rooms[socket.roomIndex].userNum++;
        
        //display question to client
        if(rooms[socket.roomIndex].userNum == 1) {
            initQuestions(emitQ);
        }
        else {
            emitQ();
        }
        
        //display client to others users
        socket.broadcast.to(socket.room).emit("addScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //add client to game
        socket.emit("addUser", {name: socket.username, score: socket.score});

    }
    
    socket.on("initScores", id => {
        let sockets = io.sockets.sockets;
        
        for(let i in sockets) {
            //if the sockets are not the same and they're not in the same room, add score
            if(sockets[i].id != socket.id && sockets[i].room == socket.room) {
                socket.emit("addScore", {id: sockets[i].id, name: sockets[i].username, score: sockets[i].score});
                //answered styling
            }
        }
    });
    
    
    
    //when a user has answered a question
    socket.on("qAnswered", score => {
        socket.score += score;
        if(socket.score < 0) {
            socket.score = 0;
        }
        //show others client has answered
        socket.broadcast.to(socket.room).emit("userAnswered", socket.id);
        
        //show others client's new score
        socket.broadcast.to(socket.room).emit("updateScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //update client score on their page
        socket.emit("updateClientScore", socket.score);
        
        rooms[socket.roomIndex].numAnswered++;
        
        //if everyone has answered, move on to the next question
        if(rooms[socket.roomIndex].numAnswered === rooms[socket.roomIndex].userNum) {
            rooms[socket.roomIndex].qNum++;
            rooms[socket.roomIndex].numAnswered = 0; //reset
            
            //end of round
            if(rooms[socket.roomIndex].qNum === 5){
        
                //reset values for new round
                rooms[socket.roomIndex].qNum = 0;
                rooms[socket.roomIndex].numAnswered = 0;
                
                initQuestions(startRound);
            }
            else {
                //reset answered
                io.to(socket.room).emit("resetAnswered");
                
                io.to(socket.room).emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
            }
        }
    });
    
    function initQuestions(callback) {
        //request questions from OTDB
        request("https://opentdb.com/api.php?amount=5", {json: true}, (err, res, body) => {
            if(err) {
                alert("Request failed.");
            }
            //set questions
            rooms[socket.roomIndex].questions = body.results;
            callback();
        });
    }

    function startRound() {
        io.to(socket.room).emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
    }
    
    function emitQ() {
        socket.emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
    }
});




server.listen(3000);
console.log("Server running on port 3000");