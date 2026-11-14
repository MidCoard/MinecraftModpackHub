<script setup>
import MCFrame from "@/components/MCFrame.vue";
import ResourceLogo from "@/components/ResourceLogo.vue";
import SearchFailure from "@/components/SearchFailure.vue";
import {
  minecraft,
  routeSelection,
  resourceKey,
  safeWebUrl,
  SORT_FIELDS,
  SOURCES,
  PAGE_SIZE,
  MinecraftError,
} from "@/api/minecraft.js";
import { ref, watch, onBeforeUnmount, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useReCaptcha } from "vue-recaptcha-v3";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { createRequestGate } from "@/utils/request-gate.js";
const { executeRecaptcha, recaptchaLoaded } = useReCaptcha(),
  { t, locale } = useI18n(),
  route = useRoute(),
  router = useRouter();
const modpackList = ref([]),
  loading = ref(true),
  failure = ref(null),
  meta = ref(null),
  gate = createRequestGate();
const selection = computed(() => {
  try {
    return routeSelection(route);
  } catch {
    return null;
  }
});
const field = computed(
    () => selection.value?.query.sort.field || "downloadCount",
  ),
  direction = computed(() => selection.value?.query.sort.direction || "desc");
const formatCount = (value) =>
  value == null
    ? t("search.unknown")
    : Number.isSafeInteger(value)
      ? new Intl.NumberFormat(locale.value).format(value)
      : t("search.approx", {
          value: new Intl.NumberFormat(locale.value, {
            notation: "compact",
            maximumSignificantDigits: 3,
          }).format(value),
        });
const datetimeFormat = (value) =>
  value == null
    ? t("search.unknown")
    : new Date(value).toLocaleString(locale.value);
