<script setup>
import {
  SOURCES,
  readSelections,
  saveSelections,
  resourceKey,
} from "@/api/minecraft.js";
import MCButton from "@/components/MCButton.vue";
import MCFrame from "@/components/MCFrame.vue";
import ResourceLogo from "@/components/ResourceLogo.vue";
import { useMessage } from "@/components/Message";
import RangeFilters from "@/components/RangeFilters.vue";
import { filtersFromDraft, readRangeDraft, rangeQuery } from "@/api/ranges.js";
import SearchBar from "@/components/SearchBar.vue";
import Icon from "@/components/PixelIcon.vue";
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRouter, useRoute } from "vue-router";
const { success } = useMessage(),
  router = useRouter(),
  { t } = useI18n();
const route = useRoute();
const modFilters = computed(() => {
  try {
    return filtersFromDraft(readRangeDraft(route.query, "mods"), "mods");
  } catch {
    return null;
  }
});
function applyRanges(draft) {
  router.replace({ query: rangeQuery(route.query, draft, "mods") });
}
let saved = [],
  initial = "curseforge";
try {
  saved = readSelections(localStorage);
  const preferred = localStorage.getItem("minecraft-search-source");
  initial = SOURCES.includes(preferred)
    ? preferred
    : saved[0]?.source || initial;
} catch {}
const selections = ref(saved),
  source = ref(initial),
  selectionError = ref("");
const modList = computed(() =>
  selections.value.filter((mod) => mod.source === source.value),
);
watch(source, (value) => {
  selectionError.value = "";
  try {
    localStorage.setItem("minecraft-search-source", value);
  } catch {}
});
function persist() {
  try {
    saveSelections(localStorage, selections.value);
  } catch {
    selectionError.value = t("errors.selection_storage");
  }
}
function onModAdded(mod) {
  if (
    mod.source !== source.value ||
    selections.value.some((row) => resourceKey(row) === resourceKey(mod))
  )
    return;
  if (modList.value.length >= 256) {
    selectionError.value = t("home.modlist.limit");
    return;
  }
  selections.value.push(mod);
  persist();
  success(t("home.modlist.added"));
}
function onModRemoveBtnClick(mod) {
  selections.value = selections.value.filter(
    (row) => resourceKey(row) !== resourceKey(mod),
  );
  persist();
  success(t("home.modlist.removed"));
}
function onSearchBtnClick() {
  if (!modList.value.length) return;
  router.push({
    name: "search",
    params: { ids: modList.value.map((mod) => mod.sourceId).join(",") },
    query: { source: source.value },
  });
}
</script>
<template>
  <Teleport to="#header-slot">
    <RouterLink to="/status" class="header-link mc-button">{{
      t("header.toolbar.status")
    }}</RouterLink>
  </Teleport>
  <header class="search-heading">
    <h1>{{ t("home.protips.title") }}</h1>
    <p>{{ t("home.protips.desc") }}</p>
  </header>
  <MCFrame class="search-inventory">
    <section class="search-panel">
      <label class="search-field-label" for="mod-search-input">{{
        t("home.searchbar.label")
      }}</label>
      <div class="source-filter">
        <label for="mod-source">{{ t("sources.label") }}</label
        ><select id="mod-source" v-model="source">
          <option v-for="provider in SOURCES" :key="provider" :value="provider">
            {{ t("sources." + provider) }}
          </option>
        </select>
      </div>
      <p class="source-hint">{{ t("sources.selectionHint") }}</p>
      <SearchBar :source="source" :filters="modFilters" @add-mod="onModAdded" />
      <RangeFilters kind="mods" :query="route.query" @apply="applyRanges" />
      <p v-if="selectionError" role="alert">{{ selectionError }}</p>
      <div class="selection-heading">
        <h2>{{ t("home.modlist.title") }}</h2>
        <span>{{ t("home.modlist.count", { count: modList.length }) }}</span>
      </div>
      <div class="selection-well">
        <p v-if="!modList.length" class="selection-empty">
          {{ t("home.modlist.empty") }}
        </p>
        <ul v-else class="selected-mods">
          <li
            v-for="mod of modList"
            :key="resourceKey(mod)"
            class="selected-mod mc-slot"
          >
            <ResourceLogo class="image" :url="mod.logoUrl" />
            <div class="detail">
              <span class="name">{{ mod.name ?? t("search.unknown") }}</span
              ><span class="author"
                >{{ t("sources." + mod.source) }} · {{ mod.sourceId }}</span
              >
            </div>
            <button
              type="button"
              class="remove-mod"
              @click="onModRemoveBtnClick(mod)"
              :aria-label="
                t('home.modlist.remove', [mod.name ?? t('search.unknown')])
              "
            >
              <Icon icon="pixelarticons:close" />
            </button>
          </li>
        </ul>
      </div>
      <div class="search-actions">
        <p>{{ t("home.modlist.hint") }}</p>
        <RouterLink
          class="mc-button browse-packs"
          :to="{ name: 'search', query: { source: 'all' } }"
          >{{ t("search.browse") }}</RouterLink
        >
        <MCButton :disabled="modList.length === 0" @click="onSearchBtnClick">{{
          t("home.searchbtn")
        }}</MCButton>
      </div>
    </section>
  </MCFrame>
</template>

<style scoped>
.search-heading {
  margin: 6px 0 22px;
}
.search-heading h1 {
  margin: 0 0 8px;
  font: 600 clamp(24px, 3vw, 32px) / 1.3 var(--pixel);
}
.search-heading p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}
.search-panel {
  padding: clamp(14px, 3vw, 28px);
}
h2 {
  margin: 0 0 12px;
  font: 600 16px/1.5 var(--pixel);
}
.search-field-label {
  display: block;
  margin-bottom: 12px;
  font: 600 16px/1.5 var(--pixel);
}
.selection-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-top: 26px;
}
.selection-heading span {
  font-size: 13px;
  color: var(--muted);
}
.selection-well {
  min-height: 160px;
  padding: 12px;
  background: var(--well);
  box-shadow: var(--recessed);
  border: 2px solid var(--shadow);
}
.selection-empty {
  margin: 0;
  min-height: 132px;
  display: grid;
  place-items: center;
  padding: 16px;
  color: var(--muted);
  text-align: center;
  line-height: 1.8;
}
.selected-mods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.selected-mod {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  min-width: 0;
  background: var(--panel);
}
.image {
  width: 48px;
  height: 48px;
  flex: none;
  object-fit: contain;
  image-rendering: pixelated;
}
.detail {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  overflow-wrap: anywhere;
}
.name {
  font-weight: 600;
}
.author {
  color: var(--muted);
  font-size: 12px;
}
.remove-mod {
  display: inline-grid;
  place-items: center;
  flex: none;
  padding: 5px;
  min-width: 36px;
}
.remove-mod:hover {
  color: var(--mc-danger);
}
.search-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 2px solid var(--line);
}
.search-actions p {
  color: var(--muted);
  margin: 0;
  max-width: 520px;
  font-size: 13px;
  line-height: 1.7;
}
@media (max-width: 560px) {
  .search-actions .mcbutton {
    width: 100%;
  }
  .search-heading {
    margin-bottom: 16px;
  }
}
</style>
