/** Upstream DTOs: focess-api c5161ed942ef58ef66821fcc0f0903162968a645. IDs are case-sensitive. */
export type MinecraftSource = "curseforge" | "modrinth";
export type MinecraftType = "mod" | "modpack";
export interface DependencyRef {
  source: MinecraftSource;
  sourceId: string;
}
export interface Range {
  min?: number | null;
  max?: number | null;
}
export interface MinecraftQuery {
  sources?: MinecraftSource[] | null;
  keyword?: string | null;
  dependencyRefs?: DependencyRef[] | null;
  sort?: {
    field:
      | "sourceId"
      | "name"
      | "createdAt"
      | "updatedAt"
      | "downloadCount"
      | "modCount";
    direction: "asc" | "desc";
  } | null;
  offset?: number | null;
  limit?: number | null;
  filters?: {
    createdAt?: Range | null;
    updatedAt?: Range | null;
    downloadCount?: Range | null;
    modCount?: Range | null;
  } | null;
}
export interface WebMinecraftQuery extends MinecraftQuery {
  recaptcha: string;
}
export interface MinecraftResource {
  source: MinecraftSource;
  sourceId: string;
  type: MinecraftType;
  name: string | null;
  webUrl: string | null;
  logoUrl: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  downloadCount: number | null;
  selectedVersionId: string | null;
  dependencyState: "unknown" | "partial" | "complete";
  modCount: number | null;
}
export interface MinecraftPage {
  data: MinecraftResource[];
  page: { offset: number; limit: number; returned: number };
}
export interface ApiError {
  error: { code: string; message: string };
}

export interface MinecraftOverview {
  data: {
    sources: { source: MinecraftSource; mods: number; modpacks: number }[];
  };
}
