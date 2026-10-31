// шина событий игры (mitt)
// компоненты сообщают что произошло, а обрабатывает это одно место - useGameEvents
// новые действия (атака, стройка, очередь приказов) - новое событие здесь и обработчик там

import mitt from 'mitt'

export const EVENTS = {
  SELECT: 'select', // id объекта или null - снять выбор
  MOVE: 'move', // точка экрана, куда идти
  BUILD_START: 'build-start', // тип здания: начать стройку (тот же тип еще раз - отменить)
  BUILD_PLACE: 'build-place', // { keep }: поставить здание, keep - строить дальше то же
  BUILD_CANCEL: 'build-cancel', // отменить стройку
}

export const bus = mitt()
