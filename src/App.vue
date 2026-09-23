<script setup lang="ts">
import { computed, ref, shallowRef, type Ref } from "vue";
import { Witch } from "@lib/WITCH";
import WitchView from "./WitchView.vue";

const witch = ref(new Witch()) as Ref<Witch>;

</script>

<template>
  <main>
    <WitchView v-model="witch" />
  </main>
</template>

<style>
html {
  --ink: #e9e4d8;
  --paper: #14171c;
  --paper-raised: #1b1f26;
  --rule: #2c313a;
  --amber-strong: #e0a83e;
  --error: #e26d5c;
}

html {
  font-family: "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  color: var(--ink);
  background-color: #000;
}

html {
  box-sizing: border-box;
}

*,
*:before,
*:after {
  box-sizing: inherit;
}
</style>

<style scoped>
main {
  margin: 1rem auto;
  padding: 1rem;
  line-height: 1.5;
  width: 1500px;
  background-color: #111;
  border-radius: 10px;
}
</style>
