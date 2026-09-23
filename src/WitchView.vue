<script setup lang="ts">
import { computed, ref } from "vue";
import { Witch, RunStatus } from "@lib/WITCH.ts";
import TapeSetView from "./TapeSetView.vue";
import StoresView from "./StoresView.vue";
import PrinterOutput from "./PrinterOutput.vue";
import Lamp from "./Lamp.vue";

const witch = defineModel<Witch>({ required: true });

async function run() {
    witch.value.status = RunStatus.RUNNING
    while (witch.value.status == RunStatus.RUNNING) {
        witch.value.step();
        await new Promise(resolve => setTimeout(resolve, 250));
    }
}

</script>
<template>
    <div class="emulator">
        <div class="title">
            <h1>W.I.T.C.H.🧙‍♀️</h1>
            <h2>Wolverhampton Instrument for Teaching Computing from Harwell</h2>
        </div>
        <PrinterOutput class="printer" v-model="witch.printer1.text" />
        <TapeSetView class="tapes" v-model="witch.tapes" />
        <div class="status">
            Running:
            <lamp color="#ff0000" :value="witch.status == RunStatus.STOPPED" />
            <lamp color="#00ff00" :value="witch.status == RunStatus.RUNNING" />
            Finish:
            <lamp color="#0165fc" :value="witch.finish" />
            Signal:
            <lamp color="#ffff00" :value="witch.signal" />
            Alarm:
            <lamp color="#ff0000" :value="witch.alarm" />

            Sign:
            <lamp color="#00ff00" :value="witch.signTest" />
            <lamp color="#ff0000" :value="!witch.signTest" />
        </div>
        <div class="controls">
            Acc: <input size="16" v-model.lazy="witch.accumulator.asString" />
            Current Order: <input size="4" v-model.lazy="witch.currentOrderString" />
            Order Source <input size="1" v-model.lazy="witch.orderSource" />
            Layout <input size="1" v-model.lazy="witch.layout" />
            <button @click="witch.step">Step</button>
            <button @click="run">Run</button>
        </div>
        <StoresView class="stores" v-model="witch.stores" />
    </div>
</template>
<style>
button {
    font: inherit;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--rule);
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    background: var(--paper-raised);
}

button:hover {
    border-color: var(--amber-strong);
}

button.active {
    background: var(--amber-strong);
    border-color: var(--amber-strong);
    color: #1a1200;
}

input {
    font-family: monospace;
    color: var(--ink);
    background: var(--paper-raised);
    border: 1px solid var(--rule);
    border-radius: 4px;
    padding: 0.25rem 0.1rem;
    text-align: right;
}
</style>

<style scoped>
.emulator {
    display: grid;
    grid-template-areas:
        "title title"
        "tapes printout"
        "status status"
        "controls controls"
        "stores stores";
    grid-template-columns: auto auto;
    grid-template-rows: auto auto auto auto;
}

div.title {
    grid-area: title;
}

.printer {
    grid-area: printout;
}

.controls {
    margin-top: 20px;
    margin-bottom: 20px;
    grid-area: controls;
}

.controls input {
    padding: 0.5rem 0.25rem;
}

.status {
    margin-top: 20px;
    margin-bottom: 20px;
    grid-area: status;
}

.stores {
    grid-area: stores;
}
</style>