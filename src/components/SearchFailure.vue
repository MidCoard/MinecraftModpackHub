<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useI18n } from "vue-i18n";
const props = defineProps({ error: { type: Object, required: true } });
const emit = defineEmits(["retry"]);
const { t } = useI18n();
const now = ref(Date.now());
let timer;
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onBeforeUnmount(() => clearInterval(timer));
const wait = computed(() =>
  Math.max(0, Math.ceil(((props.error.retryAt || 0) - now.value) / 1000)),
);
const code = computed(() => props.error.code || "network");
</script>
<template>
  <div class="search-failure" role="alert" :data-error-code="code">
    <p>{{ t("errors." + code) }}</p>
    <button type="button" :disabled="wait > 0" @click="emit('retry')">
      {{ wait ? t("search.retryAfter", { seconds: wait }) : t("search.retry") }}
    </button>
  </div>
</template>
<style scoped>
.search-failure {
  line-height: 1.8;
}
.search-failure p {
  margin: 0;
}
.search-failure button {
  margin-top: 12px;
}
</style>
