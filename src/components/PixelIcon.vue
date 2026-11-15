<script setup>
import { computed } from "vue";
import { pixelIcons } from "@/vendor/minecraft-ui/icons.mjs";
const props = defineProps({ icon: { type: String, required: true } });
const shape = computed(() =>
  props.icon.endsWith(":close")
    ? pixelIcons.close
    : props.icon.endsWith(":external-link")
      ? pixelIcons.external
      : pixelIcons.search,
);
</script>
<template>
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linejoin="miter"
  >
    <path :d="shape" />
  </svg>
</template>
