<script setup>
import { useI18n } from "vue-i18n";
import { ref, watch, onBeforeUnmount } from "vue";
import { useReCaptcha } from "vue-recaptcha-v3";
import MCFrame from "./MCFrame.vue";
import LoadingIcon from "./LoadingIcon.vue";
import ResourceLogo from "./ResourceLogo.vue";
import SearchFailure from "./SearchFailure.vue";
import {
  minecraft,
  buildQuery,
  resourceKey,
  PAGE_SIZE,
  MinecraftError,
} from "@/api/minecraft.js";
import { createRequestGate, moveActive } from "@/utils/request-gate.js";
const props = defineProps({
  source: { type: String, required: true },
  filters: { type: Object, default: null },
});
const { t } = useI18n(),
  { executeRecaptcha, recaptchaLoaded } = useReCaptcha(),
  emit = defineEmits(["add-mod"]);
const searchText = ref(""),
  showResultPanel = ref(false),
  isLoading = ref(false),
  result = ref([]),
  error = ref(null),
  active = ref(-1),
  input = ref(null),
  meta = ref(null),
  requestedOffset = ref(0);
let composing = false,
  timer;
const gate = createRequestGate();
async function fetchModList(keyword, offset = 0) {
  if (!keyword.trim()) return;
  const operation = gate.begin();
  requestedOffset.value = offset;
  isLoading.value = true;
  error.value = null;
  active.value = -1;
  showResultPanel.value = true;
  try {
    if (props.filters === null)
      throw new MinecraftError("invalid_request", 400);
    const query = buildQuery("mods", {
      source: props.source,
      keyword,
      offset,
      filters: props.filters,
    });
    const page = await minecraft.query(
      "mods",
      query,
      async (action) => {
        await recaptchaLoaded();
        return executeRecaptcha(action);
      },
      operation.signal,
    );
    if (!operation.current()) return;
    result.value = page.data;
    meta.value = page.page;
  } catch (problem) {
    if (operation.current()) {
      error.value = problem;
      result.value = [];
    }
  } finally {
    if (operation.current()) isLoading.value = false;
  }
}
function queueSearch(value) {
  clearTimeout(timer);
  gate.cancel();
  isLoading.value = false;
  error.value = null;
  result.value = [];
  meta.value = null;
  active.value = -1;
  if (composing || !value.trim()) {
    showResultPanel.value = false;
    return;
  }
  showResultPanel.value = true;
  isLoading.value = true;
  timer = setTimeout(() => fetchModList(value), 300);
}
watch(searchText, queueSearch);
watch(
  () => props.source,
  () => queueSearch(searchText.value),
  { flush: "sync" },
);
watch(
  () => props.filters,
  () => queueSearch(searchText.value),
  { deep: true, flush: "sync" },
);
function clear() {
  searchText.value = "";
  queueSearch("");
  input.value?.focus();
}
function choose(mod) {
  emit("add-mod", mod);
  clear();
  showResultPanel.value = false;
}
function retry() {
  input.value?.focus();
  return fetchModList(searchText.value, requestedOffset.value);
}
function pageTo(offset) {
  input.value?.focus();
  return fetchModList(searchText.value, offset);
}
function keydown(event) {
  if (event.isComposing || composing) return;
  if (event.key === "Escape") {
    showResultPanel.value = false;
    active.value = -1;
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    showResultPanel.value = true;
    if (result.value.length)
      active.value = moveActive(
        active.value,
        event.key === "ArrowDown" ? 1 : -1,
        result.value.length,
      );
  }
  if (event.key === "Enter") {
    event.preventDefault();
    clearTimeout(timer);
    if (
      showResultPanel.value &&
      active.value >= 0 &&
      result.value[active.value]
    )
      choose(result.value[active.value]);
    else fetchModList(searchText.value);
  }
}
onBeforeUnmount(() => {
  clearTimeout(timer);
  gate.cancel();
});
</script>
<template>
  <div
    class="search-bar"
    @focusout="
      (event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          showResultPanel = false;
      }
    "
  >
    <div class="search-control">
      <input
        id="mod-search-input"
        ref="input"
        v-model="searchText"
        class="search-input"
        type="text"
        maxlength="256"
        role="combobox"
        :aria-label="t('home.searchbar.label')"
        :placeholder="t('home.searchbar.placeholder')"
        aria-autocomplete="list"
        aria-controls="mod-search-options"
        :aria-expanded="showResultPanel"
        :aria-activedescendant="
          showResultPanel && active >= 0 ? 'mod-option-' + active : undefined
        "
        @keydown="keydown"
        @focus="showResultPanel = !!searchText.trim()"
        @compositionstart="
          composing = true;
          clearTimeout(timer);
          gate.cancel();
        "
        @compositionend="
          composing = false;
          queueSearch(searchText);
        "
      />
      <button
        v-if="searchText"
        type="button"
        class="clear-search"
        :aria-label="t('home.searchbar.clear')"
        @click="clear"
      >
        ×
      </button>
    </div>
    <MCFrame v-if="showResultPanel" id="mod-search-panel" class="float-panel">
      <div
        v-if="isLoading"
        class="loading"
        role="status"
        :aria-label="t('home.searchbar.loading')"
      >
        <LoadingIcon />
      </div>
      <SearchFailure
        v-else-if="error"
        class="search-error"
        :error="error"
        @retry="retry"
      />
      <p
        v-if="!isLoading && !error && !result.length"
        class="no-match"
        role="status"
      >
        {{ t("home.searchbar.no-match") }}
      </p>
      <ul
        v-show="!isLoading && !error && result.length"
        id="mod-search-options"
        role="listbox"
        class="mod-list"
        :aria-label="t('home.searchbar.label')"
      >
        <li
          v-for="(mod, index) in result"
          :id="'mod-option-' + index"
          :key="resourceKey(mod)"
          role="option"
          :aria-selected="active === index"
          class="mod-item"
          :class="{ active: active === index }"
          @mousedown.prevent
          @click="choose(mod)"
        >
          <div class="left">
            <div class="image"><ResourceLogo :url="mod.logoUrl" /></div>
            <div class="detail">
              <div class="name">{{ mod.name ?? t("search.unknown") }}</div>
              <div class="version">
                {{ t("sources." + mod.source) }} · {{ mod.sourceId }}
              </div>
            </div>
          </div>
        </li>
      </ul>
      <nav
        v-if="meta && !isLoading && !error"
        class="query-pagination"
        :aria-label="t('pagination.mods')"
      >
        <button
          type="button"
          :disabled="meta.offset === 0"
          @click="pageTo(Math.max(0, meta.offset - PAGE_SIZE))"
        >
          {{ t("pagination.previous") }}
        </button>
        <button
          type="button"
          :disabled="
            meta.returned < meta.limit || meta.offset + meta.limit > 1000000
          "
          @click="pageTo(meta.offset + meta.limit)"
        >
          {{ t("pagination.next") }}
        </button>
      </nav>
    </MCFrame>
  </div>
