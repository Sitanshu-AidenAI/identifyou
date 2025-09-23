var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.mjs
import HTML from "./5cd3c12b619a0f201c10116ae1d452a46f52fcdb-chat.html";
async function handleErrors(request, func) {
  try {
    return await func();
  } catch (err) {
    if (request.headers.get("Upgrade") == "websocket") {
      let pair = new WebSocketPair();
      pair[1].accept();
      pair[1].send(JSON.stringify({ error: err.stack }));
      pair[1].close(1011, "Uncaught exception during session setup");
      return new Response(null, { status: 101, webSocket: pair[0] });
    } else {
      return new Response(err.stack, { status: 500 });
    }
  }
}
__name(handleErrors, "handleErrors");
var worker_default = {
  async fetch(request, env) {
    return await handleErrors(request, async () => {
      let url = new URL(request.url);
      let path = url.pathname.slice(1).split("/");
      if (!path[0]) {
        return new Response(HTML, {
          headers: { "Content-Type": "text/html;charset=UTF-8" }
        });
      }
      switch (path[0]) {
        case "api":
          return handleApiRequest(path.slice(1), request, env);
        default:
          return new Response("Not found", { status: 404 });
      }
    });
  }
};
async function handleApiRequest(path, request, env) {
  switch (path[0]) {
    case "room": {
      if (!path[1]) {
        if (request.method == "POST") {
          let id2 = env.rooms.newUniqueId();
          return new Response(id2.toString(), {
            headers: { "Access-Control-Allow-Origin": "*" }
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
__name(handleApiRequest, "handleApiRequest");
var ChatRoom = class {
  static {
    __name(this, "ChatRoom");
  }
  constructor(state, env) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
    this.sessions = /* @__PURE__ */ new Map();
    this.state.getWebSockets().forEach((webSocket) => {
      let meta = webSocket.deserializeAttachment();
      let limiterId = this.env.limiters.idFromString(meta.limiterId);
      let limiter = new RateLimiterClient(
        () => this.env.limiters.get(limiterId),
        (err) => webSocket.close(1011, err.stack)
      );
      let blockedMessages = [];
      this.sessions.set(webSocket, { ...meta, limiter, blockedMessages });
    });
    this.lastTimestamp = 0;
  }
  async fetch(request) {
    return await handleErrors(request, async () => {
      let url = new URL(request.url);
      switch (url.pathname) {
        case "/websocket": {
          if (request.headers.get("Upgrade") != "websocket") {
            return new Response("expected websocket", { status: 400 });
          }
          let ip = request.headers.get("CF-Connecting-IP");
          let pair = new WebSocketPair();
          await this.handleSession(pair[1], ip);
          return new Response(null, { status: 101, webSocket: pair[0] });
        }
        default:
          return new Response("Not found", { status: 404 });
      }
    });
  }
  async handleSession(webSocket, ip) {
    this.state.acceptWebSocket(webSocket);
    let limiterId = this.env.limiters.idFromName(ip);
    let limiter = new RateLimiterClient(
      () => this.env.limiters.get(limiterId),
      (err) => webSocket.close(1011, err.stack)
    );
    let session = { limiterId, limiter, blockedMessages: [] };
    webSocket.serializeAttachment({
      ...webSocket.deserializeAttachment(),
      limiterId: limiterId.toString()
    });
    this.sessions.set(webSocket, session);
    for (let otherSession of this.sessions.values()) {
      if (otherSession.name) {
        session.blockedMessages.push(
          JSON.stringify({ joined: otherSession.name })
        );
      }
    }
    let storage = await this.storage.list({ reverse: true, limit: 100 });
    let backlog = [...storage.values()];
    backlog.reverse();
    backlog.forEach((value) => {
      session.blockedMessages.push(value);
    });
  }
  async webSocketMessage(webSocket, msg) {
    try {
      let session = this.sessions.get(webSocket);
      if (session.quit) {
        webSocket.close(1011, "WebSocket broken.");
        return;
      }
      if (!session.limiter.checkLimit()) {
        webSocket.send(
          JSON.stringify({
            error: "Your IP is being rate-limited, please try again later."
          })
        );
        return;
      }
      let data = JSON.parse(msg);
      if (!session.name) {
        session.name = "" + (data.name || "anonymous");
        webSocket.serializeAttachment({
          ...webSocket.deserializeAttachment(),
          name: session.name
        });
        if (session.name.length > 32) {
          webSocket.send(JSON.stringify({ error: "Name too long." }));
          webSocket.close(1009, "Name too long.");
          return;
        }
        session.blockedMessages.forEach((queued) => {
          webSocket.send(queued);
        });
        delete session.blockedMessages;
        this.broadcast({ joined: session.name });
        webSocket.send(JSON.stringify({ ready: true }));
        return;
      }
      data = { name: session.name, message: "" + data.message };
      if (data.message.length > 256) {
        webSocket.send(JSON.stringify({ error: "Message too long." }));
        return;
      }
      data.timestamp = Math.max(Date.now(), this.lastTimestamp + 1);
      this.lastTimestamp = data.timestamp;
      let dataStr = JSON.stringify(data);
      this.broadcast(dataStr);
      let key = new Date(data.timestamp).toISOString();
      await this.storage.put(key, dataStr);
    } catch (err) {
      webSocket.send(JSON.stringify({ error: err.stack }));
    }
  }
  async closeOrErrorHandler(webSocket) {
    let session = this.sessions.get(webSocket) || {};
    session.quit = true;
    this.sessions.delete(webSocket);
    if (session.name) {
      this.broadcast({ quit: session.name });
    }
  }
  async webSocketClose(webSocket) {
    this.closeOrErrorHandler(webSocket);
  }
  async webSocketError(webSocket) {
    this.closeOrErrorHandler(webSocket);
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
        } catch (err) {
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
};
var RateLimiter = class {
  static {
    __name(this, "RateLimiter");
  }
  constructor(state, env) {
    this.nextAllowedTime = 0;
  }
  async fetch(request) {
    return await handleErrors(request, async () => {
      let now = Date.now() / 1e3;
      this.nextAllowedTime = Math.max(now, this.nextAllowedTime);
      if (request.method == "POST") {
        this.nextAllowedTime += 5;
      }
      let cooldown = Math.max(0, this.nextAllowedTime - now - 20);
      return new Response(cooldown);
    });
  }
};
var RateLimiterClient = class {
  static {
    __name(this, "RateLimiterClient");
  }
  constructor(getLimiterStub, reportError) {
    this.getLimiterStub = getLimiterStub;
    this.reportError = reportError;
    this.limiter = getLimiterStub();
    this.inCooldown = false;
  }
  checkLimit() {
    if (this.inCooldown) {
      return false;
    }
    this.inCooldown = true;
    this.callLimiter();
    return true;
  }
  async callLimiter() {
    try {
      let response;
      try {
        response = await this.limiter.fetch("https://dummy-url", {
          method: "POST"
        });
      } catch (err) {
        this.limiter = this.getLimiterStub();
        response = await this.limiter.fetch("https://dummy-url", {
          method: "POST"
        });
      }
      let cooldown = +await response.text();
      await new Promise((resolve) => setTimeout(resolve, cooldown * 1e3));
      this.inCooldown = false;
    } catch (err) {
      this.reportError(err);
    }
  }
};

// ../../Users/AashishJaini/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../Users/AashishJaini/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-2YIIks/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../Users/AashishJaini/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-2YIIks/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  ChatRoom,
  RateLimiter,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
