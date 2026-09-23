<script setup lang="ts">
/**
 * TapeView — shows a Tape as read-only already-read lines above one
 * editable textarea that holds the current line and everything after it.
 *
 * - Past lines are ordinary <div>s. They can't be edited.
 *
 * - The textarea starts at the current line, so the current line is
 *   editable too. A <textarea> can't style one of its own lines, so the
 *   highlight is a transparent-text mirror <div> sitting BEHIND the
 *   (transparent) textarea. Its rows have the same font, padding, width and
 *   wrapping as the textarea's lines, so the amber background lands exactly
 *   on the current line, however many visual rows it wraps to and however
 *   many blank lines precede it. It's the same trick as the mirror div in
 *   "highlight within textarea" widgets, except only the lines up to the
 *   current one ever need mirroring.
 *
 * - Rebuilding on edit is "keep the frozen prefix, replace everything from
 *   the edit start onward with the textarea's new content", where the edit
 *   start is the current position, or the end of the tape when there is no
 *   current line (empty tape, or a Straight tape that has run off the end).
 *   If the edit leaves any non-blank line, the first of them becomes the
 *   current line; if it leaves none, there is no current line (position
 *   undefined). Tape discards blank lines, but they stay in the textarea as
 *   typed until the next resync (advance/reset), so the highlight goes on
 *   the first non-blank row of the textarea, not always row 0.
 *   That one rule covers typing the first entry into an empty tape, editing
 *   the current line in place, and deleting the current line and everything
 *   after it.
 *
 *   Because the current line lives inside the textarea, it's fine for it to
 *   become "current" mid-keystroke — nothing gets duplicated into a frozen
 *   div, and a line you're typing can't be split in two.
 */
import { computed, nextTick, onMounted, reactive, ref, shallowRef, toRaw, watch } from "vue";
import { Tape, TapeMode } from "@lib/Tape";

const tape = defineModel<Tape>({ required: true });

watch(
  () => [tape.value, tape.value.position],
  () => {
    syncEditText();
    nextTick(scrollToCurrentLine);
  },
);

/** Where the editable text starts: the current line, or the end of the tape if there isn't one. */
function editStartOf(t: Tape): number {
  return t.position ?? t.lines.length;
}

const pastLines = computed(() => tape.value.lines.slice(0, editStartOf(tape.value)));

/** The current line and everything after it — the editable part. */
function editTextOf(t: Tape): string {
  return t.lines.slice(editStartOf(t)).join("\n");
}

// The textarea's own text is kept separate from the Tape's lines so Tape's
// line-trimming (see Tape.ts) doesn't erase trailing/leading spaces
// mid-keystroke. It's resynced only when the editable window changes for
// reasons OTHER than the user's own typing: advancing, resetting, or the
// whole tape being swapped out from outside.
const rawText = ref(editTextOf(tape.value));

/**
 * The textarea's lines up to and including its first non-blank one — that
 * last row is the current line, and the blank rows before it are mirrored
 * only so the highlight sits at the right height. Empty if there's no
 * non-blank line (no current line, so nothing to highlight).
 */
const ghostLines = computed(() => {
  const lines = rawText.value.split(/\r?\n/);
  const firstReal = lines.findIndex((line) => line.trim() !== "");
  return firstReal < 0 ? [] : lines.slice(0, firstReal + 1);
});

function syncEditText(): void {
  rawText.value = editTextOf(tape.value);
  nextTick(autoGrowTextarea);
}

function onInput(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value;
  rawText.value = value;
  autoGrowTextarea();

  const start = editStartOf(tape.value);

  // Tape discards blank lines, so the tail may contribute fewer lines than
  // the textarea has rows — or none at all (empty, or only blanks).
  const rebuilt = new Tape([...tape.value.lines.slice(0, start), ...value.split(/\r?\n/)], tape.value.mode);
  rebuilt.position = rebuilt.lines.length > start ? start : undefined;

  //tape.value = reactive(rebuilt);
  tape.value = rebuilt;
}

function setMode(mode: TapeMode): void {
  tape.value.mode = mode; // doesn't touch position — matches Tape's own semantics
}

function reset(): void {
  tape.value.reset();
  syncEditText();
  nextTick(scrollToCurrentLine);
}

function advance(): boolean {
  const moved = tape.value.advance();
  syncEditText();
  nextTick(scrollToCurrentLine);
  return moved;
}

defineExpose({ advance, reset });

// --- layout: auto-growing textarea + scroll-to-current ----------------------

