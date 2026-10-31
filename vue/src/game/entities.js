// объекты на карте: персонажи и здания
// характеристики лежат в таблицах: новый тип = новая строка, новое свойство = новое поле
// size - сторона квадрата в клетках (на экране ромб), скорость считается в клетках в секунду

export const KINDS = { UNIT: 'unit', BUILDING: 'building' }

export const UNIT_TYPES = {
  slow: { name: 'Медленный', speed: 1.5, size: 0.8, color: '#3d6fb8' },
  fast: { name: 'Быстрый', speed: 3, size: 0.8, color: '#b8432f' },
}

// здание size x size клеток; порядок здесь = порядок кнопок в панели стройки
export const BUILDING_TYPES = {
  tower: { name: 'Башня', size: 1, color: '#6f7d5c' },
  house: { name: 'Дом', size: 2, color: '#8a6d4b' },
  barracks: { name: 'Казарма', size: 3, color: '#6b5b7b' },
  castle: { name: 'Замок', size: 4, color: '#7d7f86' },
}

let nextId = 1

// target - точка, к которой идет сейчас, path - следующие точки пути в обход зданий
export const createUnit = (type, x, y) => ({ id: nextId++, kind: KINDS.UNIT, type, x, y, target: null, path: [] })

export const createBuilding = (type, x, y) => ({ id: nextId++, kind: KINDS.BUILDING, type, x, y })

export const typeOf = (entity) => (entity.kind === KINDS.UNIT ? UNIT_TYPES : BUILDING_TYPES)[entity.type]

export const isUnit = (entity) => entity.kind === KINDS.UNIT

export const isBuilding = (entity) => entity.kind === KINDS.BUILDING

// стартовая расстановка (здания стоят ровно по клеткам: центр + половина размера)
export const createStartEntities = () => [
  createBuilding('castle', -8, -8),
  createBuilding('house', 7, -5),
  createUnit('slow', -2, 2),
  createUnit('slow', 0, 3),
  createUnit('fast', 3, 1),
]

// шаг к цели за dt секунд: путь = скорость * dt, поэтому скорость не зависит от fps
// возвращает новые координаты, цель и остаток пути (цель null - дошел до конца)
export const stepToTarget = (unit, dt) => {
  const next = { x: unit.x, y: unit.y, target: unit.target, path: unit.path } // начинаем с текущего положения

  const dx = unit.target.x - unit.x
  const dy = unit.target.y - unit.y
  const dist = Math.hypot(dx, dy)
  const step = UNIT_TYPES[unit.type].speed * dt

  if (dist <= step) {
    // ближе шага - встаем ровно в точку и берем следующую из пути (нет ее - останавливаемся)
    next.x = unit.target.x
    next.y = unit.target.y
    next.target = unit.path[0] ?? null
    next.path = unit.path.slice(1)
  } else {
    // идем в сторону цели на длину шага
    next.x += (dx / dist) * step
    next.y += (dy / dist) * step
  }

  return next
}
