let socket = null;
let qNum = 0;
let correctAnswer = "";

function joinGame() {
    let name = document.forms["join-game"]["name"].value;
    
    if(name == null) {
        alert("Please enter a name");
    }
    else {
        if(socket == null) {
            socket = io();
            socket.on("addUser", addToGame);
            socket.on("addScore", addScore);
            socket.on("userAnswered", userAnswered);
            socket.on("resetAnswered", resetAnswered);
            socket.on("newQuestion", nextQ);
            socket.on("updateScore", updateScore);
            socket.on("updateClientScore", updateClientScore);
            
            socket.emit("newUser", name);
        }
    }
}

function addToGame(data) {
    let name = data.name;
    let score = data.score;
    
    //initialize scores
    socket.emit("initScores", socket.id);
    
    let joinForm = document.getElementById("join-game");
    let gameScreen = document.getElementById("game");
    let clientScore = document.getElementById("client-info");

    //
    let html = '<h1>' + name + '</h1><h1 id="client-score">' + score + '</h1></div>'
    clientScore.innerHTML = html;
    
    //hide join form and show game screen
    joinForm.style.display = "none";
    gameScreen.style.display = "flex";
}


/*

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
    correctAnswer = q.correct_answer; //save correct answer
    
    
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

function questionAnswered(selected) {
    let score = -100; //default incorrect
    
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
    
    //tell the server client answered the question
    socket.emit("qAnswered", score);
}

function addScore(data) {
    let id = data.id;
    let name = data.name;
    let score = data.score;
    
    let scores = document.getElementById("scores");
    
    let userScore = document.createElement("div");
    userScore.setAttribute("id", id);
    userScore.classList.add("others-scores");
    
    let scoreContent = "<h2>" + name + ": &nbsp;" + score + "</h2></div>";
    
    userScore.innerHTML = scoreContent;
    scores.appendChild(userScore);
}

function updateScore(data) {
    let id = data.id;
    let name = data.name;
    let score = data.score;
    
    let scoreDiv = document.getElementById(id);
    let html = "";
    
    html += '<h2>' + name + ': &nbsp;' + score + '</h2>';
}

function updateClientScore(score) {
    //update client's score on page
    document.getElementById("client-score").textContent = score;
}

function userAnswered(id) {
    let user = document.getElementById(id);
    if(user != null) {
        user.classList.add("answered");
    }
    
}
function resetAnswered() {
    let scores = document.getElementsByClassName("others-scores");
    
    for(let i=0; i<scores.length; i++) {
        scores[i].classList.remove("answered");
    }
}