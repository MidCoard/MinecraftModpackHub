import "./site.css";

const english = {
  credits: "Assets & credits",
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
  factoryAction: "Explore FactoryCanvas",
  entryNote:
    "Find modpacks online and plan production in your browser. You keep your own recipe data and plans.",
  homeLink: "Focess home",
  flowInput: "Inputs",
  flowProcess: "Process",
  flowOutput: "Outputs",
  preview: "Browser planning · local data",
  factoryHeadlineA: "Turn your recipes into",
  factoryHeadlineB: "a working production line.",
  factoryIntro:
    "Work from the recipes in your own modpack. Plan material flow, machine power, and the output your line can deliver.",
  openLocal: "Open production planner",
  usage: "How to use ↓",
  localNote:
    "Read an exported JSON file. No Java application or modpack upload required.",
  diagram: "Production concept",
  boardInput: "Materials & machines",
  boardOutput: "Connect → solve → verify",
  capImport: "Import real recipes",
  capImportCopy:
    "Choose an exported modpack JSON file, or load recipe data provided by the site.",
  capPlan: "Connect and solve",
  capPlanCopy:
    "Set supplies, machines, and output goals. Check material balance, power, and equipment requirements.",
  capSim: "Verify execution",
  capSimCopy:
    "Watch material movement and machine progress in live simulation. Save your plan and keep refining it.",
  usageLabel: "GET STARTED IN YOUR BROWSER",
  usageTitle: "Your modpack stays local.",
  usageCopy:
    "The planner reads only JSON you choose. Calculation and saved plans stay in your browser; game files are not uploaded.",
  runTitle: "Choose data and start planning",
  runCopy:
    "Open the planner, import a modpack JSON file, then choose recipes and output goals:",
  runThen:
    "Save plan versions and export backups regularly. Clearing site data removes the copies stored in your browser.",
  limitsTitle: "Current support",
  limitsCopy:
    "Offline metadata readers cover Forge, NeoForge, and Fabric. The game collector targets Minecraft 1.20.1 / Forge 47.4.16. It is compile-verified and has not completed in-game release acceptance. NeoForge and Fabric runtime collectors are not implemented. Static import is not the final in-game recipe set.",
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
  document.title = document.body.classList.contains("factory-page")
    ? locale === "en"
      ? "FactoryCanvas · Minecraft production planning"
      : "FactoryCanvas · Minecraft 产线规划"
    : locale === "en"
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
