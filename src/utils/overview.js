export function readOverview(data) {
  const sources = data?.data?.sources;
  if (
    !Array.isArray(sources) ||
    sources.length !== 2 ||
    sources[0]?.source !== "curseforge" ||
    sources[1]?.source !== "modrinth" ||
    sources.some((row) =>
      [row.mods, row.modpacks].some(
        (value) =>
          typeof value !== "number" || !Number.isInteger(value) || value < 0,
      ),
    )
  )
    throw new Error("Invalid catalog overview");
  return {
    sources: sources.map(({ source, mods, modpacks }) => ({
      source,
      mods,
      modpacks,
    })),
    mods: sources[0].mods + sources[1].mods,
    modpacks: sources[0].modpacks + sources[1].modpacks,
  };
}
