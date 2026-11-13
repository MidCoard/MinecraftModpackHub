<script setup>
import { createRequestGate, boundedRequest } from "@/utils/request-gate.js";
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
    for (const key of Object.keys(result)) {
      if (!Number.isFinite(data[key]))
        throw new Error("Invalid overview response");
    }
    for (const key of Object.keys(result)) result[key] = data[key];
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
      <RouterLink to="/" class="header-link">{{
        t("header.toolbar.home")
      }}</RouterLink>
    </Teleport>
    <p v-if="loading" role="status">{{ t("search.loading") }}</p>
    <p v-else-if="failed" role="alert">
      {{ t("search.error") }}
      <button type="button" @click="fetchData">{{ t("search.retry") }}</button>
    </p>
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

<style scoped lang="scss">
.protips {
  &:deep(.mcframe__main) {
    @apply py-1 px-2 md:px-10;
  }

  .title {
    @apply font-bold text-xl;
  }
}

.status-wrapper {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4;
  @apply gap-2;

  .status-item {
    &:deep(.mcframe__main) {
      @apply py-3 md:py-5 px-2;
      @apply flex flex-col gap-y-3 md:gap-y-5 justify-between;
    }

    .title {
      @apply text-xl md:text-2xl text-center;
    }

    .data {
      @apply text-lg md:text-xl text-center;
    }
  }
}
</style>
