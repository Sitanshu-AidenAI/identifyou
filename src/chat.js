let currentWebSocket = null;

const nameForm = document.querySelector("#name-form");
const nameInput = document.querySelector("#name-input");
const roomForm = document.querySelector("#room-form");
const roomNameInput = document.querySelector("#room-name");
const goPublicButton = document.querySelector("#go-public");
const goPrivateButton = document.querySelector("#go-private");
const chatlog = document.querySelector("#chatlog");
const chatInput = document.querySelector("#chat-input");
const roster = document.querySelector("#roster");
const errorBox = document.querySelector("#error-box");
const leaveButton = document.querySelector("#leave-chat");

let username, roomname;
let isAtBottom = true;
let hostname = window.location.host || "127.0.0.1:8787";
let onlineUsers = new Set();
let readyToChat = false; // ✅ don’t send messages until server confirms

function logError(msg) {
  console.error(msg);
  errorBox.innerText = msg;
}

function startNameChooser() {
  roomForm.style.display = "none";
  nameForm.style.display = "block";

  nameForm.addEventListener("submit", e => {
    e.preventDefault();
    username = nameInput.value.trim();
    if (username.length > 0) {
      localStorage.setItem("username", username);
      nameForm.style.display = "none";
      roomForm.style.display = "block";
      startRoomChooser();
    } else {
      logError("Please enter a name first!");
    }
  });
}

function startRoomChooser() {
  goPublicButton.addEventListener("click", () => {
    roomname = roomNameInput.value.trim();
    if (roomname) {
      localStorage.setItem("roomname", roomname);
      startChat();
    } else logError("Please enter a room name!");
  });

  goPrivateButton.addEventListener("click", async () => {
    try {
      let response = await fetch("http://" + hostname + "/api/room", { method: "POST" });
      if (!response.ok) throw new Error("Failed to create room");
      roomname = await response.text();
      localStorage.setItem("roomname", roomname);
      startChat();
    } catch (err) {
      logError(err.message);
    }
  });
}

function startChat() {
  roomForm.style.display = "none";

  roomname = roomname.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();

  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (readyToChat && currentWebSocket && chatInput.value.trim()) { // ✅ only send when ready
        currentWebSocket.send(JSON.stringify({ message: chatInput.value.trim() }));
        chatInput.value = "";
        chatlog.scrollBy(0, 1e8);
      }
    }
  });

  join();
}

function join() {
  const wss = location.protocol === "http:" ? "ws://" : "wss://";
  const wsUrl = wss + hostname + "/api/room/" + roomname + "/websocket";

  let ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    currentWebSocket = ws;
    readyToChat = false;
    ws.send(JSON.stringify({ name: username }));

    // 🔥 Keep-alive heartbeat
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 20000);
  });

  ws.addEventListener("message", e => {
    let data;
    try {
      data = JSON.parse(e.data);
    } catch {
      return;
    }

    if (data.message) {
      addChatMessage(data.name, data.message);
    } else if (data.joined) {
      onlineUsers.add(data.joined);
      updateRoster();
    } else if (data.quit) {
      onlineUsers.delete(data.quit);
      updateRoster();
    } else if (data.ready) {
      onlineUsers.add(username);
      updateRoster();
      readyToChat = true; // ✅ now allow sending messages
    }
  });

  ws.addEventListener("close", () => logError("WebSocket closed"));
  ws.addEventListener("error", e => logError("WebSocket error: " + e.message));
}

function addChatMessage(name, text) {
  let p = document.createElement("p");
  if (name) {
    let tag = document.createElement("span");
    tag.className = "username";
    tag.innerText = name + ": ";
    p.appendChild(tag);
  }
  p.appendChild(document.createTextNode(text));
  chatlog.appendChild(p);
  if (isAtBottom) chatlog.scrollBy(0, 1e8);
}

function updateRoster() {
  roster.innerHTML = "<p><strong>Online Users</strong></p>";
  onlineUsers.forEach(user => {
    let p = document.createElement("p");
    p.innerText = user;
    roster.appendChild(p);
  });
}

// ✅ Leave chat
function logout() {
  if (currentWebSocket) {
    currentWebSocket.close();
    currentWebSocket = null;
  }
  readyToChat = false;

  localStorage.removeItem("username");
  localStorage.removeItem("roomname");

  chatlog.innerHTML = "";
  roster.innerHTML = "<p><strong>Online Users</strong></p>";
  onlineUsers.clear();

  nameForm.style.display = "block";
  roomForm.style.display = "none";
}

leaveButton.addEventListener("click", logout);

// ✅ Restore session on reload
document.addEventListener("DOMContentLoaded", () => {
  const savedUser = localStorage.getItem("username");
  const savedRoom = localStorage.getItem("roomname");

  if (savedUser && savedRoom) {
    username = savedUser;
    roomname = savedRoom;
    nameForm.style.display = "none";
    roomForm.style.display = "none";
    startChat();
  } else {
    startNameChooser();
  }
});
