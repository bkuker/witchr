<script setup lang="ts">
/**
 * TapeSetView — holds TAPE_COUNT tapes (one TapeView each) and loads them
 * from a multi-tape text file via UploadZone (upload button, drag/drop, or
 * paste — see that component for the three ways in).
 *
 * All parsing lives in TapeSet (no Vue there); this component just feeds it
 * text and puts the resulting tapes in place. Loading replaces all of the
 * tapes — but only if the text actually contained tape data, so a bad
 * paste or the wrong file doesn't wipe what's already there.
 *
 * The array of tapes is exposed as `tapes` for the parent (e.g. the
 * emulator) to read.
 */
import { ref } from "vue";
import type { Tape } from "@lib/Tape";
import { TapeSet } from "@lib/TapeSet";
import TapeView from "./TapeView.vue";
import UploadZone, { type LoadStatus } from "./UploadZone.vue";

const tapeSet = defineModel<TapeSet>({ required: true });

const status = ref<LoadStatus>(null);

/** Parse `text` and, if it has any tape data, replace the tapes with the result. */
function loadText(text: string, source: string): void {
  let set: TapeSet;
  try {
    set = TapeSet.fromText(text);
  } catch (err) {
    status.value = { ok: false, text: `Couldn't load ${source}: ${errorMessage(err)}. Tapes left unchanged.` };
    return;
  }

  const withData = set.tapes.flatMap((tape, i) => (tape.lines.length > 0 ? [i + 1] : []));
  if (withData.length === 0) {
    status.value = { ok: false, text: `No tape data found in ${source}; tapes left unchanged.` };
    return;
  }

  tapeSet.value = set;

  status.value = {
    ok: true,
    text: `Loaded ${source}: ${withData.length === 1 ? "tape" : "tapes"} ${withData.join(", ")}.`,
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
</script>

<template>
  <UploadZone v-model:status="status" @load="loadText">
    <div class="tapes">
      <div v-for="(_, i) in tapeSet.tapes" :key="i" class="tape-slot">
        <h3>Tape {{ i + 1 }}</h3>
        <TapeView v-model="tapeSet.tapes[i]" />
      </div>
    </div>
  </UploadZone>
</template>

<style scoped>
.tapes {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  align-items: flex-start;
}

.tape-slot {
  display: inline-block;
}

.tape-slot h3 {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  font-weight: normal;
  opacity: 0.7;
}
</style>
