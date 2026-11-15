const localeNames = new Map([
  ["en", "en"],
  ["en-us", "en"],
  ["en_us", "en"],
  ["zh-cn", "zh-cn"],
  ["zh_cn", "zh-cn"],
]);

function read(storage, key) {
  try {
    return storage?.getItem(key);
  } catch {
    return null;
  }
}

export function readSavedLocale(storage) {
  return (
    localeNames.get(String(read(storage, "factory-locale")).toLowerCase()) ||
    localeNames.get(String(read(storage, "lang")).toLowerCase())
  );
}

export function saveLocale(storage, value) {
  const locale = localeNames.get(String(value).toLowerCase());
  if (!locale) return;
  for (const [key, next] of [
    ["lang", locale],
    ["factory-locale", locale === "en" ? "en_us" : "zh_cn"],
  ]) {
    try {
      storage?.setItem(key, next);
    } catch {}
  }
}

export function readSavedTheme(storage) {
  const value = read(storage, "factory-theme");
  return value === "light" || value === "dark" ? value : undefined;
}

function applyTheme() {
  let theme;
  try {
    theme = readSavedTheme(localStorage);
  } catch {}
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

if (typeof document !== "undefined") {
  applyTheme();
  globalThis.addEventListener("storage", (event) => {
    if (event.key === "factory-theme" || event.key === null) applyTheme();
  });
}
