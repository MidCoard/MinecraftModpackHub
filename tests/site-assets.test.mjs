import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

test("navigation artwork ships locally without the replaced textures, fonts or icon service", () => {
  const read = (name) =>
    readFileSync(new URL("../" + name, import.meta.url), "utf8");
  for (const name of [
    "index.html",
    "factory/index.html",
    "modpacks/index.html",
    "src/site/site.css",
    "src/assets/css/theme.css",
  ]) {
    assert.doesNotMatch(read(name), /kenney|fusion.pixel|\/fonts\//i, name);
  }
  for (const name of [
    "src/components/Header.vue",
    "src/components/Footer.vue",
    "src/app/Home/Home.vue",
  ]) {
    assert.doesNotMatch(read(name), /@iconify/, name);
  }
  assert.doesNotMatch(
    read("public/pack.svg"),
    /<script|(?:href|src)\s*=\s*["']https?:|url\(\s*["']?https?:|<image/i,
  );
  assert.ok(
    !readdirSync(new URL("../public/", import.meta.url)).includes("fonts"),
  );
  assert.equal(
    JSON.parse(read("package.json")).dependencies["@iconify/vue"],
    undefined,
  );
  assert.match(read("index.html"), /href="\/modpacks\/"/);
  assert.match(read("index.html"), /href="\/factory\/"/);
  assert.match(read("factory/index.html"), /href="\/factory\/app\/"/);
});
