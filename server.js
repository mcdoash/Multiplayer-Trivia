const express = require("express");
let app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const request = require("request");

let userNum = 0;
let questions;
let qNum = 0;
let numAnswered = 0;


//serve static files
app.use(express.static('public'))


//socket.io events
io.on("connection", function(socket) {
    //connection made, increase number of users
    userNum++;
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
    
    //set base vaules for new user
    socket.on("newUser", name => {
        //start game if this is the first user
        if(userNum === 1) {
            initQuestions(setUpUser);
        }
        else {
            setUpUser();
        }
        
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
        
        function setUpUser() {
            console.log(name + " (#" + socket.id + ") joined!");
        
            socket.username = name;
            socket.score = 0;
            
            //add client to game
            socket.emit("addUser", {name: socket.username, score: socket.score});
            
            //display client to others users
            socket.broadcast.emit("addScore", {id: socket.id, name: socket.username, score: socket.score});
            
            //display question to client
            socket.emit("newQuestion", questions[qNum]);
        }
    });
    
    socket.on("initScores", id => {
        let sockets = io.sockets.sockets;
        
        for(let i in sockets) {
            if(sockets[i].id != socket.id) {
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
        socket.broadcast.emit("userAnswered", socket.id);
        
        //shoe others client's new score
        socket.broadcast.emit("updateScore", {id: socket.id, name: socket.username, score: socket.score});
        
        //update client score on their page
        socket.emit("updateClientScore", socket.score);
        
        numAnswered++;
        
        //if everyone has answered, move on to the next question
        if(numAnswered === userNum) {
            qNum++;
            numAnswered = 0; //reset
            
            //end of round
            if(qNum === 5){
                
            }
            else {
                //reset answered
                io.emit("resetAnswered");
                
                io.emit("newQuestion", questions[qNum]);
            }
        }
    });
});


server.listen(3000);
console.log("Server running on port 3000");