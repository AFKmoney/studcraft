// Studcraft multiplayer relay — prototype, zero dependencies.
//
// A dumb room relay: it holds no game state, saves nothing, and knows no
// accounts. Clients join a room by code and the relay forwards their
// messages to the other members of the room. Run: node mp/relay.mjs [port]
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.argv[2] || 8799);
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_PEERS_PER_ROOM = 8;
const MAX_MSG = 64 * 1024;

const rooms = new Map(); // room -> Set<conn>
let nextId = 1;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("studcraft relay ok\n");
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) return socket.destroy();
  const accept = crypto.createHash("sha1").update(key + GUID).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
  );

  const conn = { id: "p" + nextId++, name: "?", room: "", socket, buf: Buffer.alloc(0), dead: false };
  socket.on("data", (chunk) => {
    conn.buf = Buffer.concat([conn.buf, chunk]);
    drain(conn);
  });
  socket.on("close", () => leave(conn));
  socket.on("error", () => leave(conn));
});

function sendFrame(conn, text) {
  if (conn.dead) return;
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) header = Buffer.from([0x81, len]);
  else if (len < 65536) header = Buffer.from([0x81, 126, (len >> 8) & 255, len & 255]);
  else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  try {
    conn.socket.write(Buffer.concat([header, payload]));
  } catch {
    leave(conn);
  }
}

function send(conn, obj) {
  sendFrame(conn, JSON.stringify(obj));
}

function broadcast(room, obj, except) {
  const set = rooms.get(room);
  if (!set) return;
  for (const c of set) if (c !== except) send(c, obj);
}

function leave(conn) {
  if (conn.dead) return;
  conn.dead = true;
  const set = rooms.get(conn.room);
  if (set) {
    set.delete(conn);
    if (set.size === 0) rooms.delete(conn.room);
    else broadcast(conn.room, { t: "peer-leave", id: conn.id });
  }
  try {
    conn.socket.destroy();
  } catch {}
  console.log("leave", conn.id, conn.name, "room", conn.room || "-");
}

function handle(conn, msg) {
  let m;
  try {
    m = JSON.parse(msg);
  } catch {
    return;
  }
  if (m.t === "join") {
    const room = String(m.room || "").toUpperCase().slice(0, 12);
    if (!room) return;
    let set = rooms.get(room);
    if (!set) {
      set = new Set();
      rooms.set(room, set);
    }
    if (set.size >= MAX_PEERS_PER_ROOM) {
      send(conn, { t: "full" });
      return;
    }
    conn.room = room;
    conn.name = String(m.name || "Brick").slice(0, 20);
    const peers = [...set].map((c) => ({ id: c.id, name: c.name }));
    set.add(conn);
    send(conn, { t: "welcome", id: conn.id, peers });
    broadcast(room, { t: "peer-join", id: conn.id, name: conn.name }, conn);
    console.log("join", conn.id, conn.name, "room", room, "(" + set.size + ")");
    return;
  }
  if (!conn.room) return;
  if (m.t === "pos") broadcast(conn.room, { t: "pos", id: conn.id, x: m.x, y: m.y, z: m.z, yaw: m.yaw, pitch: m.pitch }, conn);
  else if (m.t === "edit") broadcast(conn.room, { t: "edit", id: conn.id, x: m.x, y: m.y, z: m.z, block: m.block }, conn);
  else if (m.t === "chat") broadcast(conn.room, { t: "chat", id: conn.id, name: conn.name, text: String(m.text || "").slice(0, 200) }, conn);
}

function drain(conn) {
  for (;;) {
    const buf = conn.buf;
    if (buf.length < 2) return;
    const opcode = buf[0] & 0x0f;
    const masked = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7f;
    let off = 2;
    if (len === 126) {
      if (buf.length < 4) return;
      len = buf.readUInt16BE(2);
      off = 4;
    } else if (len === 127) {
      if (buf.length < 10) return;
      len = Number(buf.readBigUInt64BE(2));
      off = 10;
    }
    if (len > MAX_MSG) return leave(conn);
    const maskOff = off;
    if (masked) off += 4;
    if (buf.length < off + len) return;
    let payload = buf.subarray(off, off + len);
    if (masked) {
      const mask = buf.subarray(maskOff, maskOff + 4);
      const out = Buffer.alloc(len);
      for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
      payload = out;
    }
    conn.buf = buf.subarray(off + len);
    if (opcode === 8) return leave(conn);
    if (opcode === 9) {
      // ping -> pong
      try {
        conn.socket.write(Buffer.from([0x8a, 0]));
      } catch {}
      continue;
    }
    if (opcode === 1) handle(conn, payload.toString("utf8"));
  }
}

server.listen(PORT, () => console.log("studcraft relay on ws://127.0.0.1:" + PORT));
