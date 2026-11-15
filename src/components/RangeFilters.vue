<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  RANGE_FIELDS,
  rangeKeys,
  filtersFromDraft,
  readRangeDraft,
} from "@/api/ranges.js";
const props = defineProps({
  kind: { type: String, required: true },
  query: { type: Object, required: true },
});
const emit = defineEmits(["apply"]),
  { t } = useI18n();
const draft = ref({}),
  error = ref(null);
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
watch(
  () => props.query,
  (query) => {
    draft.value = Object.fromEntries(
      rangeKeys.map((key) => [
        key,
        typeof query[key] === "string" ? query[key] : "",
      ]),
    );
    error.value = null;
    try {
      readRangeDraft(query, props.kind);
    } catch (issue) {
      error.value = issue;
    }
  },
  { immediate: true, deep: true },
);
function apply() {
  error.value = null;
  try {
    filtersFromDraft(draft.value, props.kind);
    emit("apply", { ...draft.value });
  } catch (issue) {
    error.value = issue;
    document.getElementById(`${props.kind}-${issue.field}`)?.focus();
  }
}
function clear() {
  draft.value = {};
  apply();
}
</script>
<template>
  <form class="range-filters" novalidate @submit.prevent="apply">
    <h2>{{ t("ranges.title") }}</h2>
    <p class="source-hint" :id="`${kind}-range-help`">
      {{ t("ranges.hint", { timezone }) }}
    </p>
    <div class="range-grid">
      <fieldset
        v-for="field in RANGE_FIELDS.filter(
          (value) => kind === 'modpacks' || value !== 'modCount',
        )"
        :key="field"
      >
        <legend>{{ t("sort." + field) }}</legend>
        <label
          v-for="side in ['Min', 'Max']"
          :key="side"
          :for="`${kind}-${field}${side}`"
        >
          {{
            t(
              "ranges." +
                (field.endsWith("At")
                  ? side === "Min"
                    ? "startDate"
                    : "endDate"
                  : side.toLowerCase()),
            )
          }}
          <input
            :id="`${kind}-${field}${side}`"
            v-model="draft[field + side]"
            :type="field.endsWith('At') ? 'date' : 'text'"
            :inputmode="field.endsWith('At') ? undefined : 'numeric'"
            :aria-invalid="error?.field === field + side ? 'true' : undefined"
            :aria-describedby="
              error ? `${kind}-range-error` : `${kind}-range-help`
            "
          />
        </label>
      </fieldset>
    </div>
    <p v-if="error" :id="`${kind}-range-error`" role="alert">
      {{ t("ranges.invalid") }}
    </p>
    <div class="range-actions">
      <button class="mc-button" type="submit">{{ t("ranges.apply") }}</button
      ><button class="mc-button" type="button" @click="clear">
        {{ t("ranges.clear") }}
      </button>
    </div>
  </form>
</template>
