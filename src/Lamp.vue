<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    color: String,
    value: Boolean
});

</script>
<template>
    <div class="lamp" :class="{ on: value, off: !value }">
        <div class="dim"></div>
        <div class="bright"></div>
    </div>
</template>
<style scoped>
div.lamp {
    display: inline-block;
    width: 20px;
    height: 20px;
    background: v-bind(color);
    border: 3px solid gray;
    border-radius: 10px;
    overflow: hidden;
    vertical-align: middle;
}

div.off>div,
div.on>div {
    display: none;
}

div.off>div.dim {
    background-color: #000000dd;
    display: block;
    width: 20px;
    height: 20px;
}

div.on>div.bright {
    background-color: #ffffff88;
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 3px;
    position: relative;
    left: 5px;
    top: 3px;
}
</style>