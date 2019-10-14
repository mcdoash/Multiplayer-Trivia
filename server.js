const express = require("express");
let app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const request = require("request");

let userNum = 0;
let questions;
let rooms = [];


//serve static files
app.use(express.static('public'))


//socket.io events
io.on("connection", function(socket) {
    console.log("A connection was made.");
    
    socket.on("disconnect", () => {
        //disconnection, decrease number of users
        userNum--;
        
        //REMOVE USER
        
        console.log(socket.username + " left.");
        
        //if there are no users connected
        if(userNum === 0){
            console.log("No users connected.")
            //stop game
        }
    });
    
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
    
    socket.on("createRoom", name => {
        //room name is the id of the client who created it
        rooms.push({id: ("room-" + socket.id), userNum: 1, numAnswered: 0});
        socket.join("room-" + socket.id);
        
        socket.username = name;
        initQuestions(setUpUser);
    });
    
    
    function setUpUser() {
        socket.score = 0;
        socket.roomId = Object.values(socket.rooms)[1];
        
        console.log(socket.username + " joined " + socket.roomId + "!");
        
        //find index of room array socket is in to change values
        let index = rooms.findIndex(r => r.id == socket.roomId);
        
        socket.room = rooms[index];
        socket.room[userNum] += 1;
        
        //display question to client
        socket.emit("newQuestion", questions[qNum]);
    
        //display client to others users
        socket.broadcast.to(socket.roomId).emit("addScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //add client to game
        socket.emit("addUser", {name: socket.username, score: socket.score});

    }
    
    socket.on("initScores", id => {
        let sockets = io.sockets.sockets;
        
        for(let i in sockets) {
            //if the sockets are not the same and they're not in the same room, add score
            if(sockets[i].id != socket.id && sockets[i].room === socket.roomId) {
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
        socket.broadcast.to(socket.roomId).emit("userAnswered", socket.id);
        
        //show others client's new score
        socket.broadcast.to(socket.roomId).emit("updateScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //update client score on their page
        socket.emit("updateClientScore", socket.score);
        
        numAnswered++;
        
        //if everyone has answered, move on to the next question
        if(numAnswered === userNum) {
            qNum++;
            numAnswered = 0; //reset
            
            //end of round
            if(qNum === 5){
                initQuestions(startRound);
            }
            else {
                //reset answered
                io.to(socket.roomId).emit("resetAnswered");
                
                io.to(socket.roomId).emit("newQuestion", questions[qNum]);
            }
        }
    });
});


function initQuestions(callback) {
    //reset values for new round
    qNum = 0;
    numAnswered = 0;

    //request questions from OTDB
    request("https://opentdb.com/api.php?amount=5", {json: true}, (err, res, body) => {
        if(err) {
            alert("Request failed.");
        }
        //set questions
        questions = body.results;
        callback();
    });
}

function startRound() {
    io.to(socket.roomId).emit("newQuestion", questions[qNum]);
}

server.listen(3000);
console.log("Server running on port 3000");