async function fetchData() {
  const operation = gate.begin();
  loading.value = true;
  failure.value = null;
  meta.value = null;
  modpackList.value = [];
  try {
    if (!selection.value) throw new MinecraftError("invalid_request", 400);
    const page = await minecraft.query(
      "modpacks",
      selection.value.query,
      async () => {
        await recaptchaLoaded();
        return executeRecaptcha("minecraft_modpacks");
      },
      operation.signal,
    );
    if (!operation.current()) return;
    modpackList.value = page.data;
    meta.value = page.page;
  } catch (error) {
    if (operation.current()) failure.value = error;
  } finally {
    if (operation.current()) loading.value = false;
  }
}
function filter(key, value) {
  router.replace({
    name: "search",
    params: { ids: route.params.ids || undefined },
    query: { ...route.query, [key]: value, offset: "0" },
  });
}
function pageTo(offset) {
  router.replace({ query: { ...route.query, offset: String(offset) } });
}
watch(() => route.fullPath, fetchData, { immediate: true, flush: "sync" });
onBeforeUnmount(() => gate.cancel());
</script>
<template>
  <div>
    <Teleport to="#header-slot"
      ><RouterLink to="/" class="header-link mc-button">{{
        t("header.toolbar.home")
      }}</RouterLink></Teleport
    >
    <header class="results-heading">
      <h1>{{ t("search.title") }}</h1>
      <p v-if="meta">
        {{
          meta.returned
            ? t("pagination.range", {
                from: meta.offset + 1,
                to: meta.offset + meta.returned,
              })
            : t("pagination.emptyPage")
        }}
      </p>
    </header>
    <MCFrame class="result-filters"
      ><div class="filter-fields">
        <label
          >{{ t("sources.label")
          }}<select
            :value="selection?.source || 'all'"
            :disabled="!!selection?.dependencyRefs.length"
            @change="filter('source', $event.target.value)"
          >
            <option value="all">{{ t("sources.all") }}</option>
            <option
              v-for="provider in SOURCES"
              :key="provider"
              :value="provider"
            >
              {{ t("sources." + provider) }}
            </option>
          </select></label
        >
        <label
          >{{ t("search.sort")
          }}<select
            :value="field"
            @change="filter('sort', $event.target.value)"
          >
            <option v-for="option in SORT_FIELDS" :key="option" :value="option">
              {{ t("sort." + option) }}
            </option>
          </select></label
        >
        <label
          >{{ t("search.direction")
          }}<select
            :value="direction"
            @change="filter('direction', $event.target.value)"
          >
            <option value="desc">{{ t("sort.desc") }}</option>
            <option value="asc">{{ t("sort.asc") }}</option>
          </select></label
        >
      </div>
      <p v-if="selection?.dependencyRefs.length" class="source-hint">
        {{
          t("sources.dependencyHint", {
            count: selection.dependencyRefs.length,
          })
        }}
      </p>
      <p v-if="field === 'modCount'" class="source-hint">
        {{ t("sort.knownCounts") }}
      </p></MCFrame
    >
    <div class="modpack-wrapper">
      <MCFrame v-if="loading" class="result-state"
        ><p role="status">{{ t("search.loading") }}</p></MCFrame
      >
      <MCFrame v-else-if="failure" class="result-state"
        ><SearchFailure :error="failure" @retry="fetchData"
      /></MCFrame>
      <MCFrame v-else-if="!modpackList.length" class="result-state"
        ><p class="no-match-modpack">
          {{ t("search.no-match-modpack") }}
        </p></MCFrame
      >
      <div v-else class="modpack-list">
        <component
          :is="safeWebUrl(modpack.webUrl) ? 'a' : 'article'"
          v-for="modpack in modpackList"
          :key="resourceKey(modpack)"
          :href="safeWebUrl(modpack.webUrl)"
          :target="safeWebUrl(modpack.webUrl) ? '_blank' : undefined"
          :rel="safeWebUrl(modpack.webUrl) ? 'noopener noreferrer' : undefined"
          :data-resource-key="resourceKey(modpack)"
        >
          <MCFrame class="modpack-item"
            ><div class="top">
              <ResourceLogo class="image" :url="modpack.logoUrl" />
              <div class="detail">
                <h2 class="name">{{ modpack.name ?? t("search.unknown") }}</h2>
                <div class="author">{{ t("sources." + modpack.source) }}</div>
              </div>
            </div>
            <div class="bottom">
              <div class="summary-item">
                <span class="label">{{ t("search.mod-count") }}</span
                ><span class="value">{{ formatCount(modpack.modCount) }}</span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t("search.download-count") }}</span
                ><span class="value">{{
                  formatCount(modpack.downloadCount)
                }}</span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t("search.create-time") }}</span
                ><span class="value">{{
                  datetimeFormat(modpack.createdAt)
                }}</span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t("search.update-time") }}</span
                ><span class="value">{{
                  datetimeFormat(modpack.updatedAt)
                }}</span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t("search.dependencies") }}</span
                ><span class="value">{{
                  t("dependency." + modpack.dependencyState)
                }}</span>
              </div>
            </div>
          </MCFrame>
        </component>
      </div>
      <nav
        v-if="meta && !loading && !failure"
        class="query-pagination"
        :aria-label="t('pagination.packs')"
      >
        <button
          type="button"
          :disabled="meta.offset === 0"
          @click="pageTo(Math.max(0, meta.offset - PAGE_SIZE))"
        >
          {{ t("pagination.previous") }}</button
        ><span>{{ t("pagination.noTotal") }}</span
        ><button
          type="button"
          :disabled="
            meta.returned < meta.limit || meta.offset + meta.limit > 1000000
          "
          @click="pageTo(meta.offset + meta.limit)"
        >
          {{ t("pagination.next") }}
        </button>
      </nav>
      <p class="source-hint">{{ t("search.dependencyNote") }}</p>
    </div>
  </div>
</template>
<style scoped>
.results-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin: 6px 0 22px;
}
h1 {
  margin: 0;
  font: 600 clamp(24px, 3vw, 32px) / 1.3 var(--pixel);
}
.results-heading p {
  color: var(--muted);
  margin: 0;
}
.result-state {
  padding: 20px;
}
.result-state p,
.search-failure,
.no-match-modpack {
  margin: 0;
  line-height: 1.8;
}
.search-failure button {
  display: block;
  margin-top: 14px;
}
.load-more {
  display: block;
  margin: 24px auto;
}
.modpack-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.modpack-list > a {
  color: var(--ink);
  text-decoration: none;
  min-width: 0;
}
.modpack-item {
  height: 100%;
}
.modpack-item :deep(.mcframe__main) {
  padding: 14px;
}
.modpack-list > a:hover .modpack-item {
  border-color: var(--moss);
}
.top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--line);
}
.image {
  width: 64px;
  height: 64px;
  flex: none;
  object-fit: contain;
  image-rendering: pixelated;
  background: var(--well);
  box-shadow: var(--recessed);
  padding: 5px;
}
.detail {
  min-width: 0;
}
.name {
  margin: 0 0 6px;
  font: 600 18px/1.4 var(--pixel);
  overflow-wrap: anywhere;
}
.author {
  font-size: 12px;
  color: var(--muted);
}
.bottom {
  padding-top: 12px;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding-block: 5px;
  font-size: 13px;
}
.label {
  color: var(--muted);
  flex: none;
}
.value {
  text-align: right;
  overflow-wrap: anywhere;
  min-width: 0;
}
</style>
