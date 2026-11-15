<template>
  <div class="mcframe mc-frame">
    <div class="mcframe__main"><slot /></div>
  </div>
</template>
<style scoped>
.mcframe {
  position: relative;
  padding: 6px;
}
.mcframe__main {
  height: 100%;
  background: var(--panel);
}
</style>
