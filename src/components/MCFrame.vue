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
  background: #b8bea8;
  box-shadow:
    inset 2px 2px #fff9e8,
    inset -2px -2px #78806a,
    2px 2px #29312820;
}
.mcframe__main {
  height: 100%;
  background: var(--panel);
}
</style>
