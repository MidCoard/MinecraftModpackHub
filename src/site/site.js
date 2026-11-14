import "./site.css";

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
  intro:
    "Start with the mods you want to play. Then turn real recipes into a production line of your own.",
  online: "Online search",
  local: "Browser planning",
  sample: "Which mods do you want to play?",
  searchTitle: "Find a pack that fits",
  searchCopy:
    "Choose your favorite mods and find modpacks that include them. Check versions, authors, and original download pages.",
  searchAction: "Find modpacks",
  factoryTitle: "Make your production add up",
  factoryCopy:
    "Import pack recipes, connect machines and materials, calculate supply and power, then check the line in a live simulation.",
  factoryAction: "Open production planner",
  entryNote:
    "Find modpacks online and plan production in your browser. You keep your own recipe data and plans.",
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
  const saved = localStorage.getItem("lang");
  if (saved === "en") locale = "en";
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
  control.setAttribute(
    "aria-label",
    locale === "en" ? "切换到简体中文" : "Switch to English",
  );
  document.title =
    locale === "en"
      ? "Focess Minecraft · Find packs, plan production"
      : "Focess Minecraft · 找整合包，规划产线";
}
document.querySelector("[data-locale]").addEventListener("click", () => {
  locale = locale === "en" ? "zh-cn" : "en";
  try {
    localStorage.setItem("lang", locale);
  } catch {}
  renderLocale();
});
renderLocale();
