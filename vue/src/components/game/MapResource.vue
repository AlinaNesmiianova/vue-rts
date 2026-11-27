<template>
  <!-- объект ресурса: тень на земле и стоячая картинка, тает по мере добычи -->
  <g
    class="map-resource"
    :class="classes"
    @mousedown.left.exact.stop="onSelect"
    @mousedown.left.shift.exact.stop="onToggle"
  >
    <circle
      :cx="resource.x"
      :cy="resource.y"
      :r="radius"
      class="map-resource__ground"
    />
    <g :transform="look.transform">
      <use
        v-for="(item, index) in look.items"
        :key="index"
        v-bind="item"
      />
      <circle
        v-for="(vein, index) in veins"
        :key="index"
        v-bind="vein"
      />
    </g>
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { RESOURCE_TYPES } from '@/game/resources'
import { resourceLook } from '@/game/visuals'

const props = defineProps({
  resource: { type: Object, required: true },
  actions: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => RESOURCE_TYPES[props.resource.type])
const radius = computed(() => type.value.size / 2)
const look = computed(() => resourceLook(props.resource, type.value))
const veins = computed(() => (look.value.veins ?? []).map(({ part, ...circle }) => ({
  ...circle,
  class: `map-resource__${part}`,
})))
const selected = computed(() => store.getters['game/isSelected'](props.resource.id))
const classes = computed(() => ({ 'map-resource--selected': selected.value }))

const onSelect = () => props.actions.select(props.resource.id)
const onToggle = () => props.actions.toggleSelected(props.resource.id)
</script>

<style scoped lang="scss">
.map-resource {
  cursor: pointer;

  &__ground {
    fill: rgba(0, 0, 0, 0.25);
    stroke: none;
  }

  &--selected &__ground {
    stroke: #7fd1c1;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  &__ore {
    fill: #c0704a;
  }

  // золото поблескивает
  &__gold {
    fill: #ffd35a;
    animation: glint 2.5s ease-in-out infinite alternate;
  }
}

@keyframes glint {
  from {
    opacity: 0.6;
  }

  to {
    opacity: 1;
  }
}
</style>
