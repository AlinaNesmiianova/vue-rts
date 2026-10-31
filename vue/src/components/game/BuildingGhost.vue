<template>
  <!-- здание, которое сейчас ставим: зеленое - место свободно, красное - нельзя -->
  <rect
    v-if="placement && placement.x !== null"
    :x="placement.x - size / 2"
    :y="placement.y - size / 2"
    :width="size"
    :height="size"
    class="building-ghost"
    :class="valid ? 'building-ghost--valid' : 'building-ghost--invalid'"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { BUILDING_TYPES } from '@/game/entities'

const store = useStore()
const placement = computed(() => store.getters['game/getPlacement'])
const valid = computed(() => store.getters['game/isPlacementValid'])
const size = computed(() => (placement.value ? BUILDING_TYPES[placement.value.type].size : 0))
</script>

<style scoped lang="scss">
.building-ghost {
  stroke-width: 2;
  stroke-dasharray: 6 4;
  vector-effect: non-scaling-stroke;
  pointer-events: none;

  &--valid {
    fill: rgba(113, 212, 160, 0.35);
    stroke: #71d4a0;
  }

  &--invalid {
    fill: rgba(241, 119, 119, 0.35);
    stroke: #f17777;
  }
}
</style>
