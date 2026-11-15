import test from "node:test";
import assert from "node:assert/strict";
import {
  filtersFromDraft,
  readRangeDraft,
  rangeQuery,
  validateFilters,
} from "../src/api/ranges.js";
import {
  buildQuery,
  routeSelection,
  createMinecraftClient,
} from "../src/api/minecraft.js";

test("range counts preserve zero, omit empty bounds, support one-sided AND filters and safe integers", () => {
  assert.deepEqual(
    filtersFromDraft({
      downloadCountMin: "0",
      modCountMax: "200",
      createdAtMin: "",
    }),
    { downloadCount: { min: 0 }, modCount: { max: 200 } },
  );
  assert.deepEqual(
    validateFilters({ downloadCount: {}, modCount: null }, "modpacks"),
    {},
  );
  for (const value of ["-1", "1.5", "1e3", "NaN", "9007199254740992"])
    assert.throws(() => filtersFromDraft({ downloadCountMin: value }));
  assert.throws(() =>
    filtersFromDraft({ downloadCountMin: "10", downloadCountMax: "9" }),
  );
  assert.throws(() =>
    validateFilters({ downloadCount: { min: "1000" } }, "modpacks"),
  );
  assert.throws(() => validateFilters({ modCount: { min: 0 } }, "mods"));
  assert.deepEqual(filtersFromDraft({ downloadCountMax: "10" }, "mods"), {
    downloadCount: { max: 10 },
  });
});
test("local date bounds include the whole end day and reject impossible dates and reversed ranges", () => {
  const filters = filtersFromDraft({
    createdAtMin: "2024-03-10",
    createdAtMax: "2024-03-10",
    updatedAtMax: "2024-12-31",
  });
  assert.equal(filters.createdAt.min, new Date(2024, 2, 10).getTime());
  assert.equal(filters.createdAt.max, new Date(2024, 2, 11).getTime() - 1);
  assert.equal(filters.updatedAt.max, new Date(2025, 0, 1).getTime() - 1);
  for (const date of ["2024-02-30", "2023-02-29", "invalid", "1969-01-01"])
    assert.throws(() => filtersFromDraft({ createdAtMin: date }));
  assert.throws(() =>
    filtersFromDraft({
      createdAtMin: "2025-01-01",
      createdAtMax: "2024-12-31",
    }),
  );
});
test("range route roundtrips preserve filters across sort/page and reset offset on apply/clear", () => {
  const draft = {
    downloadCountMin: "10000",
    downloadCountMax: "1000000",
    modCountMin: "20",
    modCountMax: "200",
    updatedAtMax: "2024-12-31",
  };
  const query = rangeQuery(
    { source: "curseforge", sort: "updatedAt", direction: "asc", offset: "40" },
    draft,
    "modpacks",
  );
  assert.equal(query.offset, "0");
  const first = routeSelection({ params: { ids: "890405" }, query }).query;
  assert.deepEqual(first.filters.downloadCount, { min: 10000, max: 1000000 });
  const second = routeSelection({
    params: { ids: "890405" },
    query: { ...query, offset: "20", sort: "downloadCount" },
  }).query;
  assert.deepEqual(second.filters, first.filters);
  assert.equal(second.offset, 20);
  assert.deepEqual(readRangeDraft(query), draft);
  const cleared = rangeQuery(query, {}, "modpacks");
  assert.equal(cleared.offset, "0");
  assert.equal(
    "filters" in routeSelection({ params: {}, query: cleared }).query,
    false,
  );
  assert.throws(() => readRangeDraft({ downloadCountMin: ["1", "2"] }));
  const mods = buildQuery("mods", {
    keyword: "Create",
    filters: { downloadCount: { min: 0 } },
  });
  assert.equal(typeof mods.filters.downloadCount.min, "number");
});

test("end-of-day conversion follows a 23-hour daylight-saving day", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    const range = filtersFromDraft({
      createdAtMin: "2024-03-10",
      createdAtMax: "2024-03-10",
    }).createdAt;
    assert.equal(range.max - range.min + 1, 23 * 60 * 60 * 1000);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
test("all three real client requests select exact CAPTCHA actions and obtain fresh tokens on retries", async () => {
  const actions = [],
    requests = [];
  let fail = true;
  const client = createMinecraftClient({
    baseUrl: "https://api.test",
    fetcher: async (url, init) => {
      const body = JSON.parse(init.body);
      requests.push({ url, init, body });
      if (fail) {
        fail = false;
        return { ok: false, status: 400, headers: new Headers() };
      }
      const data = url.endsWith("overview")
        ? {
            data: {
              sources: [
                { source: "curseforge", mods: 0, modpacks: 0 },
                { source: "modrinth", mods: 0, modpacks: 0 },
              ],
            },
          }
        : { data: [], page: { offset: 0, limit: 20, returned: 0 } };
      return { ok: true, json: async () => data };
    },
  });
  const verify = async (action) => {
    actions.push(action);
    return "fresh-" + actions.length;
  };
  await assert.rejects(
    client.query("mods", buildQuery("mods", { keyword: "Create" }), verify),
    (error) => error.status === 400,
  );
  await client.query("mods", buildQuery("mods", { keyword: "Create" }), verify);
  await client.query(
    "modpacks",
    buildQuery("modpacks", { filters: { modCount: { min: 0 } } }),
    verify,
  );
  await client.overview(verify);
  assert.deepEqual(actions, [
    "search_mods",
    "search_mods",
    "search_modpacks",
    "mod_overview",
  ]);
  assert.equal(
    new Set(requests.map((request) => request.body.recaptcha)).size,
    4,
  );
  for (const { init } of requests) {
    assert.equal(init.credentials, "omit");
    assert.deepEqual(init.headers, { "Content-Type": "application/json" });
  }
});
