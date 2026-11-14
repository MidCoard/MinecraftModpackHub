<script setup>
import { createRequestGate, boundedRequest } from "@/utils/request-gate.js";
import { readOverview } from "@/utils/overview.js";
import MCFrame from "@/components/MCFrame.vue";
import { ENV_BASE_URL } from "@/utils/env";
import { onMounted, onBeforeUnmount, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useReCaptcha } from "vue-recaptcha-v3";
import { RouterLink } from "vue-router";
import axios from "axios";

const { executeRecaptcha, recaptchaLoaded } = useReCaptcha();

const { t } = useI18n();

const loading = ref(true),
  failed = ref(false),
  gate = createRequestGate();
onMounted(() => fetchData());
onBeforeUnmount(() => gate.cancel());

const result = reactive({
  availableMods: null,
  availableModpacks: null,
  notAvailableModpacks: null,
  notEmptyModpacks: null,
});

const fetchData = async () => {
  const operation = gate.begin();
  loading.value = true;
  failed.value = false;
  try {
    const token = await boundedRequest(async () => {
      await recaptchaLoaded();
      return executeRecaptcha("mod_overview");
    });
    if (!operation.current()) return;
    const { data } = await axios.post(
      ENV_BASE_URL + "/v1/focessapi/minecraft/overview",
      { recaptcha: token },
      { signal: operation.signal, timeout: 15000 },
    );
    if (!operation.current()) return;
    Object.assign(result, readOverview(data));
  } catch (error) {
    if (operation.current()) failed.value = true;
  } finally {
    if (operation.current()) loading.value = false;
  }
};
</script>

<template>
  <div>
    <Teleport to="#header-slot">
      <RouterLink to="/" class="header-link mc-button">{{
        t("header.toolbar.home")
      }}</RouterLink>
    </Teleport>
    <h1>{{ t("title.status") }}</h1>
    <MCFrame v-if="loading" class="status-state"
      ><p role="status">{{ t("status.loading") }}</p></MCFrame
    >
    <MCFrame v-else-if="failed" class="status-state"
      ><div role="alert">
        {{ t("status.error") }}
        <button type="button" @click="fetchData">
          {{ t("search.retry") }}
        </button>
      </div></MCFrame
    >
    <div v-else class="status-wrapper">
      <MCFrame class="status-item">
        <p class="title">{{ t("status.title.availableMods") }}</p>
        <p class="data">{{ result.availableMods }}</p>
      </MCFrame>
      <MCFrame class="status-item">
        <p class="title">{{ t("status.title.availableModpacks") }}</p>
        <p class="data">{{ result.availableModpacks }}</p>
      </MCFrame>
      <MCFrame class="status-item">
        <p class="title">{{ t("status.title.notAvailableModpacks") }}</p>
        <p class="data">{{ result.notAvailableModpacks }}</p>
      </MCFrame>
      <MCFrame class="status-item">
        <p class="title">{{ t("status.title.notEmptyModpacks") }}</p>
        <p class="data">{{ result.notEmptyModpacks }}</p>
      </MCFrame>
    </div>
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
