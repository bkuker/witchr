<script setup lang="ts">
import { computed, ref } from "vue";
import { Tape } from "@lib/Tape";
import TapeView from "./TapeView.vue";
import TapeSetView from "./TapeSetView.vue";
import StoresView from "./StoresView.vue";
import PrinterOutput from "./PrinterOutput.vue";

let printout = ref(`
  +2.0000000
  +2.5000000
  +2.6666667
  +2.7083334
  +2.7166667
  +2.7180556
  +2.7182540
  +2.7182788
  +2.7182816`);
</script>

<template>
  <main>
    <h1>W.I.T.C.H.🧙‍♀️</h1>
    <h2>Wolverhampton Instrument for Teaching Computing from Harwell</h2>
    <PrinterOutput v-model="printout" />
    <TapeSetView />
    <StoresView />
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
  background-color: #111;
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
  margin: 4rem auto;
  padding: 0 1rem;
  line-height: 1.5;
}

label {
  display: block;
  margin-bottom: 1rem;
}

input,
select {
  display: block;
  margin-top: 0.25rem;
  padding: 0.4rem 0.6rem;
  font: inherit;
}

.hint {
  color: #555;
  font-size: 0.9rem;
}
</style>
