// Invalidate work immediately, including time spent obtaining an anti-bot token.
export function createRequestGate() {
  let version = 0,
    controller;
  return {
    begin() {
      controller?.abort();
      const current = ++version;
      controller = new AbortController();
      const signal = controller.signal;
      return { signal, current: () => current === version && !signal.aborted };
    },
    cancel() {
      version++;
      controller?.abort();
    },
  };
}
export function readModSelection(storage) {
  for (const key of ["modList", "selectedMods"]) {
    try {
      const value = JSON.parse(storage.getItem(key) || "null");
      if (!Array.isArray(value)) continue;
      const seen = new Set();
      return value
        .filter(
          (mod) =>
            mod &&
            /^[1-9]\d*$/.test(String(mod.id)) &&
            typeof mod.name === "string" &&
            !seen.has(String(mod.id)) &&
            seen.add(String(mod.id)),
        )
        .slice(0, 100)
        .map((mod) => ({
          ...mod,
          authors: Array.isArray(mod.authors) ? mod.authors : [],
          latestGameVersions: Array.isArray(mod.latestGameVersions)
            ? mod.latestGameVersions
            : [],
        }));
    } catch {}
  }
  return [];
}

export async function boundedRequest(operation, timeout = 15000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Request timed out")),
          timeout,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function moveActive(current, delta, length) {
  if (!length) return -1;
  if (current < 0) return delta > 0 ? 0 : length - 1;
  return (current + delta + length) % length;
}
