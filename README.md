# herdr-ports

A [Herdr](https://herdr.dev) mod that lists the listening ports of a **remote space** and forwards any of them to `localhost` over ssh with one click:

- one row per TCP port that is listening on the machine the space runs on
- a power button turns the ssh forward on or off
- an open button launches `http://localhost:<port>` in your browser

It follows the focused space, so it always shows the ports of the machine you are looking at.

---

## 📑 Contents

- [Features](#-features)
- [Requirements](#-requirements)
- [Install](#-install)
- [Opening it](#-opening-it)
- [How it works](#-how-it-works)
- [Files](#-files)
- [License](#-license)

---

## ✨ Features

### 🔌 The port list

| Element | What it shows |
|---|---|
| 📌 **Header** | `Ports · <machine>`, the machine of the focused space. |
| 🔢 **Port** | A listening TCP port. Bright when forwarded, muted otherwise. |
| ⏻ **Power** | Click to start or stop the forward. Green while on. |
| 🌐 **Open** | Shown while forwarded. Opens `http://localhost:<port>`. |

Messages replace the list when there is nothing to show: `No open ports`, or `Local machine: nothing to forward` on a local space.

### ⚡ Everyday

- 🔁 **Live**: re-reads ports and forwards every 5 seconds, and when focus moves to a space on another machine.
- 🔒 **Same port locally**: port `3000` on the remote is `localhost:3000` here.
- 🧹 **Honest state**: "on" means an `ssh -L` process for that port and machine really exists, so forwards started elsewhere show up too.
- ❌ **Failures are loud**: a forward that cannot start (for example, the local port is taken) posts an error notification.

---

## 📋 Requirements

- Herdr app
- `ssh` and `open` on this computer (macOS; use `xdg-open` on Linux, see `forwards.js`)
- `ss` on the remote machine (Linux)
- Key-based ssh access to the remote machine, since the forward runs in the background

---

## 📦 Install

```sh
git clone https://github.com/antoine-sh/herdr-ports.git ~/.config/herdr-app/mods/ports
herdr-app check ~/.config/herdr-app/mods/ports
```

The folder must be named `ports`: the icons are loaded from `mods/ports/`.

## 🚀 Opening it

The mod has `"place": "none"`, so it does not appear on its own. Pick one of these:

**🪟 As a pane beside your terminal**

```sh
herdr-app do pane.split --direction right --mod ports
```

**💬 As a dialog, toggled**

```sh
herdr-app do mod.open --name ports
```

**🧩 Docked in a layout** — add a block to your layout file. Shipped layouts are read-only, so clone one first (`herdr-app do layout.clone '{"name":"main","as":"my-layout"}'`).

```json
{ "id": "ports", "type": "block", "size": { "px": 220 }, "content": { "mod": "ports" } }
```

**⌨️ With a key** — add to `keys.json`:

```json
{ "global": { "ctrl-shift-p": "mod.open:ports" } }
```

---

## ⚙️ How it works

1. The focused space's machine is read from `spaces()`. Its ssh target comes from `hc machine ls --json`.
2. `ss -tlnH` runs on that machine through `exec(..., { on })`, and the local ports are parsed from it.
3. Forwards are `ssh -f -N -o ExitOnForwardFailure=yes -L <port>:localhost:<port> <target>`. `-f` backgrounds ssh once the tunnel is up.
4. Which forwards are on is found with `pgrep -fl` on that command line. Nothing is stored, so there is no state to go stale.
5. Turning a forward off is `pkill` on the same command line.

---

## 📁 Files

| File | Purpose |
|---|---|
| `main.js` | the panel: state, timers, wiring |
| `forwards.js` | port listing and ssh forwards (everything that runs a program) |
| `ui.js` | rendering: header, rows, icon buttons |
| `power.svg`, `open.svg` | row icons |
| `mod.json` | placement (`none`) and title |
| `gpui-kit.d.ts`, `jsconfig.json` | editor types, rewritten by Herdr on start (git-ignored) |

---

## 📄 License

MIT
