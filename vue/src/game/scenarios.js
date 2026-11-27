// Расстановка кланов и подготовка приказов: в бою участвуют все кланы, сколько бы их ни было.
import {
  canAttack, createBuilding, createResource, createUnit, isBuilding, isUnit,
} from './entities.js'
import { addOrders, ORDER_TYPES } from './events.js'
import { createGroups } from './groups.js'
import { findBuildingSpot, findResourceSpot } from './placement.js'
import { findSpawnPoint } from './spawn.js'

export const DEFAULT_GROUP_COUNT = 2
const BASE_RADIUS = 28 // на таком расстоянии от центра карты кланы ставят базы
const START_UNITS = ['slow', 'slow', 'fast']
// ресурсы за базой, по дуге от центра карты: вдоль (along) и поперек (across) направления на базу
const BASE_RESOURCES = [
  { type: 'wood', along: 7, across: -5 },
  { type: 'wood', along: 8, across: 0 },
  { type: 'stone', along: 7, across: 5 },
  { type: 'ore', along: 11, across: -3 },
  { type: 'gold', along: 11, across: 3 },
]
// ничьи ресурсы в середине карты, за них можно побороться
const CENTER_RESOURCES = [
  { type: 'gold', x: 0, y: -4 },
  { type: 'ore', x: -4, y: 2 },
  { type: 'stone', x: 3, y: 4 },
]

// объекты ресурсов в точках spots; место занято - берем ближайшее свободное, нет его - пропускаем
const placeResources = (map, entities, spots) => spots.reduce((placed, spot) => {
  const point = findResourceSpot(map, [...entities, ...placed], spot.type, spot)
  return point ? [...placed, createResource(spot.type, point.x, point.y)] : placed
}, [])

// база клана: особняк, хижина рядом, трое бойцов перед особняком и ресурсы за ним
// кланы расходятся по кругу от центра, угол у каждого свой; занято - берем ближайшее свободное место
export const createBase = (map, entities, group, index) => {
  const angle = index * 2.4
  const near = { x: Math.cos(angle) * BASE_RADIUS, y: Math.sin(angle) * BASE_RADIUS }
  const castleSpot = findBuildingSpot(map, entities, 'castle', near)
  if (!castleSpot) return []
  const base = [createBuilding('castle', castleSpot.x, castleSpot.y, group.id)]
  const houseSpot = findBuildingSpot(map, [...entities, ...base], 'house', { x: castleSpot.x - 4, y: castleSpot.y })
  if (houseSpot) base.push(createBuilding('house', houseSpot.x, houseSpot.y, group.id))
  START_UNITS.forEach((type) => {
    const point = findSpawnPoint(map, [...entities, ...base], base[0], type)
    if (point) base.push(createUnit(type, point.x, point.y, group.id))
  })
  const out = { x: Math.cos(angle), y: Math.sin(angle) }
  const spots = BASE_RESOURCES.map(({ type, along, across }) => ({
    type,
    x: castleSpot.x + out.x * along - out.y * across,
    y: castleSpot.y + out.y * along + out.x * across,
  }))
  return [...base, ...placeResources(map, [...entities, ...base], spots)]
}

// очередь атак: каждый персонаж по порядку идет на все цели из targets чужих кланов
// сначала бойцы, потом здания, внутри - ближайшие
export const planAttacks = (events, nextEventId, units, targets, append = true) => {
  let next = { events, nextEventId }
  units.forEach((unit) => {
    targets
      .filter((target) => canAttack(unit, target))
      .sort((a, b) => {
        if (isBuilding(a) !== isBuilding(b)) return isBuilding(a) ? 1 : -1
        return Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y)
      })
      .forEach((target, index) => {
        const first = !append && index === 0 // первый приказ заменяет старую очередь
        next = addOrders(next.events, next.nextEventId, [unit.id], { type: ORDER_TYPES.ATTACK, targetId: target.id }, !first)
      })
  })
  return next
}

// новая партия на groupCount кланов: у каждого база, у каждого бойца цепочка атак по всем чужим
export const createBattle = (map, groupCount = DEFAULT_GROUP_COUNT) => {
  const groups = createGroups(groupCount)
  const entities = []
  groups.forEach((group, index) => entities.push(...createBase(map, entities, group, index + 1)))
  entities.push(...placeResources(map, entities, CENTER_RESOURCES))
  const { events, nextEventId } = planAttacks([], 1, entities.filter(isUnit), entities)
  return { groups, entities, events, nextEventId }
}
