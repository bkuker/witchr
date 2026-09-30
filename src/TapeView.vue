<script setup lang="ts">
/**
 * TapeView — shows a Tape as a list of lines, with the current line
 * highlighted. Read-only: no editing.
 */
import { nextTick, onMounted, ref, watch } from "vue";
import { Tape, TapeMode } from "@lib/Tape";

const tape = defineModel<Tape>({ required: true });

const editorEl = ref<HTMLDivElement | null>(null);

watch(
  () => [tape.value, tape.value.position],
  () => nextTick(scrollToCurrentLine),
);

function setMode(mode: TapeMode): void {
  tape.value.mode = mode; // doesn't touch position — matches Tape's own semantics
}

function reset(): void {
  tape.value.reset();
}

function advance(): boolean {
  return tape.value.advance();
}

defineExpose({ advance, reset });

function scrollToCurrentLine(): void {
  const row = editorEl.value?.querySelector(".line.current");
  if (row) {
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else if (editorEl.value) {
    // Nothing under the reader (empty tape, or ran off the end): show the bottom.
    editorEl.value.scrollTo({ top: editorEl.value.scrollHeight, behavior: "smooth" });
  }
}

onMounted(scrollToCurrentLine);
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

    <div ref="editorEl" class="editor">
      <div v-for="(line, i) in tape.lines" :key="i" class="line" :class="{ current: i === tape.position }">{{ line }}
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

.line.current {
  background: var(--amber);
  /* inset shadows instead of borders, so the rules take up no space */
  box-shadow:
    inset 0 1px 0 var(--amber-strong),
    inset 0 -1px 0 var(--amber-strong);
}
</style>