function login() {
  const role = document.getElementById("loginRole").value;

  if (role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "user.html";
  }
}

function register() {
  alert("Registration successful! (Email verification sent — design only)");
}
