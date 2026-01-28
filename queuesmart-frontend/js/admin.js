function createService() {
  const name = document.getElementById("serviceName").value;
  alert("Service created: " + name);
}

const queueList = document.getElementById("queueList");

for (let i = 1; i <= 3; i++) {
  const li = document.createElement("li");
  li.innerText = "User " + i + " (Priority: Medium)";
  queueList.appendChild(li);
}
