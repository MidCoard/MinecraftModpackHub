import test from "node:test";
import assert from "node:assert/strict";
import {
  readSavedLocale,
  saveLocale,
  readSavedTheme,
} from "../src/site/preferences.js";

const storage = (values = {}) => {
  const data = new Map(Object.entries(values));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
};

test("portal and search read existing planner preferences and retain legacy language choices", () => {
  assert.equal(
    readSavedLocale(storage({ "factory-locale": "en_us", lang: "zh-cn" })),
    "en",
  );
  assert.equal(
    readSavedLocale(storage({ "factory-locale": "zh_cn", lang: "en" })),
    "zh-cn",
  );
  assert.equal(readSavedLocale(storage({ lang: "en" })), "en");
  assert.equal(
    readSavedLocale(storage({ "factory-locale": "unknown", lang: "zh-cn" })),
    "zh-cn",
  );
  const existing = storage({
    modList: "preserved",
    "factory-static-draft:pack": "preserved",
  });
  saveLocale(existing, "en");
  assert.equal(existing.getItem("factory-locale"), "en_us");
  assert.equal(existing.getItem("lang"), "en");
  saveLocale(existing, "zh-CN");
  assert.equal(existing.getItem("factory-locale"), "zh_cn");
  assert.equal(existing.getItem("lang"), "zh-cn");
  assert.equal(existing.getItem("modList"), "preserved");
  assert.equal(existing.getItem("factory-static-draft:pack"), "preserved");
});

test("saved themes accept only supported modes and unavailable storage keeps system fallback", () => {
  assert.equal(readSavedTheme(storage({ "factory-theme": "dark" })), "dark");
  assert.equal(readSavedTheme(storage({ "factory-theme": "light" })), "light");
  assert.equal(
    readSavedTheme(storage({ "factory-theme": "invalid" })),
    undefined,
  );
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(readSavedTheme(blocked), undefined);
  assert.equal(readSavedLocale(blocked), undefined);
  assert.doesNotThrow(() => saveLocale(blocked, "en"));
});
