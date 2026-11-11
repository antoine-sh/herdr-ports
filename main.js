// Listening ports on the active space's machine; click one to forward it to localhost over ssh.
import { View } from "gpui-kit";
import { spaces, notify } from "herdr";
import { sshTarget, listPorts, listForwards, startForward, stopForward, openInBrowser } from "./forwards.js";
import { panel, portRow } from "./ui.js";

const activeMachine = () => spaces().find((s) => s.active)?.machine ?? null;

export default class Ports extends View {
  init(_props, cx) {
    this.ports = [];
    this.fwd = new Map();
    this.machine = null;
    cx.timer.every(5000, (cx) => this.refresh(cx));
    this.refresh(cx);
  }

  refresh(cx) {
    const machine = activeMachine();
    if (machine !== this.machine) { this.machine = machine; this.ports = []; this.fwd = new Map(); }
    cx.spawn(async (cx) => {
      try {
        if (!machine) { this.error = "Local machine: nothing to forward"; return; }
        const ports = await listPorts(machine);
        if (machine !== this.machine) return; // switched away meanwhile
        this.ports = ports;
        this.target = await sshTarget(machine);
        this.fwd = await listForwards(this.target);
        this.error = null;
      } catch (e) {
        this.error = String(e.message ?? e).split("\n")[0];
      } finally {
        cx.notify();
      }
    });
  }

  toggle(port, cx) {
    const turnOn = !this.fwd.has(port);
    cx.spawn(async (cx) => {
      if (turnOn) {
        const local = await startForward(port, this.target);
        if (local === null) notify({ title: `Forward ${port} failed`, level: "error" });
        else if (local !== port) notify({ title: `Port ${port} busy`, body: `Forwarded to localhost:${local}` });
      } else await stopForward(port, this.target);
      this.refresh(cx);
    });
  }

  render(cx) {
    // spaces() is live: re-run when the active space's machine changes.
    if (activeMachine() !== this.machine) this.refresh(cx);
    return panel({
      machine: this.machine,
      message: this.error || (this.ports.length ? null : "No open ports"),
      rows: this.ports.map((p) => portRow(p, this.fwd.get(p), {
        onToggle: (_e, cx) => this.toggle(p, cx),
        onOpen: () => openInBrowser(this.fwd.get(p)),
      })),
    });
  }
}
