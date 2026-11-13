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
      <RouterLink to="/" class="header-link">{{
        t("header.toolbar.home")
      }}</RouterLink>
    </Teleport>
    <div class="modpack-wrapper">
      <p v-if="loading" role="status">{{ t("search.loading") }}</p>
      <div v-else-if="failed" class="search-failure" role="alert">
        {{ t("search.error") }}
        <button type="button" @click="fetchData">
          {{ t("search.retry") }}
        </button>
      </div>
      <div v-else-if="modpackList.length == 0" class="no-match-modpack">
        {{ t("search.no-match-modpack") }}
      </div>
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
              <img
                :src="modpack.logoUrl || '/art/kenney/table.png'"
                class="image"
                alt=""
              />
              <div class="detail">
                <div class="name">{{ modpack.name }}</div>
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

<style scoped lang="scss">
.search-failure {
  padding: 20px;
  line-height: 1.8;
}
.search-failure button,
.load-more {
  padding: 10px 16px;
  border: 1px solid #81988a;
  background: transparent;
  margin: 12px 0;
}
.modpack-list {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3;
  @apply gap-2;
  @apply mb-5;

  .modpack-item {
    &:deep(.mcframe__main) {
      @apply flex p-1 pr-3 relative flex-col gap-y-2;
    }

    .top {
      @apply flex;
      .image {
        @apply w-80px h-80px flex-shrink-0 mr-2;
        @apply object-cover;
      }

      .detail {
        @apply flex flex-col justify-between;
      }
    }

    .bottom {
      .summary-item {
        @apply flex justify-between;
        .label {
          @apply text-gray-700;
          @apply select-none;
          @apply whitespace-nowrap;
        }
        .value {
          @apply text-gray-500;
          @apply whitespace-nowrap overflow-hidden text-ellipsis;
        }
      }
    }
  }
}
</style>
