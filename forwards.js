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

// Ports already forwarded to `target` (the forward command line doubles as the "is it on" probe).
export async function listForwards(target) {
  const p = await sh("pgrep -fl 'ssh -f -N .*-L [0-9]+:localhost' || true");
  return new Set([...p.stdout.matchAll(/-L (\d+):localhost:\d+ (\S+)/g)]
    .filter((m) => m[2] === target).map((m) => +m[1]));
}

// -f backgrounds ssh once the forward is up. Resolves to the exit code.
export async function setForward(port, target, on) {
  const cmd = on
    ? `ssh -f -N -o ExitOnForwardFailure=yes -L ${port}:localhost:${port} ${target} </dev/null >/dev/null 2>&1`
    : `pkill -f 'ssh -f -N .*-L ${port}:localhost:${port} ${target}$'`;
  const r = await sh(cmd).catch(() => ({ code: 1 }));
  return r.code;
}

export const openInBrowser = (port) => exec("open", [`http://localhost:${port}`]);
