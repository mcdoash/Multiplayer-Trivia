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
        console.log(socket.username + " left.");
        
        //if there are no users connected
        if(userNum === 0){
            console.log("No users connected.")
            //stop game
        }
    });
    
    //set base vaules for new user
    socket.on("newUser", name => {
        console.log(name + " joined!");
        socket.username = name;
        socket.score = 0;
        socket.emit("addUser", name);
        
        //start game if this is the first user
        if(userNum === 1) {
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
                
                //display first question
                socket.emit("newQuestion", questions[qNum]);
            });
        }
    });
    
    //when a user has answered a question
    socket.on("qAnswered", score => {
        socket.score += score; //update their score
        numAnswered++;
        
        //if everyone has answered, move on to the next question
        if(numAnswered === userNum) {
            qNum++;
            socket.emit("newQuestion", questions[qNum]);
        }
    });
    
    /*socket.on("nextQ", q => {
        qNum++;
        socket.emit("newQuestion", questions[qNum]);
    });*/
});


server.listen(3000);
console.log("Server running on port 3000");