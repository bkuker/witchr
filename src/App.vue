<script setup lang="ts">
import { computed, ref } from 'vue'
import { Tape } from "@lib/Tape";
import TapeView from './TapeView.vue';
import TapeSetView from './TapeSetView.vue';

</script>

<template>
  <main>
    <TapeSetView />
  </main>
</template>

<style scoped>
html {
  box-sizing: border-box;
}

*,
*:before,
*:after {
  box-sizing: inherit;
}

main {
  margin: 4rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
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
