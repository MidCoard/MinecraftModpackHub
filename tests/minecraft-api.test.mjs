import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQuery,
  readPage,
  readResource,
  resourceKey,
  routeSelection,
  readSelections,
  saveSelections,
  SELECTION_KEY,
  retryDeadline,
  createMinecraftClient,
  safeWebUrl,
} from "../src/api/minecraft.js";

const resource = (
  source = "modrinth",
  sourceId = "Ok6FyXJ9",
  type = "modpack",
) => ({
  source,
  sourceId,
  type,
  name: null,
  webUrl: null,
  logoUrl: null,
  createdAt: null,
  updatedAt: null,
  downloadCount: null,
  selectedVersionId: null,
  dependencyState: "unknown",
  modCount: null,
});
const envelope = (data, offset = 0, limit = 20) => ({
  data,
  page: { offset, limit, returned: data.length },
});
const store = (data = {}) => ({
  getItem: (key) => data[key] ?? null,
  setItem: (key, value) => {
    data[key] = value;
  },
});
test("source-qualified identities preserve case and do not merge publishers or names", () => {
  assert.notEqual(
    resourceKey(resource("modrinth", "ABC")),
    resourceKey(resource("modrinth", "abc")),
  );
  assert.notEqual(
    resourceKey(resource("curseforge", "123")),
    resourceKey(resource("modrinth", "123")),
  );
  assert.equal(readResource(resource(), "modpack").sourceId, "Ok6FyXJ9");
});
test("query bodies use explicit sources, structured sort, row offsets and only source-qualified dependencies", () => {
  const query = buildQuery("modpacks", {
    source: "modrinth",
    dependencyRefs: [
      { source: "modrinth", sourceId: "Ok6FyXJ9" },
      { source: "modrinth", sourceId: "Ok6FyXJ9" },
    ],
    field: "modCount",
    direction: "asc",
    offset: 40,
  });
  assert.deepEqual(query, {
    sources: ["modrinth"],
    dependencyRefs: [{ source: "modrinth", sourceId: "Ok6FyXJ9" }],
    sort: { field: "modCount", direction: "asc" },
    offset: 40,
    limit: 20,
  });
  assert.deepEqual(buildQuery("mods", { keyword: " Create " }).sources, [
    "curseforge",
    "modrinth",
  ]);
  assert.equal(buildQuery("mods", { keyword: " Create " }).keyword, "Create");
  for (const options of [
    { source: "forge" },
    {
      source: "modrinth",
      dependencyRefs: [{ source: "curseforge", sourceId: "1" }],
    },
    {
      dependencyRefs: [
        { source: "curseforge", sourceId: "1" },
        { source: "modrinth", sourceId: "ABC" },
      ],
    },
    { keyword: "x", dependencyRefs: [{ source: "modrinth", sourceId: "ABC" }] },
    { offset: -1 },
    { offset: 1.5 },
    { limit: 51 },
    { direction: "up" },
    { field: "id" },
    { keyword: "x".repeat(257) },
  ])
    assert.throws(() => buildQuery("modpacks", options));
  assert.throws(() => buildQuery("mods", { field: "modCount" }));
});
test("the fixed twelve-field response distinguishes null, genuine zero and empty successful pages", () => {
  const query = buildQuery("modpacks"),
    unknown = resource(),
    zero = {
      ...resource("curseforge", "123"),
      modCount: 0,
      downloadCount: 0,
      createdAt: 0,
      dependencyState: "complete",
    };
  assert.deepEqual(
    readPage(envelope([unknown, zero]), "modpack", query),
    envelope([unknown, zero]),
  );
  assert.equal(readPage(envelope([]), "modpack", query).page.returned, 0);
  assert.equal(Object.keys(readResource(unknown, "modpack")).length, 12);
  for (const broken of [
    { ...unknown, sourceId: 123 },
    { ...unknown, downloadCount: "0" },
    { ...unknown, modCount: -1 },
    { ...unknown, dependencyState: null },
    { ...unknown, name: undefined },
    { ...unknown, type: "mod" },
  ])
    assert.throws(() => readResource(broken, "modpack"));
  assert.throws(() =>
    readPage({ error: { code: "failed" } }, "modpack", query),
  );
  assert.throws(() =>
    readPage(
      { ...envelope([unknown]), page: { offset: 0, limit: 20, returned: 0 } },
      "modpack",
      query,
    ),
  );
  assert.throws(() =>
    readPage(
      envelope([unknown]),
      "modpack",
      buildQuery("modpacks", { source: "curseforge" }),
    ),
  );
});
test("old numeric bookmarks retain their CurseForge origin while new Modrinth routes keep native casing", () => {
  assert.deepEqual(
    routeSelection({ params: { ids: "123,456" }, query: {} }).query
      .dependencyRefs,
    [
      { source: "curseforge", sourceId: "123" },
      { source: "curseforge", sourceId: "456" },
    ],
  );
  const modern = routeSelection({
    params: { ids: "Ok6FyXJ9,AbC" },
    query: {
      source: "modrinth",
      sort: "updatedAt",
      direction: "asc",
      offset: "20",
    },
  });
  assert.equal(modern.query.dependencyRefs[1].sourceId, "AbC");
  assert.equal(modern.query.offset, 20);
  assert.deepEqual(routeSelection({ params: {}, query: {} }).query.sources, [
    "curseforge",
    "modrinth",
  ]);
  for (const route of [
    { params: { ids: "ABC" }, query: {} },
    { params: { ids: "1" }, query: { source: "all" } },
    { params: {}, query: { source: ["curseforge", "modrinth"] } },
    { params: {}, query: { offset: "20px" } },
  ])
    assert.throws(() => routeSelection(route));
});
test("selection migration keeps legacy originals and separately stores same-ID resources from different sources", () => {
  const legacy = JSON.stringify([{ id: 123, name: "Old selection" }]),
    storage = store({ modList: legacy });
  const migrated = readSelections(storage);
  assert.equal(migrated[0].source, "curseforge");
  assert.equal(migrated[0].sourceId, "123");
  saveSelections(storage, [
    ...migrated,
    resource("modrinth", "123", "mod"),
    resource("modrinth", "AbC", "mod"),
    resource("modrinth", "abc", "mod"),
  ]);
  assert.equal(storage.getItem("modList"), legacy);
  assert.equal(JSON.parse(storage.getItem(SELECTION_KEY)).schemaVersion, 2);
  assert.equal(readSelections(storage).length, 4);
  const corrupt = store({ [SELECTION_KEY]: "broken", modList: legacy });
  assert.equal(readSelections(corrupt)[0].sourceId, "123");
  assert.equal(corrupt.getItem(SELECTION_KEY), "broken");
});
test("website requests acquire a fresh CAPTCHA every time and never send business authorization or cookies", async () => {
  let tokens = 0;
  const calls = [];
  const client = createMinecraftClient({
    fetcher: async (url, options) => {
      calls.push({ url, options });
      const body = JSON.parse(options.body);
      return new Response(
        JSON.stringify(envelope([], body.offset, body.limit)),
        { status: 200 },
      );
    },
  });
  const verify = async () => `fresh-${++tokens}`;
  await client.query("mods", buildQuery("mods"), verify);
  await client.query("modpacks", buildQuery("modpacks"), verify);
  assert.equal(tokens, 2);
  assert.ok(calls[0].url.endsWith("/v2/web/minecraft/mods/query"));
  assert.ok(calls[1].url.endsWith("/v2/web/minecraft/modpacks/query"));
  assert.equal(JSON.parse(calls[0].options.body).recaptcha, "fresh-1");
  assert.equal(JSON.parse(calls[1].options.body).recaptcha, "fresh-2");
  assert.deepEqual(calls[0].options.headers, {
    "Content-Type": "application/json",
  });
  assert.equal(calls[0].options.credentials, "omit");
});
test("CAPTCHA work completed after cancellation never sends a stale search request", async () => {
  let resolveToken,
    calls = 0;
  const controller = new AbortController();
  const token = new Promise((resolve) => {
    resolveToken = resolve;
  });
  const client = createMinecraftClient({
    fetcher: async () => {
      calls++;
      return new Response("{}");
    },
  });
  const pending = client.query(
    "mods",
    buildQuery("mods"),
    () => token,
    controller.signal,
  );
  await Promise.resolve();
  controller.abort();
  resolveToken("late");
  await assert.rejects(pending, (error) => error.name === "AbortError");
  assert.equal(calls, 0);
});
test("website error statuses stay distinct and never become empty results", async () => {
  for (const [status, code] of [
    [400, "invalid_request"],
    [401, "verification_expired"],
    [403, "verification_failed"],
    [404, "api_unavailable"],
    [429, "rate_limited"],
    [503, "service_unavailable"],
  ]) {
    const client = createMinecraftClient({
      fetcher: async () =>
        new Response(
          JSON.stringify({ error: { code: "server_code", message: "detail" } }),
          { status },
        ),
    });
    await assert.rejects(
      client.query("mods", buildQuery("mods"), async () => "fresh"),
      (error) => error.status === status && error.code === code,
    );
  }
  const client = createMinecraftClient({
    fetcher: async () =>
      new Response(JSON.stringify({ error: { code: "failed" } }), {
        status: 200,
      }),
  });
  await assert.rejects(
    client.query("mods", buildQuery("mods"), async () => "fresh"),
    (error) => error.code === "invalid_response",
  );
});
test("Retry-After seconds and HTTP dates delay all public Minecraft requests, including changed filters", async () => {
  let now = 1000,
    calls = 0,
    tokens = 0;
  assert.equal(retryDeadline("12", now), 13000);
  assert.equal(retryDeadline("Thu, 01 Jan 1970 00:00:20 GMT", now), 20000);
  const client = createMinecraftClient({
    now: () => now,
    fetcher: async () => {
      calls++;
      return calls === 1
        ? new Response("{}", { status: 429, headers: { "Retry-After": "3" } })
        : new Response(JSON.stringify(envelope([])));
    },
  });
  const verify = async () => `token-${++tokens}`;
  await assert.rejects(
    client.query("mods", buildQuery("mods"), verify),
    (error) => error.retryAt === 4000,
  );
  await assert.rejects(
    client.query(
      "modpacks",
      buildQuery("modpacks", { source: "modrinth" }),
      verify,
    ),
    (error) => error.status === 429,
  );
  assert.equal(calls, 1);
  assert.equal(tokens, 1);
  now = 4000;
  await client.query("modpacks", buildQuery("modpacks"), verify);
  assert.equal(calls, 2);
  assert.equal(tokens, 2);
});
test("links accept public HTTP pages while rejecting scripts, credentials and malformed targets", () => {
  assert.equal(
    safeWebUrl("https://modrinth.com/mod/Ok6FyXJ9"),
    "https://modrinth.com/mod/Ok6FyXJ9",
  );
  for (const value of [
    null,
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:pass@example.org/",
    "//example.org",
  ])
    assert.equal(safeWebUrl(value), undefined);
});
