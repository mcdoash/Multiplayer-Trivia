Ashley McDonald [101119938]

DESIGN DECISIONS
    * Single page app with different parts hidden/shown for smoother user interface
    * The indicator as to whether a player has answered or not is a change to the colour of their name/score.  Grey indicates they have not answered yet.
    * If an incorrect answer is selected and score is already zero, no points will be subtracted.
    * While users can have the same username, each is identified by their unique socket id.
    * If more than one user won, all users with the same highest score will be winners.
    * I used divs instead of radio buttons for further customization.  

ADD ONS
    * Statistics page 
        * When the user clicks on the "show stats" button a modal will pop up showing them the current stats of all users in the room.
        * Shows each user's average score, rounds played, and rounds won.
    * Multiple games
        * Any number of games can be created and played independently of each other.
        * Players can choose to create or join a game.
        * Each room has a unique code that must be entered to join.
        * To insure no two games have the same code, each room code is "room-" + the unique socket id of the user who created it.
        * Questions differ between games.
        * The result of one game will not effect others.