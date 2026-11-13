export function modIds(value) {
  let text = decodeURIComponent(String(value));
  let ids = text.startsWith("[") ? JSON.parse(text) : text.split(",");
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 100 ||
    ids.some((id) => !/^[1-9]\d*$/.test(String(id)))
  ) {
    throw new Error("Invalid mod selection");
  }
  return [...new Set(ids.map(String))];
}
