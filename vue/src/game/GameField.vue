<template>
  <svg
    ref="svg"
    class="game-field"
    @contextmenu.prevent
    @wheel.prevent="onWheel"
  >
    <!-- карта пока без объектов (svg сцена с изометрической проекцией) -->
    <g :transform="matrix">
      <MapGround :map="map" />
    </g>

    <circle :cx="labels.center.x" :cy="labels.center.y" r="4" class="game-field__center" />
    <text :x="labels.center.x + 8" :y="labels.center.y - 6" class="game-field__label">(0, 0)</text>
    <text :x="labels.x.x + 6" :y="labels.x.y" class="game-field__label">x</text>
    <text :x="labels.y.x - 14" :y="labels.y.y" class="game-field__label">y</text>
  </svg>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { clamp } from '@/game/camera'
import MapGround from './MapGround.vue'

const store = useStore()
const svg = ref(null)
const map = computed(() => store.getters['game/getMap'])
const matrix = computed(() => store.getters['game/getCameraMatrix'])
const labels = computed(() => {
  const toScreen = store.getters['game/toScreen']
  const { maxX, maxY } = map.value.bounds
  return { center: toScreen({ x: 0, y: 0 }), x: toScreen({ x: maxX, y: 0 }), y: toScreen({ x: 0, y: maxY }) }
})

const toLocal = (e) => {
  const rect = svg.value.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

// камера уже управляеся прокруткой и масшабированием относительно курсора
const onWheel = (e) => {
  if (e.ctrlKey) store.dispatch('game/zoomCamera', { point: toLocal(e), factor: Math.exp(-clamp(e.deltaY, -50, 50) * 0.01) })
  else store.dispatch('game/panCamera', { dx: e.deltaX, dy: e.deltaY })
}

const resizeObserver = new ResizeObserver(([entry]) =>
  store.dispatch('game/setViewport', { width: entry.contentRect.width, height: entry.contentRect.height }),
)
onMounted(() => resizeObserver.observe(svg.value))
onBeforeUnmount(() => resizeObserver.disconnect())
</script>

<style scoped lang="scss">
.game-field {
  display: block;
  width: 100%;
  height: 100%;
  background: #0b0d10;

  &__center {
    fill: #fff;
  }

  &__label {
    fill: #fff;
    font-size: 14px;
    pointer-events: none;
  }
}
</style>