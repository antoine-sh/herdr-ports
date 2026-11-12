// Listening ports on the active space's machine; click one to forward it to localhost over ssh.
import { View } from "gpui-kit";
import { spaces, notify } from "herdr";
import { sshTarget, listPorts, listForwards, startForward, stopForward, stopAllForwards, openInBrowser } from "./forwards.js";
import { panel, portRow } from "./ui.js";

const activeMachine = () => spaces().find((s) => s.active)?.machine ?? null;

export default class Ports extends View {
  init(_props, cx) {
    this.ports = [];
    this.fwd = new Map();
    this.machine = null;
    this.seen = null; // ports already known on this machine; null until the first read
    try { this.auto = localStorage.getItem("autoForward") === "1"; } catch { this.auto = false; }
    try { this.onlyFwd = localStorage.getItem("onlyFwd") === "1"; } catch { this.onlyFwd = false; }
    cx.timer.every(5000, (cx) => this.refresh(cx));
    this.refresh(cx);
  }

  // Forwards are detached ssh processes: end them when herdr (or this panel) closes.
  async close() { await stopAllForwards(); }

  refresh(cx) {
    const machine = activeMachine();
    if (machine !== this.machine) { this.machine = machine; this.ports = []; this.fwd = new Map(); this.seen = null; }
    cx.spawn(async (cx) => {
      try {
        if (!machine) { this.error = "Local machine: nothing to forward"; return; }
        const ports = await listPorts(machine);
        if (machine !== this.machine) return; // switched away meanwhile
        this.ports = ports;
        this.target = await sshTarget(machine);
        this.fwd = await listForwards(this.target);
        // Auto-forward ports that appeared since the last read (not the ones already open at first sight).
        const fresh = this.seen ? ports.filter((p) => !this.seen.has(p) && !this.fwd.has(p)) : [];
        this.seen = new Set(ports);
        if (this.auto && fresh.length) {
          for (const p of fresh) await this.start(p);
          this.fwd = await listForwards(this.target);
        }
        this.error = null;
      } catch (e) {
        this.error = String(e.message ?? e).split("\n")[0];
      } finally {
        cx.notify();
      }
    });
  }

  async start(port) {
    const local = await startForward(port, this.target);
    if (local === null) notify({ title: `Forward ${port} failed`, level: "error" });
    else if (local !== port) notify({ title: `Port ${port} busy`, body: `Forwarded to localhost:${local}` });
  }

  toggleAuto() {
    this.auto = !this.auto;
    try { localStorage.setItem("autoForward", this.auto ? "1" : "0"); } catch {}
  }

  toggleOnly() {
    this.onlyFwd = !this.onlyFwd;
    try { localStorage.setItem("onlyFwd", this.onlyFwd ? "1" : "0"); } catch {}
  }

  toggle(port, cx) {
    const turnOn = !this.fwd.has(port);
    cx.spawn(async (cx) => {
      if (turnOn) await this.start(port);
      else await stopForward(port, this.target);
      this.refresh(cx);
    });
  }

  render(cx) {
    // spaces() is live: re-run when the active space's machine changes.
    if (activeMachine() !== this.machine) this.refresh(cx);
    const shown = this.onlyFwd ? this.ports.filter((p) => this.fwd.has(p)) : this.ports;
    return panel({
      machine: this.machine,
      auto: this.auto,
      onAuto: (_e, cx) => { this.toggleAuto(); cx.notify(); },
      onlyFwd: this.onlyFwd,
      onOnly: (_e, cx) => { this.toggleOnly(); cx.notify(); },
      message: this.error || (shown.length ? null : this.ports.length ? "No forwarded ports" : "No open ports"),
      rows: shown.map((p) => portRow(p, this.fwd.get(p), {
        onToggle: (_e, cx) => this.toggle(p, cx),
        onOpen: () => openInBrowser(this.fwd.get(p)),
      })),
    });
  }
}
