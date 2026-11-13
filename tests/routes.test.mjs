import test from "node:test";
import assert from "node:assert/strict";
import { modIds } from "../src/utils/mod-ids.js";
import { readOverview } from "../src/utils/overview.js";
import {
  createRequestGate,
  readModSelection,
  boundedRequest,
  moveActive,
} from "../src/utils/request-gate.js";

test("index counts accept numeric JSON and decimal strings while rejecting missing or corrupt data", () => {
  const counts = {
    availableMods: 123,
    availableModpacks: 45,
    notAvailableModpacks: 0,
    notEmptyModpacks: 40,
  };
  assert.deepEqual(readOverview(counts), counts);
  assert.deepEqual(
    readOverview(
      Object.fromEntries(
        Object.entries(counts).map(([key, value]) => [key, String(value)]),
      ),
    ),
    counts,
  );
  for (const value of [null, undefined, "", "bad", -1, Infinity, true])
    assert.throws(() => readOverview({ ...counts, availableMods: value }));
});
test("malformed selections cannot become external navigation or injection", () => {
  for (const value of [
    "[]",
    "https://example.org",
    "1,<script>",
    "%zz",
    "[null]",
  ])
    assert.throws(() => modIds(value));
  assert.deepEqual(modIds('[123,"123",456]'), ["123", "456"]);
});
test("a newer query and clearing invalidate work including pending token requests", () => {
  const gate = createRequestGate(),
    first = gate.begin();
  assert.ok(first.current());
  const second = gate.begin();
  assert.equal(first.current(), false);
  assert.ok(first.signal.aborted);
  assert.ok(second.current());
  gate.cancel();
  assert.equal(second.current(), false);
  assert.ok(second.signal.aborted);
});
test("selected mods are retained from both existing UIs without deleting corrupt storage", () => {
  const saved = JSON.stringify([
    { id: 123, name: "Create" },
    { id: 123, name: "Duplicate" },
  ]);
  const store = {
    getItem: (key) =>
      key === "modList" ? "broken" : key === "selectedMods" ? saved : null,
  };
  assert.deepEqual(
    readModSelection(store).map(({ id, name }) => ({ id, name })),
    [{ id: 123, name: "Create" }],
  );
  assert.deepEqual(readModSelection(store)[0].authors, []);
  assert.equal(store.getItem("modList"), "broken");
});

test("blocked anti-bot setup times out and remains retryable", async () => {
  await assert.rejects(
    boundedRequest(() => new Promise(() => {}), 5),
    /timed out/,
  );
  assert.equal(
    await boundedRequest(() => Promise.resolve("ready"), 100),
    "ready",
  );
});

test("autocomplete keyboard selection wraps and starts at the correct end", () => {
  assert.equal(moveActive(-1, 1, 3), 0);
  assert.equal(moveActive(-1, -1, 3), 2);
  assert.equal(moveActive(0, -1, 3), 2);
  assert.equal(moveActive(2, 1, 3), 0);
  assert.equal(moveActive(-1, 1, 0), -1);
});
