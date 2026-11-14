import { ENV_BASE_URL } from "../utils/env.js";
import { boundedRequest, readModSelection } from "../utils/request-gate.js";
import { modIds } from "../utils/mod-ids.js";
import { readOverview } from "../utils/overview.js";

export const SOURCES = ["curseforge", "modrinth"];
export const PAGE_SIZE = 20;
export const SELECTION_KEY = "minecraft-mod-selection-v2";
export const SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "downloadCount",
  "modCount",
];
export class MinecraftError extends Error {
  constructor(code, status = 0, retryAt = 0) {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAt = retryAt;
  }
}
export function resourceKey(resource) {
  return `${resource.source}:${resource.sourceId}`;
}
export function validRef(ref) {
  return (
    ref &&
    SOURCES.includes(ref.source) &&
    typeof ref.sourceId === "string" &&
    (ref.source === "curseforge"
      ? /^[1-9][0-9]{0,9}$/
      : /^[A-Za-z0-9]{1,64}$/
    ).test(ref.sourceId)
  );
}
export function safeWebUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
function invalid() {
  throw new MinecraftError("invalid_response");
}
const count = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value >= 0;
/** @returns {import('./minecraft-types').MinecraftResource} */
export function readResource(value, type) {
  if (
    !validRef(value) ||
    value.type !== type ||
    !["unknown", "partial", "complete"].includes(value.dependencyState)
  )
    invalid();
  const result = {
    source: value.source,
    sourceId: value.sourceId,
    type,
    dependencyState: value.dependencyState,
  };
  for (const key of ["name", "webUrl", "logoUrl", "selectedVersionId"]) {
    if (value[key] !== null && typeof value[key] !== "string") invalid();
    result[key] = value[key];
  }
  for (const key of ["createdAt", "updatedAt", "downloadCount", "modCount"]) {
    if (
      value[key] !== null &&
      (!count(value[key]) ||
        value[key] >
          (key.endsWith("At") ? 253402300799999 : 9223372036854775807))
    )
      invalid();
    result[key] = value[key];
  }
  if (type === "mod" && result.modCount !== null) invalid();
  return result;
}
export function readPage(value, type, query) {
  const page = value?.page;
  if (
    !Array.isArray(value?.data) ||
    !page ||
    !count(page.offset) ||
    !Number.isInteger(page.limit) ||
    page.limit < 1 ||
    page.limit > 50 ||
    page.returned !== value.data.length ||
    value.data.length > page.limit ||
    page.offset !== query.offset ||
    page.limit !== query.limit
  )
    invalid();
  const seen = new Set();
  const data = value.data.map((row) => {
    const item = readResource(row, type),
      key = resourceKey(item);
    if (seen.has(key) || !query.sources.includes(item.source)) invalid();
    seen.add(key);
    return item;
  });
  return {
    data,
    page: { offset: page.offset, limit: page.limit, returned: page.returned },
  };
}
export function buildQuery(
  kind,
  {
    source = "all",
    keyword = "",
    dependencyRefs = [],
    field = "downloadCount",
    direction = "desc",
    offset = 0,
    limit = PAGE_SIZE,
  } = {},
) {
  if (!["mods", "modpacks"].includes(kind))
    throw new MinecraftError("invalid_request", 400);
  const sources = source === "all" ? [...SOURCES] : [source];
  if (
    sources.some((item) => !SOURCES.includes(item)) ||
    ![
      "createdAt",
      "updatedAt",
      "downloadCount",
      ...(kind === "modpacks" ? ["modCount"] : []),
    ].includes(field) ||
    !["asc", "desc"].includes(direction) ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 1000000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    typeof keyword !== "string" ||
    keyword.trim().length > 256 ||
    !Array.isArray(dependencyRefs) ||
    dependencyRefs.length > 256
  )
    throw new MinecraftError("invalid_request", 400);
  const refs = [
    ...new Map(
      dependencyRefs.map((ref) => {
        if (!validRef(ref) || !sources.includes(ref.source))
          throw new MinecraftError("invalid_request", 400);
        return [
          resourceKey(ref),
          { source: ref.source, sourceId: ref.sourceId },
        ];
      }),
    ).values(),
  ];
  if (
    new Set(refs.map((ref) => ref.source)).size > 1 ||
    (keyword.trim() && refs.length)
  )
    throw new MinecraftError("invalid_request", 400);
  return {
    sources,
    ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
    ...(refs.length ? { dependencyRefs: refs } : {}),
    sort: { field, direction },
    offset,
    limit,
  };
}
export function routeSelection(route) {
  const raw = route.params.ids;
  const supplied = route.query.source;
  if (
    (supplied !== undefined && typeof supplied !== "string") ||
    (raw !== undefined && typeof raw !== "string")
  )
    throw new MinecraftError("invalid_request", 400);
  // Links made by the old CurseForge-only UI retain their original meaning.
  const source = supplied || (raw ? "curseforge" : "all");
  const ids = raw ? (supplied ? raw.split(",") : modIds(raw)) : [];
  const dependencyRefs = ids.map((sourceId) => ({ source, sourceId }));
  const offsetText = route.query.offset ?? "0";
  if (typeof offsetText !== "string" || !/^\d+$/.test(offsetText))
    throw new MinecraftError("invalid_request", 400);
  const query = buildQuery("modpacks", {
    source,
    dependencyRefs,
    field: route.query.sort || "downloadCount",
    direction: route.query.direction || "desc",
    offset: Number(offsetText),
  });
  return { source, dependencyRefs, query };
}
export function readSelections(storage) {
  try {
    const saved = JSON.parse(storage.getItem(SELECTION_KEY) || "null");
    if (saved?.schemaVersion === 2 && Array.isArray(saved.mods)) {
      const seen = new Set();
      return saved.mods
        .filter(
          (mod) =>
            validRef(mod) &&
            mod.type === "mod" &&
            !seen.has(resourceKey(mod)) &&
            seen.add(resourceKey(mod)),
        )
        .slice(0, 512);
    }
  } catch {}
  return readModSelection(storage)
    .filter((mod) =>
      validRef({ source: "curseforge", sourceId: String(mod.id) }),
    )
    .map((mod) => ({
      source: "curseforge",
      sourceId: String(mod.id),
      type: "mod",
      name: mod.name,
      logoUrl: mod.logoUrl || null,
      webUrl: null,
      createdAt: null,
      updatedAt: null,
      downloadCount: null,
      selectedVersionId: null,
      dependencyState: "unknown",
      modCount: null,
    }));
}
export function saveSelections(storage, mods) {
  storage.setItem(SELECTION_KEY, JSON.stringify({ schemaVersion: 2, mods }));
}
export function retryDeadline(value, now = Date.now()) {
  if (typeof value !== "string" || !value.trim()) return now + 1000;
  if (/^\d+$/.test(value.trim())) {
    const delay = Number(value.trim()) * 1000;
    return Number.isFinite(delay)
      ? Math.min(Number.MAX_SAFE_INTEGER, now + delay)
      : now + 1000;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(now, date) : now + 1000;
}
export function createMinecraftClient({
  baseUrl = ENV_BASE_URL,
  fetcher = (...args) => fetch(...args),
  now = () => Date.now(),
} = {}) {
  let retryAt = 0;
  async function post(kind, query, verify, signal) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    if (retryAt > now()) throw new MinecraftError("rate_limited", 429, retryAt);
    let token;
    try {
      token = await boundedRequest(verify);
    } catch (error) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      throw new MinecraftError("verification_unavailable");
    }
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    if (typeof token !== "string" || !token || token.length > 4096)
      throw new MinecraftError("verification_unavailable");
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);
    try {
      const response = await fetcher(
        `${baseUrl}/v2/web/minecraft/${kind === "overview" ? "overview" : kind + "/query"}`,
        {
          method: "POST",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...query, recaptcha: token }),
          signal: controller.signal,
        },
      );
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      if (!response.ok) {
        if (response.status === 429)
          retryAt = retryDeadline(response.headers.get("Retry-After"), now());
        const code =
          {
            400: "invalid_request",
            401: "verification_expired",
            403: "verification_failed",
            404: "api_unavailable",
            429: "rate_limited",
            503: "service_unavailable",
          }[response.status] || "network";
        throw new MinecraftError(code, response.status, retryAt);
      }
      let body;
      try {
        body = await response.json();
      } catch {
        invalid();
      }
      if (kind === "overview") {
        try {
          return readOverview(body);
        } catch {
          invalid();
        }
      }
      return readPage(body, kind === "mods" ? "mod" : "modpack", query);
    } catch (error) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      if (error instanceof MinecraftError) throw error;
      throw new MinecraftError(timedOut ? "timeout" : "network");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
  return {
    query: (kind, query, verify, signal) => post(kind, query, verify, signal),
    overview: (verify, signal) => post("overview", {}, verify, signal),
  };
}
export const minecraft = createMinecraftClient();
