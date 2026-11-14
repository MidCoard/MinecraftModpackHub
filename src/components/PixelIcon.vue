<script setup>
defineProps({ icon: { type: String, required: true } });
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
    <path v-if="icon.endsWith(':close')" d="m3 3 10 10M13 3 3 13" />
    <path
      v-else-if="icon.endsWith(':external-link')"
      d="M8 2h6v6M14 2 7 9M5 3H2v11h11v-3"
    />
    <path v-else d="M7 13H2V4h12v3M5 4V2h6v2M10 8h4v4h-4zM13 12l2 3" />
  </svg>
</template>
