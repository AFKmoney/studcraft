// Multiplayer client — prototype (battle order item 8, see MULTIPLAYER.md).
//
// A thin WebSocket client for the dumb relay in mp/relay.mjs. It knows
// nothing about rendering: game.ts polls `peers`, feeds the local player
// transform in, and applies remote edits through the callbacks. Solo play
// never constructs a connection — this only wakes when the player hosts
// or joins a room from the pause menu.

export type PeerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

export class MpClient {
  private ws: WebSocket | null = null;
  id = "";
  name = "";
  room = "";
  peers = new Map<string, PeerState>();
  onSay: (text: string) => void = () => {};
  onEdit: (x: number, y: number, z: number, block: number) => void = () => {};

  get connected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  connect(url: string, room: string, name: string) {
    this.close();
    this.name = name;
    this.room = room.toUpperCase();
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.onSay("Bad relay address");
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ t: "join", room: this.room, name: this.name }));
    };
    ws.onmessage = (ev) => {
      let m: Record<string, unknown>;
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (m.t === "welcome") {
        this.id = String(m.id);
        for (const p of (m.peers as { id: string; name: string }[]) ?? []) {
          this.peers.set(p.id, { id: p.id, name: p.name, x: 0, y: -999, z: 0, yaw: 0, pitch: 0 });
        }
        this.onSay("Connected to room " + this.room);
      } else if (m.t === "full") {
        this.onSay("That room is full");
        this.close();
      } else if (m.t === "peer-join") {
        const id = String(m.id);
        this.peers.set(id, { id, name: String(m.name), x: 0, y: -999, z: 0, yaw: 0, pitch: 0 });
        this.onSay(String(m.name) + " joined");
      } else if (m.t === "peer-leave") {
        const id = String(m.id);
        const peer = this.peers.get(id);
        this.peers.delete(id);
        if (peer) this.onSay(peer.name + " left");
      } else if (m.t === "pos") {
        const peer = this.peers.get(String(m.id));
        if (peer) {
          peer.x = Number(m.x);
          peer.y = Number(m.y);
          peer.z = Number(m.z);
          peer.yaw = Number(m.yaw);
          peer.pitch = Number(m.pitch);
        }
      } else if (m.t === "edit") {
        this.onEdit(Number(m.x), Number(m.y), Number(m.z), Number(m.block));
      } else if (m.t === "chat") {
        this.onSay(String(m.name) + ": " + String(m.text));
      }
    };
    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
        this.peers.clear();
      }
    };
    ws.onerror = () => {
      this.onSay("Relay unreachable — is it running?");
    };
  }

  private send(obj: Record<string, unknown>) {
    if (this.connected) {
      try {
        this.ws?.send(JSON.stringify(obj));
      } catch {}
    }
  }

  sendPos(x: number, y: number, z: number, yaw: number, pitch: number) {
    this.send({ t: "pos", x, y, z, yaw, pitch });
  }

  sendEdit(x: number, y: number, z: number, block: number) {
    this.send({ t: "edit", x, y, z, block });
  }

  sendChat(text: string) {
    this.send({ t: "chat", text });
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.peers.clear();
    this.id = "";
  }
}
