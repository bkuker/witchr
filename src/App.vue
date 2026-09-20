<script setup lang="ts">
import { computed, ref } from 'vue'
import { allMoods, greet, Mood } from '@lib/greeting'

const name = ref('world')
const mood = ref<Mood>(Mood.Cheerful)

const message = computed(() => greet({ name: name.value, mood: mood.value }))
</script>

<template>
  <main>
    <h1>{{ message }}</h1>

    <label>
      Name
      <input v-model="name" />
    </label>

    <label>
      Mood
      <select v-model="mood">
        <option v-for="m in allMoods" :key="m" :value="m">{{ m }}</option>
      </select>
    </label>

    <p class="hint">
      The same <code>greet()</code> runs on the command line:
      <code>npm run hello -- Ada pirate</code>
    </p>
  </main>
</template>

<style scoped>
main {
  max-width: 32rem;
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
