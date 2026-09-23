<script setup lang="ts">
/**
 * TapeSetView — holds TAPE_COUNT tapes (one TapeView each) and loads them
 * from a multi-tape text file, three ways:
 *
 *   - the Upload button (a file picker),
 *   - dropping a file anywhere on the component,
 *   - pasting the whole file's text into the box and pressing Load.
 *
 * All parsing lives in TapeSet (no Vue there); this component just feeds it
 * text and puts the resulting tapes in place. Loading replaces all of the
 * tapes — but only if the text actually contained tape data, so a bad
 * paste or the wrong file doesn't wipe what's already there.
 *
 * The array of tapes is exposed as `tapes` for the parent (e.g. the
 * emulator) to read.
 */
import { computed, ref, triggerRef } from "vue";
import type { Tape } from "@lib/Tape";
import { TapeSet } from "@lib/TapeSet";
import TapeView from "./TapeView.vue";

const tapeSet = defineModel<TapeSet>({ required: true });

const status = ref<{ ok: boolean; text: string } | null>(null);

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

async function loadFile(file: File): Promise<void> {
  let text: string;
  try {
    text = await file.text();
  } catch (err) {
    status.value = { ok: false, text: `Couldn't read ${file.name}: ${errorMessage(err)}` };
    return;
  }
  loadText(text, file.name);
}

// --- upload button ----------------------------------------------------------

const fileInput = ref<HTMLInputElement | null>(null);

async function onFilePicked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await loadFile(file);
  input.value = ""; // so picking the same file again still fires `change`
}

// --- drag and drop ----------------------------------------------------------

// dragenter/dragleave also fire as the pointer crosses child elements, so
// count them rather than flipping a boolean.
const dragDepth = ref(0);
const isDragging = computed(() => dragDepth.value > 0);

/** Only react to dragged files; dragged text can still drop into the paste box. */
function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

function onDragEnter(event: DragEvent): void {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth.value += 1;
}

function onDragOver(event: DragEvent): void {
  if (!hasFiles(event)) return;
  event.preventDefault(); // required, or the browser refuses the drop
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
}

function onDragLeave(event: DragEvent): void {
  if (!hasFiles(event)) return;
  dragDepth.value = Math.max(0, dragDepth.value - 1);
}

async function onDrop(event: DragEvent): Promise<void> {
  dragDepth.value = 0;
  const files = event.dataTransfer?.files;
  const file = files?.[0];
  if (!files || !file) return; // not a file drop; leave it to the browser
  event.preventDefault(); // otherwise the browser navigates to the file
  await loadFile(file);
  if (files.length > 1) {
    status.value = {
      ok: true,
      text: `Only the first of ${files.length} dropped files was loaded.`,
    };
  }
}
</script>

<template>
  <div class="tape-set-view" :class="{ dragging: isDragging }" @dragenter="onDragEnter" @dragover="onDragOver"
    @dragleave="onDragLeave" @drop="onDrop">
    <div class="tapes">
      <div v-for="(_, i) in tapeSet.tapes" :key="i" class="tape-slot">
        <h3>Tape {{ i + 1 }}</h3>
        <TapeView v-model="tapeSet.tapes[i]" />
      </div>
    </div>

    <section class="loader">
      <div class="upload-row">
        <button type="button" class="primary" @click="fileInput?.click()">Upload,</button>
        <span class="hint">drag, or</span>
        <input ref="fileInput" type="file" hidden @change="onFilePicked" />
        <textarea class="paste" rows="1" placeholder="Paste a file here."
          @paste.prevent="(e: ClipboardEvent) => loadText(e.clipboardData?.getData('text') || '', 'pasted text')" />

        <p v-if="status" class="status" :class="{ error: !status.ok }" role="status">{{ status.text }}</p>
      </div>
    </section>

    <div v-if="isDragging" class="drop-overlay">Drop file to load</div>
  </div>
</template>

<style scoped>
.tape-set-view {
  position: relative;
  display: flex;
  flex-direction: column;
  width: fit-content;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  font-family: "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 6px;
}

.loader {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.85rem;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.hint {
  opacity: 0.7;
}

textarea.paste {
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  font: inherit;
  color: var(--ink);
  background: var(--paper-raised);
  border: 1px solid var(--rule);
  border-radius: 4px;
  resize: none;
  width: 12em;
}

textarea.paste:focus {
  outline: none;
  border-color: var(--amber-strong);
}

.loader button {
  padding: 0.3rem 0.8rem;
}

.status {
  margin: 0;
}

.status.error {
  color: var(--error);
}

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

.tape-set-view.dragging {
  border-color: var(--amber-strong);
}

.drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--amber-strong);
  border-radius: 6px;
  background: rgba(20, 23, 28, 0.85);
  color: var(--amber-strong);
  font-size: 1.1rem;
  pointer-events: none;
  /* so drag events keep reaching the elements underneath */
}
</style>
