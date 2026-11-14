<script setup>
defineProps({ disabled: { type: Boolean, default: false } });
</script>
<template>
  <button
    type="button"
    class="mcbutton mc-button mc-button--primary"
    :disabled="disabled"
  >
    <span class="mcbutton__main"><slot /></span>
  </button>
</template>
<style scoped>
.mcbutton {
  padding: 0;
}
.mcbutton__main {
  display: block;
}
</style>
