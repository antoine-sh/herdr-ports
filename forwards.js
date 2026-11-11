// Everything that touches the network: remote port listing and local ssh forwards.
import { exec, hc } from "herdr";

const sh = (cmd) => exec("sh", ["-c", cmd]);

export async function sshTarget(machine) {
  const r = await hc(["machine", "ls", "--json"]);
  return JSON.parse(r.stdout).machines.find((m) => m.name === machine)?.target ?? machine;
}

// Listening TCP ports on `machine`, sorted. ss is Linux; the remote machines are Linux workspaces.
export async function listPorts(machine) {
  const r = await exec("ss", ["-tlnH"], { on: machine });
  const ports = new Set();
  for (const line of r.stdout.split("\n")) {
    const m = line.trim().split(/\s+/)[3]?.match(/:(\d+)$/);
    if (m) ports.add(+m[1]);
  }
  return [...ports].sort((a, b) => a - b);
}

// Ports already forwarded to `target`: Map of remote port -> local port (the command line doubles as the probe).
export async function listForwards(target) {
  const p = await sh("pgrep -fl 'ssh -f -N .*-L [0-9]+:localhost' || true");
  return new Map([...p.stdout.matchAll(/-L (\d+):localhost:(\d+) (\S+)/g)]
    .filter((m) => m[3] === target).map((m) => [+m[2], +m[1]]));
}

const forward = (local, port, target) =>
  sh(`ssh -f -N -o ExitOnForwardFailure=yes -L ${local}:localhost:${port} ${target} </dev/null >/dev/null 2>&1`)
    .then((r) => r.code).catch(() => 1);

// -f backgrounds ssh once the forward is up. Tries the same local port, then random ones if it is taken.
// Resolves to the local port, or null on failure.
export async function startForward(port, target) {
  if (!(await forward(port, port, target))) return port;
  for (let i = 0; i < 5; i++) {
    const local = 20000 + Math.floor(Math.random() * 40000);
    if (!(await forward(local, port, target))) return local;
  }
  return null;
}

export const stopForward = (port, target) =>
  sh(`pkill -f 'ssh -f -N .*-L [0-9]+:localhost:${port} ${target}$'`).catch(() => {});

export const openInBrowser = (port) => exec("open", [`http://localhost:${port}`]);

// Kills every forward this mod started, on any machine.
export const stopAllForwards = () =>
  sh(`pkill -f 'ssh -f -N .*-L [0-9]+:localhost:[0-9]+ '`).catch(() => {});
