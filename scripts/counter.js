const counterButton = document.getElementById("counter");
const stopButton = document.getElementById("stop");
const timerBox = document.getElementById("timer-box");
const activityDetailsDiv = document.getElementById("activity-details-div");
const activeActivityBox = document.getElementById("active-activity");

let timerStamp = null; // To check if the timer is active
let startTime = null;
let elapsedTime = 0;

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds/1000);
    const hours = Math.floor(totalSeconds/3600);
    const minutes = Math.floor((totalSeconds % 3600)/60);
    const seconds = totalSeconds % 60;
    
    const lstTime = [hours, minutes, seconds].map(value => String(value).padStart(2,"0"))
    if (hours == "00") {
        return lstTime.slice(1).join(":");
    }

    return lstTime.join(":");
}

function updateTimer() {
    const now = Date.now();

    elapsedTime = now - startTime;
    timerBox.textContent = formatTime(elapsedTime);
}

counterButton.addEventListener("click", () => {
    if (timerStamp != null){
        return
    }
    let activityDetailsStr = document.getElementById("activity-details").value;
    // get project, activity from activity Details to save it into database
    // if the activity details is empty put a random activity or ask for the name of the activity
    if (activityDetailsStr == "") {
        activityDetailsStr = "Random activity @RandomProject"
    }
    counterButton.hidden = true;
    stopButton.hidden = false;
    // include active-activity box to show and hide the actividad proyecto input box
    activeActivityBox.hidden = false;
    activeActivityBox.textContent = activityDetailsStr;
    activityDetailsDiv.hidden = true;

    startTime = Date.now();

    timerStamp = setInterval(updateTimer, 250);

})

stopButton.addEventListener("click", () => {
    
    if (timerStamp == null) {
        return;
    }

    counterButton.hidden = false;
    stopButton.hidden = true;
    // include active-activity box to show and hide the actividad proyecto input box
    activeActivityBox.hidden = true;
    activeActivityBox.textContent = "";
    activityDetailsDiv.hidden = false;

    clearInterval(timerStamp);
    timerStamp = null;
    elapsedTime = 0;
    timerBox.textContent = "00:00";
    
    // Save activity in the database
    // show last activities in the historial app as well
    console.log("saving elapsed time in db")
})