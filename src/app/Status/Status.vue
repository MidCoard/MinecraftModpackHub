<script setup>
import { minecraft } from "@/api/minecraft.js";
import { createRequestGate } from "@/utils/request-gate.js";
import MCFrame from "@/components/MCFrame.vue";
import SearchFailure from "@/components/SearchFailure.vue";
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useReCaptcha } from "vue-recaptcha-v3";
import { RouterLink } from "vue-router";
const { executeRecaptcha, recaptchaLoaded } = useReCaptcha(),
  { t, locale } = useI18n(),
  loading = ref(true),
  failure = ref(null),
  result = ref(null),
  gate = createRequestGate();
const format = (value) =>
  Number.isSafeInteger(value)
    ? new Intl.NumberFormat(locale.value).format(value)
    : t("search.approx", {
        value: new Intl.NumberFormat(locale.value, {
          notation: "compact",
          maximumSignificantDigits: 3,
        }).format(value),
      });
async function fetchData() {
  const operation = gate.begin();
  loading.value = true;
  failure.value = null;
  try {
    const counts = await minecraft.overview(async (action) => {
      await recaptchaLoaded();
      return executeRecaptcha(action);
    }, operation.signal);
    if (operation.current()) result.value = counts;
  } catch (error) {
    if (operation.current()) failure.value = error;
  } finally {
    if (operation.current()) loading.value = false;
  }
}
onMounted(fetchData);
onBeforeUnmount(() => gate.cancel());
</script>
<template>
  <div>
    <Teleport to="#header-slot"
      ><RouterLink to="/" class="header-link mc-button">{{
        t("header.toolbar.home")
      }}</RouterLink></Teleport
    >
    <h1>{{ t("title.status") }}</h1>
    <MCFrame v-if="loading" class="status-state"
      ><p role="status">{{ t("status.loading") }}</p></MCFrame
    >
    <MCFrame v-else-if="failure" class="status-state"
      ><SearchFailure :error="failure" @retry="fetchData"
    /></MCFrame>
    <template v-else-if="result"
      ><p class="catalog-total">
        {{
          t("status.total", {
            mods: format(result.mods),
            modpacks: format(result.modpacks),
          })
        }}
      </p>
      <div class="status-wrapper">
        <MCFrame
          v-for="provider in result.sources"
          :key="provider.source"
          class="status-item"
          ><h2>{{ t("sources." + provider.source) }}</h2>
          <p class="title">{{ t("status.mods") }}</p>
          <p class="data">{{ format(provider.mods) }}</p>
          <p class="title">{{ t("status.modpacks") }}</p>
          <p class="data">{{ format(provider.modpacks) }}</p></MCFrame
        >
      </div>
      <p class="source-hint">{{ t("status.countNote") }}</p></template
    >
  </div>
</template>
<style scoped>
h1 {
  margin: 6px 0 22px;
  font: 600 clamp(24px, 3vw, 32px) / 1.3 var(--pixel);
}
.status-state {
  padding: 20px;
  line-height: 1.8;
}
.status-state button {
  margin-left: 12px;
}
.status-wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
  gap: 16px;
}
.status-item :deep(.mcframe__main) {
  padding: 22px;
}
.title {
  color: var(--muted);
  font-size: 15px;
  margin: 0 0 16px;
}
.data {
  font: 600 32px/1.2 var(--mc-font-mono);
  margin: 0;
}
</style>
