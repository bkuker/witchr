<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, shallowRef, toRaw, watch } from "vue";
import { GROUP_COUNT, STORES_PER_GROUP, Stores } from "@lib/Stores";
import { toWord, type Address, toAddress } from "@lib/types";
import { Word } from "@lib/word";
import UploadZone, { type LoadStatus } from "./UploadZone.vue";

const stores = defineModel<Stores>({ required: true });

const status = ref<LoadStatus>(null);


function getValue(group: number, store: number) {
  return stores.value.read((group * 10 + store - 1) as Address).toString();
}

function isZero(group: number, store: number) {
  let w = stores.value.read((group * 10 + store - 1) as Address);
  return w.isZero && !w.isNegative;
}

function setValue(group: number, store: number, e: Event) {
  let word = Word.fromString((e.target as HTMLInputElement).value);
  stores.value.write((group * 10 + store - 1) as Address, word);
}

/**
 * TODO: parse `text` (from `source`) into store values and write them into
 * `stores`, the way TapeSetView.loadText does for tapes. Stubbed for now.
 */
function loadText(text: string, source: string): void {
  try {
    for (let line of text.split("\n")) {
      line = line.trim();
      if (/^\d{2}\s/.test(line)) {
        let split = line.split(/\s+/);
        if (split.length >= 2) {
          let addr = toAddress(split[0]);
          try {
            let word = Word.fromString(split[1]);
            stores.value.write(addr, word);
          } catch (e) {
            //Probably OK
            stores.value.write(addr, Word.zero());
            console.warn(`Loaded 0 to address ${addr} for line "${line}""`);
          }
        }
      }
    }
    status.value = { ok: true, text: `Loaded memory image from ${source}.` };
  } catch (e) {
    status.value = { ok: false, text: `Error loading memory image from ${source}.` };
  }
}

</script>

<template>
  <UploadZone v-model:status="status" @load="loadText">
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
              <input maxlength="9" size="9" type="text" min="-99999999" max="99999999"
                :title="`Store` + (group * 10 + store - 1)" :value="getValue(group, store)"
                @change="(e) => setValue(group, store, e)" :class="{ zero: isZero(group, store) }" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UploadZone>
</template>

<style scoped>
th {
  text-align: right;
  padding-right: 1rem;
}

input {
  width: 12ch;
  text-align: right;
}

input.zero {
  color: var(--rule);
}
</style>
