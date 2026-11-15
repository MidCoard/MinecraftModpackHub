export const RANGE_FIELDS = [
  "createdAt",
  "updatedAt",
  "downloadCount",
  "modCount",
];
export const rangeKeys = RANGE_FIELDS.flatMap((field) => [
  field + "Min",
  field + "Max",
]);
export class RangeInputError extends Error {
  constructor(field) {
    super("Invalid range");
    this.field = field;
  }
}
export function validateFilters(filters, kind) {
  if (filters == null) return {};
  if (typeof filters !== "object" || Array.isArray(filters))
    throw new RangeInputError("");
  const result = {};
  for (const [field, range] of Object.entries(filters)) {
    if (
      !RANGE_FIELDS.includes(field) ||
      (field === "modCount" && kind !== "modpacks")
    )
      throw new RangeInputError(field);
    if (range == null) continue;
    if (
      typeof range !== "object" ||
      Array.isArray(range) ||
      Object.keys(range).some((key) => !["min", "max"].includes(key))
    )
      throw new RangeInputError(field);
    const bounds = {};
    for (const side of ["min", "max"]) {
      const value = range[side];
      if (value == null) continue;
      if (
        !Number.isSafeInteger(value) ||
        value < 0 ||
        (field.endsWith("At") && value > 253402300799999)
      )
        throw new RangeInputError(field + (side === "min" ? "Min" : "Max"));
      bounds[side] = value;
    }
    if (bounds.min != null && bounds.max != null && bounds.min > bounds.max)
      throw new RangeInputError(field + "Max");
    if (Object.keys(bounds).length) result[field] = bounds;
  }
  return result;
}
function dateBoundary(text, end, key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new RangeInputError(key);
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    throw new RangeInputError(key);
  if (end) date.setDate(date.getDate() + 1);
  return date.getTime() - (end ? 1 : 0);
}
export function filtersFromDraft(draft = {}, kind = "modpacks") {
  const filters = {};
  for (const field of RANGE_FIELDS) {
    const range = {};
    for (const side of ["Min", "Max"]) {
      const key = field + side,
        raw = draft[key];
      if (raw == null || raw === "") continue;
      if (
        typeof raw !== "string" ||
        (field === "modCount" && kind !== "modpacks")
      )
        throw new RangeInputError(key);
      const text = raw.trim();
      if (!text) continue;
      if (!field.endsWith("At") && !/^\d+$/.test(text))
        throw new RangeInputError(key);
      range[side.toLowerCase()] = field.endsWith("At")
        ? dateBoundary(text, side === "Max", key)
        : Number(text);
    }
    filters[field] = range;
  }
  // The mod-only form deliberately omits the pack-only field.
  if (kind === "mods" && !draft.modCountMin && !draft.modCountMax)
    delete filters.modCount;
  return validateFilters(filters, kind);
}
export function readRangeDraft(query = {}, kind = "modpacks") {
  const draft = {};
  for (const key of rangeKeys) {
    const value = query[key];
    if (value !== undefined) {
      if (typeof value !== "string") throw new RangeInputError(key);
      draft[key] = value;
    }
  }
  filtersFromDraft(draft, kind);
  return draft;
}
export function rangeQuery(query, draft, kind) {
  filtersFromDraft(draft, kind);
  const next = { ...query, offset: "0" };
  for (const key of rangeKeys) {
    delete next[key];
    if (typeof draft[key] === "string" && draft[key].trim())
      next[key] = draft[key].trim();
  }
  return next;
}
