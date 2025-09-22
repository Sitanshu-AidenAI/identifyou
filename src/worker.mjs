import HTML from "./chat.html";

async function handleErrors(request, func) {
  try {
    return await func();
  } catch (err) {
    console.error(err);
    if (request.headers.get("Upgrade") === "websocket") {
      let pair = new WebSocketPair();
      pair[1].accept();
      pair[1].send(JSON.stringify({ error: "Internal server error" }));
      pair[1].close(1011, "Uncaught exception during session setup");
      return new Response(null, { status: 101, webSocket: pair[0] });
    } else {
      return new Response("Internal server error", { status: 500 });
    }
  }
}

export default {
  async fetch(request, env) {
    return await handleErrors(request, async () => {
      let url = new URL(request.url);
      let path = url.pathname.slice(1).split("/");

      if (!path[0]) {
        return new Response(HTML, {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }

      switch (path[0]) {
        case "api":
          return handleApiRequest(path.slice(1), request, env);
        default:
          return new Response("Not found", { status: 404 });
      }
    });
  },
};

async function handleApiRequest(path, request, env) {
  switch (path[0]) {
    case "room": {
      if (!path[1]) {
        if (request.method === "POST") {
          // 🔒 Optionally, you could call RateLimiter here before creating a room
          let id = env.rooms.newUniqueId();
          return new Response(id.toString(), {
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        } else {
          return new Response("Method not allowed", { status: 405 });
        }
      }

      let name = path[1];
      let id;

      if (name.match(/^[0-9a-f]{64}$/)) {
        id = env.rooms.idFromString(name);
      } else if (name.length <= 32) {
        id = env.rooms.idFromName(name);
      } else {
        return new Response("Name too long", { status: 404 });
      }

      let roomObject = env.rooms.get(id);
      let newUrl = new URL(request.url);
      newUrl.pathname = "/" + path.slice(2).join("/");
      return roomObject.fetch(newUrl, request);
    }

    default:
      return new Response("Not found", { status: 404 });
  }
}

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
    this.sessions = new Map();
    this.lastTimestamp = 0;
  }

  async fetch(request) {
    return await handleErrors(request, async () => {
      let url = new URL(request.url);

      switch (url.pathname) {
        case "/websocket": {
          if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("expected websocket", { status: 400 });
          }

          let pair = new WebSocketPair();
          this.handleSession(pair[1]);
          return new Response(null, { status: 101, webSocket: pair[0] });
        }

        default:
          return new Response("Not found", { status: 404 });
      }
    });
  }

  async handleSession(webSocket) {
    this.state.acceptWebSocket(webSocket);
    let session = { blockedMessages: [] };
    this.sessions.set(webSocket, session);

    // Load last 100 messages
    let storage = await this.storage.list({ reverse: true, limit: 100 });
    let backlog = [...storage.values()];
    backlog.reverse().forEach((msg) => {
      session.blockedMessages.push(msg);
    });
  }

  async webSocketMessage(webSocket, msg) {
    let session = this.sessions.get(webSocket);
    if (!session) {
      return; // guard: ignore if socket not tracked
    }

    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      try { webSocket.send(JSON.stringify({ error: "Invalid JSON" })); } catch {}
      return;
    }

    // Heartbeat
    if (data.type === "ping") {
      try { webSocket.send(JSON.stringify({ type: "pong" })); } catch {}
      return;
    }

    // First message must set the name
    if (!session.name) {
      if (!data.name) {
        webSocket.send(JSON.stringify({ error: "Name required before sending messages." }));
        return;
      }
      session.name = "" + data.name;
      if (session.name.length > 32) {
        webSocket.send(JSON.stringify({ error: "Name too long." }));
        webSocket.close(1009, "Name too long.");
        return;
      }

      session.blockedMessages.forEach((queued) => {
        try { webSocket.send(queued); } catch {}
      });
      delete session.blockedMessages;
      this.broadcast({ joined: session.name });
      webSocket.send(JSON.stringify({ ready: true }));
      return;
    }

    if (!session.name) return; // guard: must have name

    if (typeof data.message !== "string" || data.message.trim() === "") {
      return;
    }
    if (data.message.length > 256) {
      webSocket.send(JSON.stringify({ error: "Message too long." }));
      return;
    }

    data = { name: session.name, message: data.message };
    data.timestamp = Math.max(Date.now(), this.lastTimestamp + 1);
    this.lastTimestamp = data.timestamp;

    let dataStr = JSON.stringify(data);
    this.broadcast(dataStr);
    let key = new Date(data.timestamp).toISOString();
    await this.storage.put(key, dataStr);
  }

  async webSocketClose(webSocket) {
    this.closeOrErrorHandler(webSocket);
  }

  async webSocketError(webSocket) {
    this.closeOrErrorHandler(webSocket);
  }

  closeOrErrorHandler(webSocket) {
    let session = this.sessions.get(webSocket) || {};
    session.quit = true;
    this.sessions.delete(webSocket);
    if (session.name) {
      this.broadcast({ quit: session.name });
    }
  }

  broadcast(message) {
    if (typeof message !== "string") {
      message = JSON.stringify(message);
    }

    let quitters = [];
    this.sessions.forEach((session, webSocket) => {
      if (session.name) {
        try {
          webSocket.send(message);
        } catch {
          session.quit = true;
          quitters.push(session);
          this.sessions.delete(webSocket);
        }
      } else {
        session.blockedMessages.push(message);
      }
    });

    quitters.forEach((quitter) => {
      if (quitter.name) {
        this.broadcast({ quit: quitter.name });
      }
    });
  }
}

// ✅ RateLimiter DO added back
export class RateLimiter {
  constructor(state, env) {
    this.nextAllowedTime = 0;
  }

  async fetch(request) {
    return await handleErrors(request, async () => {
      let now = Date.now() / 1000;
      this.nextAllowedTime = Math.max(now, this.nextAllowedTime);

      if (request.method === "POST") {
        // allow one action per 5 seconds
        this.nextAllowedTime += 5;
      }

      // 20s grace period
      let cooldown = Math.max(0, this.nextAllowedTime - now - 20);
      return new Response(cooldown.toString());
    });
  }
}

// ✅ Export Durable Objects map
export const durableObjects = {
  ChatRoom,
  RateLimiter,
};
