//create socket connection and events 
let socket = io();
socket.on("alert", sendAlert);
socket.on("addUser", addToGame);
socket.on("addScore", addScore);
socket.on("userAnswered", userAnswered);
socket.on("resetAnswered", resetAnswered);
socket.on("newQuestion", nextQ);
socket.on("updateScore", updateScore);
socket.on("updateClientScore", updateClientScore);

let qNum = 0;
let correctAnswer = "";

/*

*/
function joinGame() {
    let name = document.forms["join-game"]["name"].value;
    let code = document.forms["join-game"]["room"].value;
    
    if(name == "") {
        alert("Please enter a name");
    }
    else {
        socket.emit("attempedJoin", {code: code, name: name});
    }
}


/*
Sends alert to client 
@param      message     the message to be displayed in the alert
*/
function sendAlert(message) {
    alert(message);
}


/*
Emits an attempt to create a new game to the server
*/
function createGame() {
    //get the name user entered
    let name = document.forms["join-game"]["name"].value;
    
    //display alert if no name entered
    if(name == "") {
        alert("Please enter a name");
    }
    else {
        socket.emit("createRoom", name);
    }
}

/*
Adds the client to the game by hiding thr "join game" screen and showing the trivia screen
@params     data    an object containing:
                    name:   the name of the client
                    score:  the score of the client
*/
function addToGame(data) {
    //get values from data
    let name = data.name;
    let score = data.score;
    
    //initialize scores on game screen
    socket.emit("initScores", socket.id);
    
    let joinForm = document.getElementById("join-game");
    let gameScreen = document.getElementById("game");
    let clientScore = document.getElementById("client-info");

    //initialize client score
    let html = '<h1>' + name + '</h1><h1 id="client-score">' + score + '</h1></div>'
    clientScore.innerHTML = html;
    
    //hide join form and show game screen
    joinForm.style.display = "none";
    gameScreen.style.display = "flex";
}


/*
Shows the next question to the client
@params     q       an object containing:
                    category: the category of the question
                    type: the type of the question (true/false) or multiple choice
                    difficulty: the difficulty of the question
                    question: the question text
                    correct_answer: the correct answer to the question
                    incorrect_answers: the remaining incorrect answers to the question
*/
function nextQ(q) {
    //html for question data
    let html = "";
    
    //add question info to html string
    html += '<div class="question" id="' + qNum + '"><h1>' + q.question + '</h1><h2 id="q-info">Category: ' + q.category + ' | Difficulty: ' + q.difficulty + '</h2><hr/><div class="options">';
    
    //get options
    let options = [];
    for(let x=0; x<q.incorrect_answers.length; x++) {
        options.push(q.incorrect_answers[x]);
    }
    options.push(q.correct_answer);
    correctAnswer = q.correct_answer; //save correct answer for later use
    
    //randomize option order
    for(let i=options.length-1; i>0; i--) {
        let rand = Math.floor(Math.random() * i);
        let temp = options[rand];
        options[rand] = options[i];
        options[i] = temp;
    }

    //build options
    for(let x=0; x<options.length; x++) {
        html += '<div class="radio" onclick="questionAnswered(this)" name="' + qNum + '" value="' + options[x] + '">' + options[x] + '</div>';
    }
    html += '</div></div>';
    
    //add the question html to the page
    document.getElementById("trivia").innerHTML = html;
    
    //increase the question number
    qNum++;
}

/*
Checks the selected answer for correctness and emits this to the server
@params     selected        the div element that called the function on click
*/
function questionAnswered(selected) {
    let score = -100; //default incorrect
    
    //get all the available options
    let options = document.getElementsByClassName("radio");
    
    //disable all options + add styling
    for(let i=0; i<options.length; i++) {
        options[i].onclick = null;
        options[i].classList.add("disabled");
    }
    
    //add styling for selected option
    selected.classList.add("selected");
    selected.classList.remove("disabled");
    
    //check if option was correct
    if(selected.getAttribute("value").localeCompare(correctAnswer) === 0) {
        score = 100; //add 100 to score
    }
    
    //tell the server the client answered the question and the result
    socket.emit("qAnswered", score);
}


/*
Adds another user's score to the clients score sheet
@params     data    an object containing:
                    id: the user's id
                    name:   the name of the user
                    score:  the score of the user
*/
function addScore(data) {
    //get values from data
    let id = data.id;
    let name = data.name;
    let score = data.score;
    
    //get score containter
    let scores = document.getElementById("scores");
    
    //create new score element
    let userScore = document.createElement("div");
    userScore.setAttribute("id", id);
    userScore.classList.add("others-scores");
    
    //set score content and append to container
    let scoreContent = "<h2>" + name + ": &nbsp;" + score + "</h2></div>";
    userScore.innerHTML = scoreContent;
    scores.appendChild(userScore);
}


/*
Updates another user's score on the clients score sheet
@params     data    an object containing:
                    id: the user's id
                    name:   the name of the user
                    score:  the score of the user
*/
function updateScore(data) {
    //get variabled from data
    let id = data.id;
    let name = data.name;
    let score = data.score;
    
    //get the corresponding score div of the user 
    let scoreDiv = document.getElementById(id);
    
    //update score content
    let html = "";
    html += '<h2>' + name + ': &nbsp;' + score + '</h2>';
    scoreDiv.innerHTML = html;
}


/*
Updates the client's score on their score sheet
@params     score       the client's new score
*/
function updateClientScore(score) {
    document.getElementById("client-score").textContent = score;
}


/*
Lets the client know a particular user has answered the current question
@params     id      the id of the user who just answered
*/
function userAnswered(id) {
    //get the corresponding user div on the score card
    let user = document.getElementById(id);
    
    //as long as it's not null, set styling to answered
    if(user != null) {
        user.classList.add("answered");
    }
}


/*
Resets the styling of all users to unanswered
*/
function resetAnswered() {
    //get all user scores on the score sheet
    let scores = document.getElementsByClassName("others-scores");
    
    //removed answered styling
    for(let i=0; i<scores.length; i++) {
        scores[i].classList.remove("answered");
    }
}