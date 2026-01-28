let position = null;

function joinQueue() {
  position = Math.floor(Math.random() * 5) + 1;
  document.getElementById("position").innerText = "Position: " + position;
  document.getElementById("waitTime").innerText =
    "Estimated Wait: " + position * 5 + " minutes";

  alert("You have joined the queue!");
}

function leaveQueue() {
  position = null;
  document.getElementById("position").innerText = "Position: -";
  document.getElementById("waitTime").innerText = "Estimated Wait: -";
  alert("You left the queue.");
}
