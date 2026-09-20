import { cpus, freemem, hostname, loadavg, platform, arch, totalmem, uptime } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SystemState } from "../../capabilities/results.js";
import { cleanOutput } from "../../capabilities/results.js";

const execFileAsync = promisify(execFile);

export function systemCpu() {
  const list = cpus();
  return {
    kind: "SystemCpuResult" as const,
    cores: list.length,
    model: list[0]?.model,
    loadavg: loadavg(),
  };
}

export function systemMemory() {
  const total = totalmem();
  const free = freemem();
  return {
    kind: "SystemMemoryResult" as const,
    total_bytes: total,
    free_bytes: free,
    used_ratio: total > 0 ? (total - free) / total : 0,
  };
}

export async function systemDisk(path = "/") {
  try {
    const { stdout } = await execFileAsync("df", ["-k", path], { timeout: 5000 });
    const lines = stdout.toString().trim().split("\n");
    const data = lines[1]?.split(/\s+/) ?? [];
    const totalKb = parseInt(data[1] ?? "0", 10);
    const availKb = parseInt(data[3] ?? "0", 10);
    return {
      kind: "SystemDiskResult" as const,
      path,
      total_bytes: totalKb * 1024,
      free_bytes: availKb * 1024,
    };
  } catch (err) {
    return {
      kind: "SystemDiskResult" as const,
      path,
      error: cleanOutput(String(err), 500),
    };
  }
}

export async function systemProcesses(limit = 10) {
  try {
    const { stdout } = await execFileAsync("ps", ["-eo", "pid,pcpu,pmem,comm", "--sort=-pcpu"], {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });
    const lines = stdout.toString().trim().split("\n").slice(1, limit + 1);
    const top = lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      return {
        pid: parseInt(parts[0] ?? "0", 10),
        cpu: parseFloat(parts[1] ?? "0"),
        mem: parseFloat(parts[2] ?? "0"),
        cmd: parts.slice(3).join(" "),
      };
    });
    return {
      kind: "SystemProcessesResult" as const,
      count: top.length,
      top,
    };
  } catch (err) {
    return {
      kind: "SystemProcessesResult" as const,
      count: 0,
      top: [],
      error: cleanOutput(String(err), 500),
    };
  }
}

export async function systemInspect(): Promise<SystemState> {
  const cpu = systemCpu();
  const mem = systemMemory();
  const disk = await systemDisk("/");
  const procs = await systemProcesses(8);

  return {
    kind: "SystemState",
    platform: platform(),
    arch: arch(),
    hostname: hostname(),
    uptime_s: Math.floor(uptime()),
    cpu: { cores: cpu.cores, loadavg: cpu.loadavg, model: cpu.model },
    memory: {
      total_bytes: mem.total_bytes,
      free_bytes: mem.free_bytes,
      used_ratio: mem.used_ratio,
    },
    disk: {
      path: disk.path,
      total_bytes: "total_bytes" in disk ? disk.total_bytes : undefined,
      free_bytes: "free_bytes" in disk ? disk.free_bytes : undefined,
    },
    processes: { count: procs.count, top: procs.top },
  };
}
