<script lang="ts">
export type LoadStatus = { ok: boolean; text: string } | null;
</script>

<script setup lang="ts">
/**
 * UploadZone — wraps arbitrary content in a drop target and adds an upload
 * button + paste box beneath it. Three ways in, one way out: whichever
 * method supplies text, this emits `load` with that text and a source
 * label, and leaves all parsing/interpretation to the caller.
 *
 *   - the Upload button (a file picker),
 *   - dropping a file anywhere on the component (including over whatever
 *     content is slotted in),
 *   - pasting text into the paste box.
 *
 * `status` is a v-model: the caller sets it after trying to make sense of
 * the loaded text (success or failure, with a message), and this component
 * sets it itself for the one failure mode it owns — a file that couldn't
 * be read. UploadZone has no opinion about what the text means.
 */
import { computed, ref } from "vue";

withDefaults(
  defineProps<{
    uploadLabel?: string;
    pastePlaceholder?: string;
    dropLabel?: string;
  }>(),
  {
    uploadLabel: "Upload,",
    pastePlaceholder: "Paste a file here.",
    dropLabel: "Drop file to load",
  },
);

const status = defineModel<LoadStatus>("status", { default: null });

const emit = defineEmits<{
  load: [text: string, source: string];
}>();

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
  emit("load", text, file.name);
}

function onPaste(event: ClipboardEvent): void {
  emit("load", event.clipboardData?.getData("text") ?? "", "pasted text");
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
  <div class="upload-zone" :class="{ dragging: isDragging }" @dragenter="onDragEnter" @dragover="onDragOver"
    @dragleave="onDragLeave" @drop="onDrop">
    <slot />

    <section class="loader">
      <div class="upload-row">
        <button type="button" class="primary" @click="fileInput?.click()">{{ uploadLabel }}</button>
        <span class="hint">drag, or</span>
        <input ref="fileInput" type="file" hidden @change="onFilePicked" />
        <textarea class="paste" rows="1" :placeholder="pastePlaceholder" @paste.prevent="onPaste" />

        <p v-if="status" class="status" :class="{ error: !status.ok }" role="status">{{ status.text }}</p>
      </div>
    </section>

    <div v-if="isDragging" class="drop-overlay">{{ dropLabel }}</div>
  </div>
</template>

<style scoped>
.upload-zone {
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

.upload-zone.dragging {
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
