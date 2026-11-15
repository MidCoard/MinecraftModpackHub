<script setup>
import { useI18n } from "vue-i18n";

const { locale } = useI18n();
</script>

<template>
  <button
    type="button"
    class="mc-button locale-toggle"
    :lang="locale === 'en' ? 'zh-CN' : 'en'"
    :aria-label="locale === 'en' ? '切换到简体中文' : 'Switch to English'"
    :title="locale === 'en' ? '切换到简体中文' : 'Switch to English'"
    @click="locale = locale === 'en' ? 'zh-cn' : 'en'"
  >
    {{ locale === "en" ? "中文" : "EN" }}
  </button>
</template>

<style scoped>
.locale-toggle {
  min-width: 64px;
  min-height: 40px;
}
</style>
