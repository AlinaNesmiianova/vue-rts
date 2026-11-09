// Шина событий: интерфейс сообщает о приказе, Vuex изменяет состояние игры.
import mitt from 'mitt'

export const EVENTS = {
<<<<<<< HEAD
  SELECT: 'select', // id объекта или null - снять выбор
  SELECT_TOGGLE: 'select-toggle', // id объекта: добавить к выбору или убрать (shift + клик)
  SELECT_AREA: 'select-area', // { from, to, add }: углы рамки на экране, add - к уже выбранным
  MOVE: 'move', // точка экрана, куда идти
  BUILD_START: 'build-start', // тип здания: начать стройку (тот же тип еще раз - отменить)
  BUILD_PLACE: 'build-place', // { keep }: поставить здание, keep - строить дальше то же
  BUILD_CANCEL: 'build-cancel', // отменить стройку
  SPAWN: 'spawn', // { id, count }: здание id создает рядом с собой count своих персонажей
=======
  SELECT: 'select',
  MOVE: 'move',
  ATTACK: 'attack',
  SELF_DESTRUCT: 'self-destruct',
>>>>>>> temp/three-commits
}

export const bus = mitt()
