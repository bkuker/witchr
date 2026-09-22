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
    <div>
        <h1>W.I.T.C.H.🧙‍♀️</h1>
        <h2>Wolverhampton Instrument for Teaching Computing from Harwell</h2>
        <PrinterOutput v-model="witch.printer1.text" />
        <TapeSetView v-model="witch.tapes" />
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

        <br>
        Acc: <input size="16" v-model="witch.accumulator.asString" />
        Current Order: <input size="5" v-model="witch.currentOrderString" />
        Order Source <input size="2" v-model="witch.orderSource" />
        Layout <input size="2" v-model="witch.layout" />
        <button @click="witch.step">Step</button>
        <button @click="run">Run</button>
        <StoresView v-model="witch.stores" />
    </div>
</template>
<style scoped>
input {
    font-family: monospace;
    width: 12ch;
    text-align: right;

    color: var(--ink);
    background: var(--paper-raised);
    border: 1px solid var(--rule);
}
</style>