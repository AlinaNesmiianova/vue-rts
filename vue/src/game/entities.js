// Игровые сущности и их характеристики.
// speed — клетки в секунду, attackSpeed — количество ударов в секунду.
export const KINDS = { UNIT: 'unit', BUILDING: 'building' }

export const UNIT_TYPES = {
  slow: {
    name: 'Медленный', maxHp: 120, attack: 18, speed: 1.5, attackSpeed: 1,
    size: 0.8,
  },
  fast: {
    name: 'Быстрый', maxHp: 75, attack: 11, speed: 3, attackSpeed: 2,
    size: 0.8,
  },
}

export const BUILDING_TYPES = {
  house: { name: 'Дом', maxHp: 160, size: 2 },
  castle: { name: 'Замок', maxHp: 400, size: 4 },
}

let nextId = 1

export const createUnit = (type, x, y, groupId = 'group1') => ({
  id: nextId++, kind: KINDS.UNIT, type, groupId, x, y,
  hp: UNIT_TYPES[type].maxHp,
  target: null, // приказ перемещения
  attackTargetId: null, // id цели для атаки
  attackCooldown: 0, // секунды до следующего удара
})

export const createBuilding = (type, x, y, groupId = 'group1') => ({
  id: nextId++, kind: KINDS.BUILDING, type, groupId, x, y,
  hp: BUILDING_TYPES[type].maxHp,
})

export const typeOf = (entity) => (entity.kind === KINDS.UNIT ? UNIT_TYPES : BUILDING_TYPES)[entity.type]
export const isUnit = (entity) => entity.kind === KINDS.UNIT
export const isBuilding = (entity) => entity.kind === KINDS.BUILDING

// атаковать можно только живого противника, будь то персонаж или здание
export const canAttack = (unit, target) =>
  !!unit && isUnit(unit) && unit.hp > 0 && !!target && target.hp > 0 && unit.groupId !== target.groupId

// Ищем цель по координатам курсора. Допуск помогает попадать по небольшим юнитам
// в изометрической проекции. Сначала проверяем саму фигуру, затем область рядом.
const HIT_PADDING = 0.35
const byDepth = (a, b) => a.x + a.y - (b.x + b.y)

const containsEntity = (entity, point, padding) => {
  const radius = typeOf(entity).size / 2 + padding
  const dx = Math.abs(entity.x - point.x)
  const dy = Math.abs(entity.y - point.y)
  if (isBuilding(entity)) return dx <= radius && dy <= radius
  return Math.hypot(dx, dy) <= radius
}

export const entityAtPoint = (entities, point) => {
  // Юниты рисуются поверх зданий; в каждой группе последние по глубине — сверху.
  const units = entities.filter((entity) => entity.hp > 0 && isUnit(entity)).sort(byDepth).reverse()
  const buildings = entities.filter((entity) => entity.hp > 0 && isBuilding(entity)).sort(byDepth).reverse()
  const visible = [...units, ...buildings]
  return visible.find((entity) => containsEntity(entity, point, 0))
    ?? visible.find((entity) => containsEntity(entity, point, HIT_PADDING))
    ?? null
}

// Передвигает юнита к точке с учётом скорости и прошедшего времени.
export const stepToTarget = (unit, dt) => {
  const next = { x: unit.x, y: unit.y, target: unit.target }
  if (!unit.target) return next

  const dx = unit.target.x - unit.x
  const dy = unit.target.y - unit.y
  const dist = Math.hypot(dx, dy)
  const step = UNIT_TYPES[unit.type].speed * dt

  if (dist <= step) {
    next.x = unit.target.x
    next.y = unit.target.y
    next.target = null
  } else {
    next.x += (dx / dist) * step
    next.y += (dy / dist) * step
  }
  return next
}
