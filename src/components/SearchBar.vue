<script setup>
import { useI18n } from "vue-i18n";
import { ref, watch, onBeforeUnmount } from "vue";
import axios from "axios";
import { useReCaptcha } from "vue-recaptcha-v3";
import MCFrame from "./MCFrame.vue";
import LoadingIcon from "./LoadingIcon.vue";
import { ENV_BASE_URL } from "@/utils/env";
import {
  createRequestGate,
  boundedRequest,
  moveActive,
} from "@/utils/request-gate.js";
const { t } = useI18n();
const { executeRecaptcha, recaptchaLoaded } = useReCaptcha();
const emit = defineEmits(["add-mod"]);
const searchText = ref(""),
  showResultPanel = ref(false),
  isLoading = ref(false),
  result = ref([]),
  error = ref(false),
  active = ref(-1),
  input = ref(null);
let composing = false,
  timer;
const gate = createRequestGate();
async function fetchModList(keyword) {
  if (!keyword.trim()) return;
  const operation = gate.begin();
  isLoading.value = true;
  error.value = false;
  active.value = -1;
  showResultPanel.value = true;
  try {
    const token = await boundedRequest(async () => {
      await recaptchaLoaded();
      return executeRecaptcha("mod_overview");
    });
    if (!operation.current()) return;
    const { data } = await axios.post(
      ENV_BASE_URL + "/v1/focessapi/minecraft/mod/search",
      { recaptcha: token, sortBy: 1, sortType: 4, keyword: keyword.trim() },
      { signal: operation.signal, timeout: 15000 },
    );
    if (!operation.current()) return;
    if (!Array.isArray(data)) throw new Error("Invalid mod search response");
    result.value = data.slice(0, 50);
    active.value = -1;
  } catch (problem) {
    if (operation.current()) {
      error.value = true;
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
  error.value = false;
  result.value = [];
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
        ref="input"
        id="mod-search-input"
        v-model="searchText"
        class="search-input"
        type="text"
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
      <div v-else-if="error" class="search-error" role="alert">
        {{ t("home.searchbar.error") }}
        <button type="button" @click="fetchModList(searchText)">
          {{ t("home.searchbar.retry") }}
        </button>
      </div>
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
        :aria-label="t('home.searchbar.placeholder')"
      >
        <li
          v-for="(mod, index) of result"
          :id="'mod-option-' + index"
          :key="mod.id"
          role="option"
          :aria-selected="active === index"
          class="mod-item"
          :class="{ active: active === index }"
          @mousedown.prevent
          @click="choose(mod)"
        >
          <div class="left">
            <div class="image">
              <img
                alt=""
                :src="
                  mod.logoUrl ||
                  `${ENV_BASE_URL}/v1/focessapi/minecraft/mod/logo/${mod.id}`
                "
              />
            </div>
            <div class="detail">
              <div class="name" :title="mod.name">{{ mod.name }}</div>
              <div class="version">
                {{
                  (mod.latestGameVersions || [])
                    .slice(0, 5)
                    .map((item) => item.name)
                    .join(" ")
                }}
              </div>
            </div>
          </div>
          <div v-if="mod.authors?.length" class="right">
            {{ t("home.searchbar.createby", [mod.authors[0].name]) }}
          </div>
        </li>
      </ul>
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
