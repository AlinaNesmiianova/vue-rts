// Шина событий: интерфейс сообщает о приказе, Vuex изменяет состояние игры.
import mitt from 'mitt'

export const EVENTS = {
  SELECT: 'select',
  MOVE: 'move',
  ATTACK: 'attack',
  SELF_DESTRUCT: 'self-destruct',
}

export const bus = mitt()
