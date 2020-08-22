/*
To-do
update player list on disconnect
disconnect message
*/


const express = require("express");
let app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const request = require("request");


//object containing data for all rooms
let rooms = [];


//serve static files
app.use(express.static('public'))


//socket.io events
io.on("connection", function(socket) {
    console.log("A connection was made.");
    
    //a user has disconnected
    socket.on("disconnect", () => {
        //disconnection, decrease number of users in room
        if(rooms[socket.roomIndex]) {
            rooms[socket.roomIndex].userNum--;
            console.log(socket.username + " left room " + socket.room + ".");
            

            //if there are no users connected in room
            if(rooms[socket.roomIndex].userNum === 0){
                console.log("No users connected.")
            }
            else {
                socket.broadcast.to(socket.room).emit("removePlayer", {id: socket.id});
            }
        }
    });
    
    //a user attempted to join a room
    socket.on("attempedJoin", data => {
        let code = data.code;
        let name = data.name;
        let validCode = false;
        
        //check if entered code matches a valid room id
        for(let i=0; i<rooms.length; i++) {
            if(rooms[i].id == code) {
                validCode = true;
                break;
            }
        }
        //if invalid send alert
        if(validCode == false) {
            socket.emit("alert", "Invalid code");
        }
        else {
            socket.username = name;
            
            //join room and set up user
            socket.join(code, () => {
                setUpUser();
            });
        }
    });
    
    //a user created a room
    socket.on("createRoom", name => {
        //initialize a new room object
        //room name is the id of the client who created it
        rooms.push({id: ("room-" + socket.id), userNum: 0, numAnswered: 0, qNum: 0, round: 1, questions: [], winner: null});
        
        socket.username = name;
        
        //join the new room and set up user
        socket.join(("room-" + socket.id), () => { 
            setUpUser();
        });
    });
    
    
    //initialize user
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
        
        //update number of users in room
        rooms[socket.roomIndex].userNum++;
        
        //initialize test if this is the first user in the room
        if(rooms[socket.roomIndex].userNum == 1) {
            initQuestions(emitQ);
        }
        else {
            //display question to client
            emitQ();
        }
        
        //display game status to client
        socket.emit("updateStatus", {round: rooms[socket.roomIndex].round, q: rooms[socket.roomIndex].qNum});
        
        //display client to other users
        socket.broadcast.to(socket.room).emit("addScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //add client to game
        socket.emit("addUser", {name: socket.username, score: socket.score, room: socket.room});
    }
    
    //initialize scorecard
    socket.on("initScores", id => {
        //get all connected sockets
        let sockets = io.sockets.sockets;
        
        for(let i in sockets) {
            //if the sockets are not the same and they're not in the same room, add score
            if(sockets[i].id != socket.id && sockets[i].room == socket.room) {
                socket.emit("addScore", {id: sockets[i].id, name: sockets[i].username, score: sockets[i].score});
            }
        }
    });
    
    //show the stats for all users in room
    socket.on("showStats", id => {
        //get all connected sockets
        let sockets = io.sockets.sockets;
        
        for(let i in sockets) {
            //if they're in the room add their stats
            if(sockets[i].room == socket.room) {
                socket.emit("initStats", {name: sockets[i].username, rounds: sockets[i].roundsPlayed, avg: sockets[i].avgScore, wins: sockets[i].wins});
            }
        }
    });
    
    
    //when a user has answered a question
    socket.on("qAnswered", score => {
        //increase the score
        socket.score += score;
        
        //don't let score go below zero
        if(socket.score < 0) {
            socket.score = 0;
        }
        
        //show others client has answered
        socket.broadcast.to(socket.room).emit("userAnswered", socket.id);
        
        //show others client's new score
        socket.broadcast.to(socket.room).emit("updateScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //update client score on their page
        socket.emit("updateClientScore", socket.score);
        
        //increase number of users who have answered
        rooms[socket.roomIndex].numAnswered++;
        
        //if everyone has answered, move on to the next question
        if(rooms[socket.roomIndex].numAnswered === rooms[socket.roomIndex].userNum) {
            rooms[socket.roomIndex].qNum++;
            rooms[socket.roomIndex].numAnswered = 0; //reset
            
            //end of round
            if(rooms[socket.roomIndex].qNum === 5){
                //reset values for new round
                rooms[socket.roomIndex].qNum = 0;
                rooms[socket.roomIndex].round++;
                rooms[socket.roomIndex].numAnswered = 0;

                //array for current round scores
                let scores = [];
                
                //get all connected sockets
                let sockets = io.sockets.sockets;
                
                //reset everyone's score in room
                for(let i in sockets) {
                    if(sockets[i].room == socket.room) {
                        //add their score to the array to determine winner latter
                        scores.push({name: sockets[i].username, score: sockets[i].score});
                        
                        //change properties
                        sockets[i].totalPoints += sockets[i].score;
                        sockets[i].roundsPlayed++;
                        sockets[i].avgScore = sockets[i].totalPoints/sockets[i].roundsPlayed;
                        sockets[i].wins = 0;
                        sockets[i].score = 0; //reset
                         
                        //update specific socket score
                        io.to(socket.room).emit("updateScore", {id: sockets[i].id, name: sockets[i].username, score: sockets[i].score});
                        
                        //update client score on their page
                        sockets[i].emit("updateClientScore", sockets[i].score);
                    }
                }
                //calculate winner
                calculateWinner(scores);
                
                //reset answered
                io.to(socket.room).emit("resetAnswered");
                
                //start new round
                initQuestions(newRound);
            }
            //if round isn't over yet
            else {
                //reset answered
                io.to(socket.room).emit("resetAnswered");
                
                //show next question
                io.to(socket.room).emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
            }
           //update game status
            io.to(socket.room).emit("updateStatus", {round: rooms[socket.roomIndex].round, q: rooms[socket.roomIndex].qNum});
        }
    });
    
    //initialize questions for a room
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

    //calculate the winner of a round
    function calculateWinner(scores) {
        let winners = [];
        
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
        
        //the first index of the score array has the highest score and is therefore the winner
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
        //show winner to users
        io.to(socket.room).emit("roundOver", winners);
    }
    
    //start a new round
    function newRound() {
        //update game status
        io.to(socket.room).emit("updateStatus", {round: rooms[socket.roomIndex].round, q: rooms[socket.roomIndex].qNum});
        
        //send out first question in new round
        io.to(socket.room).emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
    }
    
    //emit a question to the client only
    function emitQ() {
        socket.emit("newQuestion", rooms[socket.roomIndex].questions[rooms[socket.roomIndex].qNum]);
    }
});


//start server
server.listen(3000);
console.log("Server running on port 3000");