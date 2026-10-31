// связывает шину событий со стором: событие -> экшен

import { onBeforeUnmount, onMounted } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'

export const useGameEvents = () => {
  const store = useStore()
  const handlers = {
    [EVENTS.SELECT]: (id) => store.dispatch('game/select', id),
    [EVENTS.MOVE]: (point) => store.dispatch('game/moveSelected', point),
    [EVENTS.BUILD_START]: (type) => store.dispatch('game/startPlacement', type),
    [EVENTS.BUILD_PLACE]: (options) => store.dispatch('game/placeBuilding', options),
    [EVENTS.BUILD_CANCEL]: () => store.dispatch('game/cancelPlacement'),
  }
  onMounted(() => Object.entries(handlers).forEach(([event, handler]) => bus.on(event, handler)))
  onBeforeUnmount(() => Object.entries(handlers).forEach(([event, handler]) => bus.off(event, handler)))
}
