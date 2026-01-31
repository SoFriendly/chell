var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-M4f44M/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/crypto.ts
function generateDeviceId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateDeviceId, "generateDeviceId");
async function generateSessionToken(desktopId, mobileId, passphrase) {
  const data = `${desktopId}:${mobileId}:${passphrase}:${Date.now()}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateSessionToken, "generateSessionToken");
function generateMessageId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateMessageId, "generateMessageId");

// src/session.ts
var SessionDO = class {
  state;
  sessions = /* @__PURE__ */ new Map();
  connections = /* @__PURE__ */ new Map();
  desktopByPassphrase = /* @__PURE__ */ new Map();
  mobilesBySession = /* @__PURE__ */ new Map();
  desktopBySession = /* @__PURE__ */ new Map();
  constructor(state) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get("sessions");
      if (stored) {
        this.sessions = stored;
      }
    });
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.handleWebSocket(server);
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }
    return new Response("Not found", { status: 404 });
  }
  handleWebSocket(ws) {
    ws.accept();
    ws.addEventListener("message", async (event) => {
      try {
        const message = JSON.parse(event.data);
        await this.handleMessage(ws, message);
      } catch (err) {
        console.error("Failed to handle message:", err);
        this.sendError(ws, "INVALID_MESSAGE", "Failed to parse message");
      }
    });
    ws.addEventListener("close", () => {
      this.handleDisconnect(ws);
    });
    ws.addEventListener("error", (err) => {
      console.error("WebSocket error:", err);
      this.handleDisconnect(ws);
    });
  }
  async handleMessage(ws, message) {
    switch (message.type) {
      case "register_desktop":
        await this.handleDesktopRegister(ws, message);
        break;
      case "register_mobile":
        await this.handleMobileRegister(ws, message);
        break;
      case "unpair":
        await this.handleUnpair(ws, message);
        break;
      case "command":
        await this.handleCommand(ws, message);
        break;
      case "command_response":
        await this.handleCommandResponse(ws, message);
        break;
      case "terminal_input":
        await this.handleTerminalInput(ws, message);
        break;
      case "terminal_output":
        await this.handleTerminalOutput(ws, message);
        break;
      case "status_update":
        await this.handleStatusUpdate(ws, message);
        break;
      case "ping":
        ws.send(JSON.stringify({ type: "pong", id: message.id, timestamp: Date.now() }));
        break;
      default:
        this.sendError(ws, "UNKNOWN_MESSAGE", `Unknown message type: ${message.type}`);
    }
  }
  async handleDesktopRegister(ws, message) {
    const { deviceName, pairingCode, pairingPassphrase } = message;
    let state = this.connections.get(ws);
    const deviceId = state?.deviceId || generateDeviceId();
    const sessionData = {
      desktopDeviceId: deviceId,
      desktopDeviceName: deviceName,
      pairingCode,
      pairingPassphrase,
      linkedMobiles: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    this.sessions.set(deviceId, sessionData);
    await this.state.storage.put("sessions", this.sessions);
    this.connections.set(ws, {
      type: "desktop",
      deviceId,
      deviceName
    });
    this.desktopByPassphrase.set(pairingPassphrase, ws);
    ws.send(
      JSON.stringify({
        type: "register_desktop_response",
        id: generateMessageId(),
        timestamp: Date.now(),
        success: true,
        deviceId
      })
    );
    this.sendDeviceList(ws, sessionData);
  }
  async handleMobileRegister(ws, message) {
    const { deviceName, pairingPassphrase } = message;
    const desktopWs = this.desktopByPassphrase.get(pairingPassphrase);
    if (!desktopWs) {
      this.sendError(ws, "INVALID_PASSPHRASE", "Invalid pairing passphrase");
      return;
    }
    const desktopState = this.connections.get(desktopWs);
    if (!desktopState) {
      this.sendError(ws, "DESKTOP_NOT_FOUND", "Desktop not connected");
      return;
    }
    const session = this.sessions.get(desktopState.deviceId);
    if (!session) {
      this.sendError(ws, "SESSION_NOT_FOUND", "Session not found");
      return;
    }
    const mobileDeviceId = generateDeviceId();
    const sessionToken = await generateSessionToken(
      desktopState.deviceId,
      mobileDeviceId,
      pairingPassphrase
    );
    const linkedDevice = {
      id: mobileDeviceId,
      name: deviceName,
      type: "mobile",
      pairedAt: Date.now(),
      lastSeen: Date.now()
    };
    session.linkedMobiles.push(linkedDevice);
    session.lastActivity = Date.now();
    this.sessions.set(desktopState.deviceId, session);
    await this.state.storage.put("sessions", this.sessions);
    this.connections.set(ws, {
      type: "mobile",
      deviceId: mobileDeviceId,
      deviceName,
      sessionToken
    });
    if (!this.mobilesBySession.has(sessionToken)) {
      this.mobilesBySession.set(sessionToken, /* @__PURE__ */ new Set());
    }
    this.mobilesBySession.get(sessionToken).add(ws);
    this.desktopBySession.set(sessionToken, desktopWs);
    ws.send(
      JSON.stringify({
        type: "pair_response",
        id: generateMessageId(),
        timestamp: Date.now(),
        success: true,
        sessionToken,
        desktopDeviceId: desktopState.deviceId,
        desktopDeviceName: desktopState.deviceName,
        mobileDeviceId
      })
    );
    this.sendDeviceList(desktopWs, session);
    desktopWs.send(
      JSON.stringify({
        type: "request_status",
        id: generateMessageId(),
        timestamp: Date.now(),
        sessionToken
      })
    );
  }
  async handleUnpair(ws, message) {
    const { sessionToken, deviceId } = message;
    const state = this.connections.get(ws);
    if (!state)
      return;
    for (const [desktopId, session] of this.sessions) {
      const deviceIndex = session.linkedMobiles.findIndex((d) => d.id === deviceId);
      if (deviceIndex !== -1) {
        session.linkedMobiles.splice(deviceIndex, 1);
        this.sessions.set(desktopId, session);
        await this.state.storage.put("sessions", this.sessions);
        const desktopWs = this.desktopBySession.get(sessionToken);
        if (desktopWs) {
          this.sendDeviceList(desktopWs, session);
        }
        const mobiles = this.mobilesBySession.get(sessionToken);
        if (mobiles) {
          for (const mobileWs of mobiles) {
            const mobileState = this.connections.get(mobileWs);
            if (mobileState?.deviceId === deviceId) {
              mobiles.delete(mobileWs);
              this.connections.delete(mobileWs);
              mobileWs.close(1e3, "Unpaired");
            }
          }
        }
        break;
      }
    }
  }
  async handleCommand(ws, message) {
    const { sessionToken, command, params, id } = message;
    const desktopWs = this.desktopBySession.get(sessionToken);
    if (!desktopWs) {
      this.sendError(ws, "DESKTOP_OFFLINE", "Desktop is not connected");
      return;
    }
    desktopWs.send(
      JSON.stringify({
        type: "command",
        id,
        timestamp: Date.now(),
        command,
        params,
        requesterId: this.connections.get(ws)?.deviceId
      })
    );
  }
  async handleCommandResponse(ws, message) {
    const { requestId, success, result, error } = message;
    const state = this.connections.get(ws);
    if (!state || state.type !== "desktop")
      return;
    for (const [token, desktop] of this.desktopBySession) {
      if (desktop === ws) {
        const mobiles = this.mobilesBySession.get(token);
        if (mobiles) {
          const response = {
            type: "command_response",
            id: generateMessageId(),
            timestamp: Date.now(),
            requestId,
            success,
            result,
            error
          };
          for (const mobileWs of mobiles) {
            mobileWs.send(JSON.stringify(response));
          }
        }
        break;
      }
    }
  }
  async handleTerminalInput(ws, message) {
    const { sessionToken, terminalId, data } = message;
    const desktopWs = this.desktopBySession.get(sessionToken);
    if (!desktopWs) {
      this.sendError(ws, "DESKTOP_OFFLINE", "Desktop is not connected");
      return;
    }
    desktopWs.send(
      JSON.stringify({
        type: "terminal_input",
        id: generateMessageId(),
        timestamp: Date.now(),
        terminalId,
        data
      })
    );
  }
  async handleTerminalOutput(ws, message) {
    const { terminalId, data } = message;
    const state = this.connections.get(ws);
    if (!state || state.type !== "desktop")
      return;
    for (const [token, desktop] of this.desktopBySession) {
      if (desktop === ws) {
        const mobiles = this.mobilesBySession.get(token);
        if (mobiles) {
          const output = {
            type: "terminal_output",
            id: generateMessageId(),
            timestamp: Date.now(),
            terminalId,
            data
          };
          for (const mobileWs of mobiles) {
            mobileWs.send(JSON.stringify(output));
          }
        }
        break;
      }
    }
  }
  async handleStatusUpdate(ws, message) {
    const state = this.connections.get(ws);
    if (!state || state.type !== "desktop")
      return;
    for (const [token, desktop] of this.desktopBySession) {
      if (desktop === ws) {
        const mobiles = this.mobilesBySession.get(token);
        if (mobiles) {
          for (const mobileWs of mobiles) {
            mobileWs.send(JSON.stringify(message));
          }
        }
        break;
      }
    }
  }
  handleDisconnect(ws) {
    const state = this.connections.get(ws);
    if (!state)
      return;
    if (state.type === "desktop") {
      for (const [passphrase, desktopWs] of this.desktopByPassphrase) {
        if (desktopWs === ws) {
          this.desktopByPassphrase.delete(passphrase);
          break;
        }
      }
      for (const [token, desktop] of this.desktopBySession) {
        if (desktop === ws) {
          const mobiles = this.mobilesBySession.get(token);
          if (mobiles) {
            for (const mobileWs of mobiles) {
              mobileWs.send(
                JSON.stringify({
                  type: "status_update",
                  id: generateMessageId(),
                  timestamp: Date.now(),
                  connectionStatus: "disconnected"
                })
              );
            }
          }
          this.desktopBySession.delete(token);
          break;
        }
      }
    } else {
      if (state.sessionToken) {
        const mobiles = this.mobilesBySession.get(state.sessionToken);
        if (mobiles) {
          mobiles.delete(ws);
        }
      }
    }
    this.connections.delete(ws);
  }
  sendDeviceList(ws, session) {
    ws.send(
      JSON.stringify({
        type: "device_list",
        id: generateMessageId(),
        timestamp: Date.now(),
        devices: session.linkedMobiles
      })
    );
  }
  sendError(ws, code, message) {
    ws.send(
      JSON.stringify({
        type: "error",
        id: generateMessageId(),
        timestamp: Date.now(),
        code,
        message
      })
    );
  }
};
__name(SessionDO, "SessionDO");

// src/index.ts
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          version: "1.0.0",
          environment: env.ENVIRONMENT
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    if (url.pathname === "/ws") {
      const id = env.SESSIONS.idFromName("global");
      const stub = env.SESSIONS.get(id);
      return stub.fetch(request);
    }
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, url, env, corsHeaders);
    }
    return new Response("Chell Portal Relay", {
      headers: corsHeaders
    });
  }
};
async function handleApiRequest(request, url, env, corsHeaders) {
  const path = url.pathname.replace("/api/", "");
  if (path === "device" && request.method === "GET") {
    const deviceId = url.searchParams.get("id");
    if (!deviceId) {
      return new Response(JSON.stringify({ error: "Missing device ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const device = await env.DEVICES.get(deviceId, "json");
    if (!device) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    return new Response(JSON.stringify(device), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  if (path === "device" && request.method === "POST") {
    const body = await request.json();
    const { id, name, type } = body;
    if (!id || !name || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
    await env.DEVICES.put(
      id,
      JSON.stringify({
        id,
        name,
        type,
        registeredAt: Date.now(),
        lastSeen: Date.now()
      })
    );
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
__name(handleApiRequest, "handleApiRequest");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
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

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
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

// .wrangler/tmp/bundle-M4f44M/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
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

// .wrangler/tmp/bundle-M4f44M/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
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
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
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
  SessionDO,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
