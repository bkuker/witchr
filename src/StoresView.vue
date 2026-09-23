<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, shallowRef, toRaw, watch } from "vue";
import { GROUP_COUNT, STORES_PER_GROUP, Stores } from "@lib/Stores";
import { toWord } from "@lib/types";


const stores = defineModel<Stores>({ required: true });

function getValue(group: number, store: number) {
  return stores.value.read(group * 10 + store - 1);
}

function setValue(group: number, store: number, e: Event) {
  let word = toWord((e.target as HTMLInputElement).value);
  stores.value.write(group * 10 + store - 1, word);
}
</script>

<template>
  <div class="stores">
    <table>
      <thead>
        <tr>
          <th></th>
          <th v-for="store in STORES_PER_GROUP" :key="store">
            {{ store - 1 }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="group in GROUP_COUNT" :key="group">
          <th>{{ group * 10 }}</th>
          <td v-for="store in STORES_PER_GROUP" :key="store">
            <input maxlength="9" size="9" type="number" min="-99999999" max="99999999"
              :title="`Store` + (group * 10 + store - 1)" :value="getValue(group, store)"
              @change="(e) => setValue(group, store, e)" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.stores {
  background: var(--paper);
  color: var(--ink);
  border-radius: 6px;
  width: fit-content;
  padding: 1rem;
  border: 1px solid var(--rule);
}

th {
  text-align: right;
  padding-right: 1rem;
}

input {
  width: 12ch;
  text-align: right;
}
</style>
