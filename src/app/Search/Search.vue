<script setup>
import MCFrame from "@/components/MCFrame.vue";
import { ENV_BASE_URL } from "@/utils/env";
import { onMounted, onBeforeUnmount, ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useReCaptcha } from "vue-recaptcha-v3";
import { RouterLink, useRoute } from "vue-router";
import axios from "axios";
import { createRequestGate, boundedRequest } from "@/utils/request-gate.js";
import { modIds } from "@/utils/mod-ids.js";
const { executeRecaptcha, recaptchaLoaded } = useReCaptcha();
const { t, locale } = useI18n();
const route = useRoute();
const modpackList = ref([]),
  loading = ref(true),
  failed = ref(false),
  visibleCount = ref(24);
const visiblePacks = computed(() =>
  modpackList.value.slice(0, visibleCount.value),
);
const gate = createRequestGate();
const strof = (text, max) =>
  String(text).length > max ? String(text).slice(0, max) + "…" : text;
const datetimeFormat = (value) => new Date(value).toLocaleString(locale.value);
async function fetchData() {
  const operation = gate.begin();
  loading.value = true;
  failed.value = false;
  try {
    const ids = modIds(route.params.ids);
    const token = await boundedRequest(async () => {
      await recaptchaLoaded();
      return executeRecaptcha("search_modpacks");
    });
    if (!operation.current()) return;
    const { data } = await axios.post(
      ENV_BASE_URL + "/v1/focessapi/minecraft/modpack/depend",
      { recaptcha: token, ids, sortBy: 1, sortType: 4 },
      { signal: operation.signal, timeout: 15000 },
    );
    if (!operation.current()) return;
    if (!Array.isArray(data)) throw new Error("Invalid modpack response");
    modpackList.value = data;
    visibleCount.value = 24;
  } catch (error) {
    if (operation.current()) failed.value = true;
  } finally {
    if (operation.current()) loading.value = false;
  }
}
onMounted(fetchData);
watch(() => route.params.ids, fetchData);
onBeforeUnmount(() => gate.cancel());
</script>

<template>
  <div>
    <Teleport to="#header-slot">
      <RouterLink to="/" class="header-link mc-button">{{
        t("header.toolbar.home")
      }}</RouterLink>
    </Teleport>
    <header class="results-heading">
      <h1>{{ t("search.title") }}</h1>
      <p v-if="!loading && !failed">
        {{ t("search.count", { count: modpackList.length }) }}
      </p>
    </header>
    <div class="modpack-wrapper">
      <MCFrame v-if="loading" class="result-state"
        ><p role="status">{{ t("search.loading") }}</p></MCFrame
      >
      <MCFrame v-else-if="failed" class="result-state"
        ><div class="search-failure" role="alert">
          {{ t("search.error") }}
          <button type="button" @click="fetchData">
            {{ t("search.retry") }}
          </button>
        </div> </MCFrame
      ><MCFrame v-else-if="modpackList.length == 0" class="result-state"
        ><div class="no-match-modpack">
          {{ t("search.no-match-modpack") }}
        </div>
      </MCFrame>
      <div v-else class="modpack-list">
        <a
          v-for="modpack of visiblePacks"
          :key="modpack.id"
          :href="modpack.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MCFrame class="modpack-item">
            <div class="top">
              <img :src="modpack.logoUrl || '/pack.svg'" class="image" alt="" />
              <div class="detail">
                <h2 class="name">{{ modpack.name }}</h2>
                <div v-if="modpack.authors?.length > 0" class="author">
                  {{
                    t("home.searchbar.createby", [
                      strof(modpack.authors[0].name, 7),
                    ])
                  }}
                </div>
              </div>
            </div>
            <div class="bottom">
              <div class="summary-item">
                <span class="label">{{ t("search.latest-game-version") }}</span>
                <span class="value">
                  <template v-if="modpack.latestGameVersions?.length > 0">
                    {{
                      modpack.latestGameVersions.map((i) => i.name).join(" ")
                    }}
                  </template>
                  <template v-else>{{ t("search.unknown") }}</template>
                </span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t("search.mod-count") }}</span>
                <span class="value">
                  {{ modpack.dependenciesSize }}
                </span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t("search.download-count") }}</span>
                <span class="value">
                  {{ modpack.downloadCount }}
                </span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t("search.create-time") }}</span>
                <span class="value">
                  {{ datetimeFormat(modpack.createTime) }}
                </span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t("search.update-time") }}</span>
                <span class="value">
                  {{ datetimeFormat(modpack.modifyTime) }}
                </span>
              </div>
            </div>
          </MCFrame>
        </a>
      </div>
      <button
        v-if="!loading && !failed && visibleCount < modpackList.length"
        type="button"
        class="load-more"
        @click="visibleCount += 24"
      >
        {{ t("search.more") }}
      </button>
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
