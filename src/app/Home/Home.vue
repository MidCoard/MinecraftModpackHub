<script setup>
import { readModSelection } from "@/utils/request-gate.js";
import MCButton from "@/components/MCButton.vue";
import MCFrame from "@/components/MCFrame.vue";
import { useMessage } from "@/components/Message";
import SearchBar from "@/components/SearchBar.vue";
import { ENV_BASE_URL } from "@/utils/env";
import Icon from "@/components/PixelIcon.vue";
import { reactive } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRouter } from "vue-router";

const { success } = useMessage();

const router = useRouter();

const { t } = useI18n();

let savedMods = [];
try {
  savedMods = readModSelection(localStorage);
} catch {}
const modList = reactive(savedMods);

const onModAdded = (mod) => {
  // 检查是否有 id 重复的 mod
  const _mod = modList.find((item) => item.id === mod.id);
  if (!_mod) {
    // 如果没有，就把 mod 添加到列表
    modList.push(mod);
    try {
      localStorage.setItem("modList", JSON.stringify(modList));
    } catch {}
    success(t("home.modlist.added"));
  }
};

const onModRemoveBtnClick = (modid) => {
  const _modIndex = modList.findIndex((item) => item.id === modid);
  if (_modIndex !== -1) {
    modList.splice(_modIndex, 1);
    try {
      localStorage.setItem("modList", JSON.stringify(modList));
    } catch {}
    success(t("home.modlist.removed"));
  }
};

const onSearchBtnClick = () => {
  // get mod list
  const modIdList = modList.map((item) => item.id);
  const modIdString = modIdList.join(",");
  router.push({
    name: "search",
    params: {
      ids: modIdString,
    },
  });
};
</script>

<template>
  <Teleport to="#header-slot">
    <RouterLink to="/status" class="header-link mc-button">{{
      t("header.toolbar.status")
    }}</RouterLink>
  </Teleport>
  <header class="search-heading">
    <h1>{{ t("home.protips.title") }}</h1>
    <p>{{ t("home.protips.desc") }}</p>
  </header>
  <MCFrame class="search-inventory">
    <section class="search-panel">
      <label class="search-field-label" for="mod-search-input">{{
        t("home.searchbar.label")
      }}</label>
      <SearchBar @add-mod="onModAdded" />
      <div class="selection-heading">
        <h2>{{ t("home.modlist.title") }}</h2>
        <span>{{ t("home.modlist.count", { count: modList.length }) }}</span>
      </div>
      <div class="selection-well">
        <p v-if="!modList.length" class="selection-empty">
          {{ t("home.modlist.empty") }}
        </p>
        <ul v-else class="selected-mods">
          <li v-for="mod of modList" :key="mod.id" class="selected-mod mc-slot">
            <img
              alt=""
              class="image"
              :src="
                mod.logoUrl ||
                `${ENV_BASE_URL}/v1/focessapi/minecraft/mod/logo/${mod.id}`
              "
            />
            <div class="detail">
              <span class="name">{{ mod.name }}</span>
              <span v-if="mod.authors?.length" class="author">{{
                t("home.searchbar.createby", [mod.authors[0].name])
              }}</span>
            </div>
            <button
              type="button"
              class="remove-mod"
              @click="onModRemoveBtnClick(mod.id)"
              :aria-label="t('home.modlist.remove', [mod.name])"
            >
              <Icon icon="pixelarticons:close" />
            </button>
          </li>
        </ul>
      </div>
      <div class="search-actions">
        <p>{{ t("home.modlist.hint") }}</p>
        <MCButton :disabled="modList.length === 0" @click="onSearchBtnClick">{{
          t("home.searchbtn")
        }}</MCButton>
      </div>
    </section>
  </MCFrame>
</template>
<style scoped>
.search-heading {
  margin: 6px 0 22px;
}
.search-heading h1 {
  margin: 0 0 8px;
  font: 600 clamp(24px, 3vw, 32px) / 1.3 var(--pixel);
}
.search-heading p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}
.search-panel {
  padding: clamp(14px, 3vw, 28px);
}
h2 {
  margin: 0 0 12px;
  font: 600 16px/1.5 var(--pixel);
}
.search-field-label {
  display: block;
  margin-bottom: 12px;
  font: 600 16px/1.5 var(--pixel);
}
.selection-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-top: 26px;
}
.selection-heading span {
  font-size: 13px;
  color: var(--muted);
}
.selection-well {
  min-height: 160px;
  padding: 12px;
  background: var(--well);
  box-shadow: var(--recessed);
  border: 2px solid var(--shadow);
}
.selection-empty {
  margin: 0;
  min-height: 132px;
  display: grid;
  place-items: center;
  padding: 16px;
  color: var(--muted);
  text-align: center;
  line-height: 1.8;
}
.selected-mods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.selected-mod {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  min-width: 0;
  background: var(--panel);
}
.image {
  width: 48px;
  height: 48px;
  flex: none;
  object-fit: contain;
  image-rendering: pixelated;
}
.detail {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  overflow-wrap: anywhere;
}
.name {
  font-weight: 600;
}
.author {
  color: var(--muted);
  font-size: 12px;
}
.remove-mod {
  display: inline-grid;
  place-items: center;
  flex: none;
  padding: 5px;
  min-width: 36px;
}
.remove-mod:hover {
  color: var(--mc-danger);
}
.search-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 2px solid var(--line);
}
.search-actions p {
  color: var(--muted);
  margin: 0;
  max-width: 520px;
  font-size: 13px;
  line-height: 1.7;
}
@media (max-width: 560px) {
  .search-actions .mcbutton {
    width: 100%;
  }
  .search-heading {
    margin-bottom: 16px;
  }
}
</style>
