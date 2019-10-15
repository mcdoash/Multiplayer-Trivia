const express = require("express");
let app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const request = require("request");

let rooms = [];
let currentRoom = [];


//serve static files
app.use(express.static('public'))

//INVALID REQUEST

//socket.io events
io.on("connection", function(socket) {
    console.log("A connection was made.");
    
    //a user has disconnected
    socket.on("disconnect", () => {
        //disconnection, decrease number of users
        rooms[socket.roomIndex].userNum--;
        
        //REMOVE USER
        
        console.log(socket.username + " left room " + socket.room + ".");
        
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
        rooms.push({id: ("room-" + socket.id), userNum: 0, numAnswered: 0, qNum: 0, round: 1, questions: [], winner: null});
        
        socket.username = name;
        
        socket.join(("room-" + socket.id), () => { 
            setUpUser();
        });
    });
    
    
    function setUpUser() {
        //user properties
        socket.room = Object.values(socket.rooms)[1];
        socket.totalPoints = 0;
        socket.avgScore = 0;
        socket.roundsPlayed = 0;
        socket.wins = 0;
        socket.score = 0;
        
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
        
        //display game status to client
        socket.emit("updateStatus", {round: rooms[socket.roomIndex].round, q: rooms[socket.roomIndex].qNum});
        
        //display client to others users
        socket.broadcast.to(socket.room).emit("addScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //add client to game
        socket.emit("addUser", {name: socket.username, score: socket.score, room: socket.room});

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
    
    
    socket.on("showStats", id => {
        let sockets = io.sockets.sockets;
        
        for(let i in sockets) {
            if(sockets[i].room == socket.room) {
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
                //calculate winner
                calculateWinner();
                
                //start new round
                initQuestions(newRound);
            }
            else {
                //reset answered
                io.to(socket.room).emit("resetAnswered");
                
                io.to(socket.room).emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
            }
            io.to(socket.room).emit("updateStatus", {round: rooms[socket.roomIndex].round, q: rooms[socket.roomIndex].qNum});
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

    function calculateWinner() {
        let scores = [];
        let winners = [];
        
        let sockets = io.sockets.sockets;
        
        //get all scores
        for(let i in sockets) {
            if(sockets[i].room == socket.room) {
                scores.push({name: sockets[i].username, score: sockets[i].score});
            }
        }
        
        //sort all scores
        scores.sort(function(a, b) {
            var x = a.score;
            var y = b.score;
            if(x > y) {
                return -1;
            }
            else if(x < y) {
                return 1;
            }
            else {
                return 0;
            }
        });
        
        winners.push(scores[0].name);
        
        //handle multiple winners
        for(let i=0; i<(scores.length-1); i++) {
            if(scores[i].score === scores[i+1].score){
               winners.push(scores[i+1].name);
            }
            else {
                break;
            }
        }
       
       console.log(winners);
        io.to(socket.room).emit("roundOver", winners);
    }
    
    function newRound() {
        console.log("hmm");
        
        //reset values for new round
        rooms[socket.roomIndex].qNum = 0;
        rooms[socket.roomIndex].round++;
       
        console.log(rooms[socket.roomIndex].round);
        rooms[socket.roomIndex].numAnswered = 0;
              
        //reset everyone's score in room
        let sockets = io.sockets.sockets;
        for(let i in sockets) {
            if(sockets[i].room == socket.room) {
                
                sockets[i].totalPoints += sockets[i].score;
                sockets[i].roundsPlayed++;
                sockets[i].avgScore = sockets[i].totalPoints/sockets[i].roundsPlayed;
                sockets[i].wins = 0;
                sockets[i].score = 0;
            }
        }
        socket.broadcast.to(socket.room).emit("updateScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //update client score on their page
        socket.emit("updateClientScore", socket.score);
        
        //update game status
        io.to(socket.room).emit("updateStatus", {round: rooms[socket.roomIndex].round, q: rooms[socket.roomIndex].qNum});
        
        //send out first question in new round
        io.to(socket.room).emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
    }
    
    function emitQ() {
        socket.emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
    }
});




server.listen(3000);
console.log("Server running on port 3000");