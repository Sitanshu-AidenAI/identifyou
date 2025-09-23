const nameForm = document.querySelector("#name-form");
const nameInput = document.querySelector("#name-input");
const roomForm = document.querySelector("#room-form");
const roomNameInput = document.querySelector("#room-name");
const goPublicButton = document.querySelector("#go-public");
const goPrivateButton = document.querySelector("#go-private");
const chatlog = document.querySelector("#chatlog");
const chatInput = document.querySelector("#chat-input");
const roster = document.querySelector("#roster");

let username, roomname, ws;
let onlineUsers = new Set();

function startNameChooser() {
  roomForm.style.display = "none";
  nameForm.style.display = "block";

  nameForm.addEventListener("submit", e => {
    e.preventDefault();
    username = nameInput.value.trim();
    if (username.length > 0) {
      nameForm.style.display = "none";
      roomForm.style.display = "block";
      startRoomChooser();
    }
  });
}

function startRoomChooser() {
  goPublicButton.addEventListener("click", () => {
    roomname = roomNameInput.value.trim();
    if (roomname) {
      window.history.pushState({}, "", `/?room=${roomname}`);
      startChat();
    }
  });

  goPrivateButton.addEventListener("click", async () => {
    let response = await fetch("/api/room", { method: "POST" });
    roomname = await response.text();
    window.history.pushState({}, "", `/?room=${roomname}`);
    startChat();
  });
}

function startChat() {
  roomForm.style.display = "none";
  chatInput.disabled = true;

  if (!/^[0-9a-f]{64}$/i.test(roomname)) {
    roomname = roomname.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
  }

  let protocol = location.protocol === "http:" ? "ws:" : "wss:";
  ws = new WebSocket(protocol + "//" + location.host + "/api/room/" + roomname + "/websocket");

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ name: username }));
  });

  ws.addEventListener("message", e => {
    let data = JSON.parse(e.data);

    if (data.message) {
      addChatMessage(data.name, data.message);
    } else if (data.joined) {
      onlineUsers.add(data.joined);
      updateRoster();
      addChatMessage(null, `${data.joined} joined the chat`);
    } else if (data.quit) {
      onlineUsers.delete(data.quit);
      updateRoster();
      addChatMessage(null, `${data.quit} left the chat`);
    } else if (data.ready) {
      chatInput.disabled = false;
      addChatMessage(null, "You joined the chat");
    } else if (data.error) {
      addChatMessage(null, "⚠ " + data.error);
    }
  });

  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (chatInput.value.trim()) {
        ws.send(JSON.stringify({ message: chatInput.value.trim() }));
        chatInput.value = "";
      }
    }
  });
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
  chatlog.scrollBy(0, 1e8);
}

function updateRoster() {
  roster.innerHTML = "<p><strong>Online Users (" + onlineUsers.size + ")</strong></p>";
  onlineUsers.forEach(user => {
    let p = document.createElement("p");
    p.innerText = user;
    roster.appendChild(p);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  startNameChooser();
});
