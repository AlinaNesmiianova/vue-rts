<template>
  <!-- здание - квадрат size x size клеток с центром в (x, y), на экране ромб -->
  <rect
    :x="building.x - type.size / 2"
    :y="building.y - type.size / 2"
    :width="type.size"
    :height="type.size"
    :fill="colorOf(group, building)"
    :stroke="group?.color"
    class="map-building"
    :class="{ 'map-building--selected': selected }"
    @mousedown.left.exact.stop="bus.emit(EVENTS.SELECT, building.id)"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { BUILDING_TYPES } from '@/game/entities'
import { colorOf } from '@/game/groups'

const props = defineProps({
  building: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => BUILDING_TYPES[props.building.type])
const group = computed(() => store.getters['game/getGroup'](props.building.groupId))
const selected = computed(() => store.getters['game/isSelected'](props.building.id))
</script>

<style scoped lang="scss">
.map-building {
  stroke: #3d8ecc;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  cursor: pointer;

  &--selected {
    stroke: #fff;
    stroke-width: 4;
  }

}
</style>
