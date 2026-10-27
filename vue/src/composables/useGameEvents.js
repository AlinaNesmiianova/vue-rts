import { onBeforeUnmount, onMounted } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'

export const useGameEvents = () => {
  const store = useStore()
  const handlers = {
    [EVENTS.SELECT]: (id) => store.dispatch('game/select', id),
    [EVENTS.MOVE]: (point) => store.dispatch('game/moveSelected', point),
    [EVENTS.ATTACK]: (targetId) => store.dispatch('game/attackSelected', targetId),
    [EVENTS.SELF_DESTRUCT]: (id) => store.dispatch('game/selfDestruct', id),
  }
  onMounted(() => Object.entries(handlers).forEach(([event, handler]) => bus.on(event, handler)))
  onBeforeUnmount(() => Object.entries(handlers).forEach(([event, handler]) => bus.off(event, handler)))
}
