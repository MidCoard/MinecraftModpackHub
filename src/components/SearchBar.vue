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
    <MCFrame
      ><div class="search-control">
        <input
          ref="input"
          v-model="searchText"
          class="search-input"
          type="text"
          role="combobox"
          :aria-label="t('home.searchbar.placeholder')"
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
      </div></MCFrame
    >
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
      <ul
        v-else
        id="mod-search-options"
        role="listbox"
        class="mod-list"
        :aria-label="t('home.searchbar.placeholder')"
      >
        <li v-if="!result.length" class="no-match">
          {{ t("home.searchbar.no-match") }}
        </li>
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
<style lang="scss" scoped>
.search-control {
  display: flex;
  align-items: center;
}
.clear-search {
  border: 0;
  background: transparent;
  font-size: 24px;
  min-width: 40px;
  min-height: 40px;
}
.mod-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.mod-item.active {
  background: #d7e4d9;
}
.search-error {
  padding: 16px;
  line-height: 1.7;
}
.search-error button {
  border: 1px solid currentColor;
  padding: 5px 12px;
  background: transparent;
}
.search-bar {
  @apply h-46px;
  .search-input {
    @apply bg-transparent border-transparent;
    @apply px-2 md:px-10;
    @apply w-full;
    @apply text-lg;
  }
}

.float-panel {
  @apply mt-1 relative z-10;
  filter: drop-shadow(0 1rem 1rem rgba(0, 0, 0, 0.5));

  &:deep(.mcframe__main) {
    @apply max-h-50vh overflow-auto;
  }

  .loading {
    @apply flex justify-center items-center py-5 text-5xl;
  }

  .no-match {
    @apply text-center;
  }

  .mod-list {
    @apply select-none;
    .mod-item {
      @apply flex justify-between py-1 px-1;

      &:hover {
        @apply bg-primary/10 cursor-pointer;
      }

      .left {
        @apply flex;
        .image {
          @apply mr-2;
          @apply flex-shrink-0;
          img {
            @apply h-50px w-50px object-cover;
          }
        }

        .detail {
          @apply flex flex-col justify-center;
          .name {
            @apply whitespace-nowrap overflow-hidden overflow-ellipsis max-w-70vw;
          }

          .version {
            @apply text-primary/60;
          }
        }
      }

      .right {
        @apply hidden md:block;
      }
    }
  }
}
</style>