const editorEl = ref<HTMLDivElement | null>(null);
const highlightEl = ref<HTMLDivElement | null>(null);
const inputEl = ref<HTMLTextAreaElement | null>(null);

/** Textareas don't grow to fit their content on their own; fake it. */
function autoGrowTextarea(): void {
  const el = inputEl.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function scrollToCurrentLine(): void {
  // The mirror's last row is the current line (see ghostLines).
  const currentRow = highlightEl.value?.lastElementChild;
  if (currentRow) {
    currentRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else if (editorEl.value) {
    // Nothing under the reader: scroll down to the textarea so it's clear
    // where typing would feed the reader more tape.
    editorEl.value.scrollTo({ top: editorEl.value.scrollHeight, behavior: "smooth" });
  }
}

/** Clicking the blank space around the (possibly one-row) textarea should still let you type. */
function focusInput(): void {
  inputEl.value?.focus();
}

onMounted(autoGrowTextarea);
</script>

<template>
  <div class="tape-view">
    <div class="toolbar">
      <div class="mode-toggle" role="radiogroup" aria-label="Tape mode">
        <button type="button" title="Straight" :class="{ active: tape.mode === TapeMode.Straight }"
          @click="setMode(TapeMode.Straight)">
          ↓
        </button>
        <button type="button" title="Looped" :class="{ active: tape.mode === TapeMode.Looped }"
          @click="setMode(TapeMode.Looped)">⟳</button>
      </div>
    </div>

    <div ref="editorEl" class="editor" @click.self="focusInput">
      <div v-for="(line, i) in pastLines" :key="i" class="line past">{{ line || "\u00A0" }}</div>
      <div class="tape-text">
        <div v-if="ghostLines.length" ref="highlightEl" class="ghost" aria-hidden="true">
          <div v-for="(line, i) in ghostLines" :key="i" class="ghost-line"
            :class="{ current: i === ghostLines.length - 1 }">
            {{ line }}
          </div>
        </div>
        <textarea ref="inputEl" class="tape-input" rows="1" spellcheck="false"
          :placeholder="tape.lines.length === 0 ? 'Type to add tape' : undefined" :value="rawText" @input="onInput" />
      </div>
    </div>

    <div class="toolbar">
      <div class="transport">
        <button type="button" title="reset" @click="reset">⏮</button>
        <!--<button type="button" title="advanced" @click="advance">⏵</button>-->
      </div>

      <div class="status">
        <template v-if="tape.position !== undefined">line {{ tape.position + 1 }} / {{ tape.lines.length }}</template>
        <template v-else-if="tape.lines.length === 0">empty tape</template>
        <template v-else>— end of tape —</template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tape-view {
  font-family: "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 6px;
  overflow: hidden;
  width: 10em;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--paper-raised);
  border-bottom: 1px solid var(--rule);
  font-size: 0.8rem;
}

.mode-toggle,
.transport {
  display: flex;
  gap: 0.25rem;
}

.toolbar .mode-toggle button {
  padding-right: 1.5em;
  padding-left: 1.5em;
  font-weight: bold;
}



.status {
  margin-left: auto;
  opacity: 0.7;
  white-space: nowrap;
}

.editor {
  height: 20rem;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.25rem 0;
}

.line {
  padding: 0 0.75rem;
  font-size: 0.95rem;
  line-height: 1.5em;
  white-space: pre-wrap;
  word-break: break-word;
}

.line.past {
  opacity: 0.5;
}

.tape-text {
  position: relative;
}

/* The textarea and the mirror rows must lay text out identically, or the
   highlight drifts off the current line. Keep every text-layout property
   shared here. */
.tape-input,
.ghost-line {
  box-sizing: border-box;
  width: 10em;
  margin: 0;
  padding: 0 0.75rem;
  border: 0;
  font: inherit;
  font-size: 0.95rem;
  line-height: 1.5em;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: normal;
}

.ghost {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.ghost-line {
  min-height: 1.5em;
  /* an empty line is still one row tall in the textarea */
  color: transparent;
}

.ghost-line.current {
  background: var(--amber);
  /* inset shadows instead of borders, so the rules take up no space */
  box-shadow:
    inset 0 1px 0 var(--amber-strong),
    inset 0 -1px 0 var(--amber-strong);
}

.tape-input {
  /* positioned + later in the DOM, so it paints over the highlight */
  position: relative;
  display: block;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: var(--ink);
  caret-color: var(--amber-strong);
  outline: none;
}

.tape-input::placeholder {
  color: var(--ink);
  opacity: 0.35;
}

.tape-input:focus {
  outline: none;
}
</style>
