import "./site.css";
import { readSavedLocale, saveLocale } from "./preferences.js";

const english = {
  disclaimer:
    "Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.",
  brandLabel: "Focess Minecraft home",
  navLabel: "Tool navigation",
  toolsLabel: "Minecraft tools",
  flowLabel: "Materials flow from inputs through processing to outputs",
  capLabel: "Features",
  navSearch: "Find modpacks",
  navFactory: "Plan production",
  skip: "Skip to content",
  headlineA: "Find your next modpack.",
  headlineB: "Build your own factory.",
  intro: "Find modpacks or import recipes to plan a production line.",
  online: "Online search",
  local: "Browser planning",
  sample: "Which mods do you want to play?",
  searchTitle: "Find a pack that fits",
  searchCopy:
    "Find packs on CurseForge or Modrinth that include the mods you choose.",
  searchAction: "Find modpacks",
  factoryTitle: "Make your production add up",
  factoryCopy:
    "Import recipes, connect machines, calculate production and power, then test the line in simulation.",
  factoryAction: "Open production planner",
  homeLink: "Focess home",
  flowInput: "Inputs",
  flowProcess: "Process",
  flowOutput: "Outputs",
};
const chinese = Object.fromEntries(
  [...document.querySelectorAll("[data-text]")].map((node) => [
    node.dataset.text,
    node.textContent,
  ]),
);
const chineseAria = Object.fromEntries(
  [...document.querySelectorAll("[data-aria]")].map((node) => [
    node.dataset.aria,
    node.getAttribute("aria-label"),
  ]),
);
let locale = "zh-cn";
try {
  locale = readSavedLocale(localStorage) || locale;
} catch {}
function renderLocale() {
  document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  document.querySelectorAll("[data-text]").forEach((node) => {
    node.textContent =
      (locale === "en" ? english : chinese)[node.dataset.text] ||
      chinese[node.dataset.text];
  });
  document
    .querySelectorAll("[data-aria]")
    .forEach((node) =>
      node.setAttribute(
        "aria-label",
        locale === "en"
          ? english[node.dataset.aria]
          : chineseAria[node.dataset.aria],
      ),
    );
  const control = document.querySelector("[data-locale]");
  control.textContent = locale === "en" ? "中文" : "EN";
  control.lang = locale === "en" ? "zh-CN" : "en";
  control.setAttribute(
    "aria-label",
    locale === "en" ? "切换到简体中文" : "Switch to English",
  );
  document.title =
    locale === "en"
      ? "Focess Minecraft · Find packs, plan production"
      : "Focess Minecraft · 找整合包，规划产线";
  try {
    saveLocale(localStorage, locale);
  } catch {}
}
document.querySelector("[data-locale]").addEventListener("click", () => {
  locale = locale === "en" ? "zh-cn" : "en";
  renderLocale();
});
renderLocale();