</template>
<style scoped>
.search-bar {
  position: relative;
}
.search-control {
  position: relative;
}
.search-input {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 10px 52px 10px 14px;
}
.clear-search {
  position: absolute;
  right: 6px;
  top: 6px;
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  font-size: 22px;
}
.float-panel {
  position: absolute;
  top: calc(100% + 6px);
  width: 100%;
  z-index: 25;
  box-shadow: var(--mc-popup-shadow);
}
.float-panel :deep(.mcframe__main) {
  max-height: min(50vh, 420px);
  overflow: auto;
}
.mod-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.mod-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  padding: 8px 12px;
  border: 2px solid transparent;
  cursor: pointer;
}
.mod-item + .mod-item {
  border-top-color: var(--line);
}
.mod-item:hover,
.mod-item.active {
  background: var(--control);
  border-color: var(--moss);
  box-shadow: var(--recessed);
}
.left {
  display: flex;
  gap: 12px;
  min-width: 0;
}
.image {
  width: 48px;
  height: 48px;
  flex: none;
  padding: 3px;
  background: var(--well);
  box-shadow: var(--recessed);
}
.image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}
.detail {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.name {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.version,
.right {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}
.right {
  flex: none;
  max-width: 30%;
  overflow-wrap: anywhere;
}
.loading {
  display: flex;
  justify-content: center;
  padding: 22px;
  font-size: 32px;
}
.no-match,
.search-error {
  padding: 18px;
  margin: 0;
  line-height: 1.7;
}
.search-error button {
  display: block;
  margin-top: 12px;
}
@media (max-width: 560px) {
  .right {
    display: none;
  }
}
</style>
