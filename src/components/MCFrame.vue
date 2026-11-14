<template>
  <div class="mcframe">
    <div class="mcframe__main"><slot /></div>
  </div>
</template>
<style scoped>
.mcframe {
  position: relative;
  padding: 6px;
  border: 2px solid var(--stone);
  background: var(--panel);
  box-shadow:
    var(--raised),
    0 3px 0 rgb(0 0 0 / 20%);
}
.mcframe__main {
  height: 100%;
  background: var(--panel);
}
</style>
