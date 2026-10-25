# Studcraft multiplayer — architecture

Status: **prototype shipped in v3.0** (presence, movement, block edits, room
codes). This document is the design the prototype follows and the roadmap
for turning it into full co-op. Solo play is untouched: the game stays
100 % playable offline, and nothing in this design phones home — online is
a mode the player explicitly opens from the pause menu.

## Why this shape

Studcraft worlds are **deterministic**: a seed regenerates the whole map,
and everything a player changes is stored as a sparse edit list (the same
list the save file persists). That single fact makes multiplayer cheap:

- The world itself never crosses the wire — only the **seed** (agreed when
  joining) and the **edits** (a few bytes per block).
- A relay therefore needs **no game state, no database, no accounts**. It
  forwards messages inside a room and forgets everything when the room
  empties. `mp/relay.mjs` is ~200 lines of zero-dependency Node.

## Model: host-authoritative co-op over a dumb relay

- One player **hosts**: their client is the authority for the shared world
  state (their save slot is the canonical world — guests should treat a
  session as playing in the host's world).
- Every client runs the full simulation locally. Player transforms stream
  at 10 Hz and are interpolated on arrival; block edits are discrete
  events applied on receipt (last writer wins per cell — in practice two
  players rarely contest the same block, and the host's stream settles it).
- Mobs are the one hard problem left (see roadmap): the prototype does
  **not** sync them. Each client simulates its own mobs from the same
  seed, so wildlife is approximately shared and monsters can diverge.
  Phase 2 makes the host own mob state for nearby chunks.

## Protocol (JSON over WebSocket)

| Message | Direction | Fields | Meaning |
| --- | --- | --- | --- |
| `join` | client → relay | `room`, `name` | first message; room is a 6-char code |
| `welcome` | relay → client | `id`, `peers[]` | your id + who is already in |
| `peer-join` / `peer-leave` | relay → room | `id`, `name` | presence |
| `pos` | client → room | `x y z yaw pitch` | 10 Hz transform stream |
| `edit` | client → room | `x y z block` | a block placed (`block` = id) or broken (`0`) |
| `chat` | client → room | `text` | relayed with the sender's name |

Relay rules: max 8 peers per room, 64 KB per message, rooms exist only
while someone is in them, nothing is logged or stored.

## Trust model (prototype, stated plainly)

Co-op among friends, not public servers. Clients trust each other's
edits; there is no anti-cheat, no inventory validation, and display names
are self-asserted. Do not run a public room for strangers on this build.
Hardening (host validation of edits, rate limits, kicked peers) belongs
to the phase where a public relay exists.

## The APK and the offline promise

The Android manifest now declares the `INTERNET` permission — used
**only** when the player hosts or joins a room. Nothing in solo play
opens a socket. If that ever changes, it changes in this document first.

## Roadmap

- **P0 (shipped, v3.0)** — relay, rooms by code, presence + interpolated
  avatars with nameplates, block edit sync, join/leave notices.
- **P1** — session seed handshake (guest auto-loads the host's seed into a
  scratch world slot), edit catch-up for late joiners (host streams its
  edit list on join), chat input in the HUD.
- **P2** — host-owned mobs for loaded chunks (spawn/state/despawn events),
  shared day cycle lock.
- **P3** — a hosted public relay ( Philippe's product call: domain, cost,
  and whether rooms are listed publicly), NAT-friendly fallbacks,
  reconnect/resume.

## Run the prototype

```sh
node mp/relay.mjs 8799          # anywhere reachable by both players
# in game: Pause → Host an online room (share the code)
# friend:  Pause → Join a room by code — same relay address, same code
```

Two players must be in worlds with the **same seed** for edits to line
up (P1 removes this step). Use the "Copy seed" button in the pause menu.
