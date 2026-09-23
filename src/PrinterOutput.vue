<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, shallowRef, toRaw, watch } from "vue";

const model = defineModel<string>({ required: true });
</script>
<template>
  <div>
    <textarea cols="80" rows="34" readonly="true">{{ model }}</textarea>
  </div>
</template>
<style scoped>
@font-face {
  font-family: "Pica10BTRoman";
  src:
    url("/Pica10BTRoman.woff") format("woff"),
    url("/Pica10BTRoman.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
}

textarea {
  font-family: Pica10BTRoman, monospace;
  font-weight: bold;
  padding: 20px;
  background-color: rgb(206, 196, 187);
  overflow-x: hidden;
  overflow-y: scroll;
}
</style>
