<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  data: string
  viewbox?: number
}
const props = withDefaults(defineProps<Props>(), {
  viewbox: 10,
})

// viewbox=10 -> "-10 -10 20 20" (i.e. x and y each range from -10 to +10)
const viewBoxStr = computed(() => {
  const v = props.viewbox
  return `${-v} ${-v} ${v * 2} ${v * 2}`
})

// Dot radii and blur spread are in user-space units, so they need to
// shrink/grow along with the viewbox to stay visually consistent.
// These base sizes are tuned for viewbox=10.
const scale = computed(() => props.viewbox / 10)
const glowDotR = computed(() => 0.09 * scale.value)
const dotR = computed(() => 0.045 * scale.value)
const glowBlur = computed(() => 0.18 * scale.value)

type Point = [number, number]
type Edge = [number, number]

function parsePoints(block: string): Point[] {
  return block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/).map(Number)
      return [parts[0], parts[1]] as Point
    })
}

// Old-format index encoding: index N was stored as N / 100,
// e.g. index 17 shows up in the file as "+0.170000".
function decodeIndex(token: string): number {
  return Math.round(parseFloat(token) * 100)
}

function parseEdges(block: string): Edge[] {
  return block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/)
      return [decodeIndex(parts[0]), decodeIndex(parts[1])] as Edge
    })
}

// The input is two sections separated by one or more blank lines:
// first the X,Y point pairs, then the encoded index pairs (edges).
const sections = computed(() =>
  props.data
    .trim()
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean),
)

const points = computed<Point[]>(() =>
  sections.value.length ? parsePoints(sections.value[0]) : [],
)

const edges = computed<Edge[]>(() => {
  const edgeBlock = sections.value.slice(1).join('\n')
  return edgeBlock ? parseEdges(edgeBlock) : []
})

interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

const segments = computed<Segment[]>(() => {
  const pts = points.value
  const result: Segment[] = []
  edges.value.forEach(([i, j], idx) => {
    const a = pts[i]
    const b = pts[j]
    if (!a || !b) {
      console.log(
        `[VectorScope] edge #${idx} references missing point index (${i}, ${j}) — skipping`,
      )
      return
    }
    result.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] })
  })
  return result
})
</script>

<template>
  <div class="scope">
    <svg :viewBox="viewBoxStr" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id="scope-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur :stdDeviation="glowBlur" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- flips y so +y renders at the top, since SVG's native y grows downward -->
      <g transform="scale(1,-1)">
        <g class="glow-layer" filter="url(#scope-glow)">
          <line v-for="(seg, idx) in segments" :key="'glow-line-' + idx" :x1="seg.x1" :y1="seg.y1" :x2="seg.x2"
            :y2="seg.y2" vector-effect="non-scaling-stroke" />
          <circle v-for="(p, idx) in points" :key="'glow-pt-' + idx" :cx="p[0]" :cy="p[1]" :r="glowDotR" />
        </g>

        <g class="line-layer">
          <line v-for="(seg, idx) in segments" :key="'line-' + idx" :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
            vector-effect="non-scaling-stroke" />
          <circle v-for="(p, idx) in points" :key="'pt-' + idx" :cx="p[0]" :cy="p[1]" :r="dotR" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.scope {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #000;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
}

.glow-layer line {
  stroke: #22ff77;
  stroke-width: 3px;
  opacity: 0.5;
}

.glow-layer circle {
  fill: #22ff77;
  opacity: 0.5;
}

.line-layer line {
  stroke: #7dffb0;
  stroke-width: 1.3px;
  stroke-linecap: round;
  fill: none;
}

.line-layer circle {
  fill: #e8fff0;
  stroke: none;
}
</style>