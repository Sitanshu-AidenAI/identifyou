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

let username, roomname;
let isAtBottom = true;
let hostname = window.location.host || "127.0.0.1:8787";

function logError(msg) {
  console.error(msg);
  errorBox.innerText = msg;
}

function startNameChooser() {
  console.log("🟢 startNameChooser called");
  roomForm.style.display = "none";

  nameForm.addEventListener("submit", e => {
    e.preventDefault();
    username = nameInput.value.trim();
    if (username.length > 0) {
      console.log("✅ Username set:", username);
      nameForm.style.display = "none";
      roomForm.style.display = "block";
      startRoomChooser();
    } else {
      logError("Please enter a name first!");
    }
  });
}

function startRoomChooser() {
  console.log("🟢 startRoomChooser called");

  goPublicButton.addEventListener("click", () => {
    roomname = roomNameInput.value.trim();
    console.log("👉 Join Room clicked:", roomname);
    if (roomname) startChat();
    else logError("Please enter a room name!");
  });

  goPrivateButton.addEventListener("click", async () => {
    console.log("👉 Create Private Room clicked");
    try {
      let response = await fetch("http://" + hostname + "/api/room", { method: "POST" });
      if (!response.ok) throw new Error("Failed to create room");
      roomname = await response.text();
      console.log("✅ Private room created:", roomname);
      startChat();
    } catch (err) {
      logError(err.message);
    }
  });
}

function startChat() {
  console.log("🚀 Starting chat in room:", roomname);
  roomForm.style.display = "none";

  roomname = roomname.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();

  // ✅ Send message when pressing Enter
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentWebSocket && chatInput.value.trim()) {
        currentWebSocket.send(JSON.stringify({ message: chatInput.value.trim() }));
        console.log("📤 Sent message:", chatInput.value.trim());
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
  console.log("🔗 Connecting to:", wsUrl);

  let ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    console.log("✅ WebSocket opened");
    currentWebSocket = ws;
    ws.send(JSON.stringify({ name: username }));
  });

  ws.addEventListener("message", e => {
    console.log("📩", e.data);
    let data = JSON.parse(e.data);
    if (data.message) addChatMessage(data.name, data.message);
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

document.addEventListener("DOMContentLoaded", startNameChooser);
