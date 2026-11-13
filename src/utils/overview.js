export function readOverview(data) {
  return Object.fromEntries(
    [
      "availableMods",
      "availableModpacks",
      "notAvailableModpacks",
      "notEmptyModpacks",
    ].map((key) => {
      let value = data?.[key];
      if (typeof value === "string" && /^\d+$/.test(value))
        value = Number(value);
      if (!Number.isSafeInteger(value) || value < 0)
        throw new Error(`Invalid index count: ${key}`);
      return [key, value];
    }),
  );
}
