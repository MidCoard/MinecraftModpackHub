<script setup>
import { computed, ref, watch } from "vue";
import { safeWebUrl } from "@/api/minecraft.js";
const props = defineProps({ url: { type: String, default: null } });
const failed = ref(false);
watch(
  () => props.url,
  () => {
    failed.value = false;
  },
);
const image = computed(() =>
  failed.value ? "/pack.svg" : safeWebUrl(props.url) || "/pack.svg",
);
</script>
<template><img :src="image" alt="" @error="failed = true" /></template>
