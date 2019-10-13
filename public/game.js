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
            //socket.on("initScores", initScores);
            socket.on("newQuestion", nextQ);
            socket.on("updateScore", updateScores)
            socket.emit("newUser", name);
        }
    }
}

function addToGame(name) {
    //hide join form and show game screen
    let joinForm = document.getElementById("join-game");
    let gameScreen = document.getElementById("game");
    /*let scores = document.getElementById("scores");
    
    let userScore = document.createElement("div");
    userScore.setAttribute("id", socket.id);
    userScore.classList.add("others-scores");
    
    let scoreContent = "<h2>" + name + " &nbsp;<sup>0</sup>&frasl;<sub>5</sub></h2><h3>&checkmark; Answered</h3>";
    
    userScore.innerHTML = scoreContent;
    scores.appendChild(userScore);*/

    joinForm.style.display = "none";
    gameScreen.style.display = "flex";
}

function initScores(users) {
    let html = "";
    
    for(let i=0; i<users.length; i++) {
        html += '<div class="others-scores" id="' + users[i].id + '"><h2>' + users[i].name + ' &nbsp;<sup>' + users[i].score + '</sup>&frasl;<sub>5</sub></h2><h3>';
        
        if(users[i].answered == true) {
            html += '&checkmark; Answered';
        }
        else {
            html += 'Waiting...';
        }
        html += '</h3></div>';
    }
    
    document.getElementById("scores").innerHTML = html;
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
    for(let x=0; x<options.length; x++) {
        options[x].onclick = null;
        options[x].classList.add("disabled");
    }
    
    //add styling for selected option
    selected.classList.add("selected");
    selected.classList.remove("disabled");
    
    //check if option was correct
    if(selected.getAttribute("value").localeCompare(correctAnswer) === 0) {
        score = 100; //add 100 to score
        //display
    }
    
    
    //tell the server user answered the question
    socket.answered = true;
    socket.emit("qAnswered", score);
}

function updateScores() {
    let html = "";
}