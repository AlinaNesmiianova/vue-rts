// Игровые сущности и их характеристики.
// speed — клетки в секунду, attackSpeed — количество ударов в секунду.
export const KINDS = { UNIT: 'unit', BUILDING: 'building' }
export const TEAMS = { PLAYER: 'player', ENEMY: 'enemy' }

export const UNIT_TYPES = {
  slow: {
    name: 'Медленный', maxHp: 120, attack: 18, speed: 1.5, attackSpeed: 1,
    size: 0.8, color: '#3d6fb8', enemyColor: '#c85855',
  },
  fast: {
    name: 'Быстрый', maxHp: 75, attack: 11, speed: 3, attackSpeed: 2,
    size: 0.8, color: '#37a5a0', enemyColor: '#df8b49',
  },
}

export const BUILDING_TYPES = {
  house: { name: 'Дом', maxHp: 160, size: 2, color: '#8a6d4b', enemyColor: '#9e5651' },
  castle: { name: 'Замок', maxHp: 400, size: 4, color: '#7d7f86', enemyColor: '#9b596b' },
}

let nextId = 1

export const createUnit = (type, x, y, team = TEAMS.PLAYER) => ({
  id: nextId++, kind: KINDS.UNIT, type, team, x, y,
  hp: UNIT_TYPES[type].maxHp,
  target: null, // приказ перемещения
  attackTargetId: null, // id цели для атаки
  attackCooldown: 0, // секунды до следующего удара
})

export const createBuilding = (type, x, y, team = TEAMS.PLAYER) => ({
  id: nextId++, kind: KINDS.BUILDING, type, team, x, y,
  hp: BUILDING_TYPES[type].maxHp,
})

export const typeOf = (entity) => (entity.kind === KINDS.UNIT ? UNIT_TYPES : BUILDING_TYPES)[entity.type]
export const isUnit = (entity) => entity.kind === KINDS.UNIT
export const isBuilding = (entity) => entity.kind === KINDS.BUILDING

// атаковать можно только живого противника, будь то персонаж или здание
export const canAttack = (unit, target) =>
  !!unit && isUnit(unit) && unit.hp > 0 && !!target && target.hp > 0 && unit.team !== target.team

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

// Две команды: синие и красные, обе управляются игроком.
export const createStartEntities = () => [
  createBuilding('castle', -8, -8),
  createBuilding('house', 7, -5),
  createUnit('slow', -2, 2),
  createUnit('slow', 0, 3),
  createUnit('fast', 3, 1),
  createBuilding('castle', 12, 7, TEAMS.ENEMY),
  createBuilding('house', 11, -4, TEAMS.ENEMY),
  createUnit('slow', 6, 4, TEAMS.ENEMY),
  createUnit('fast', 8, 3, TEAMS.ENEMY),
]

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
