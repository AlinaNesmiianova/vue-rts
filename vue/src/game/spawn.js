// спавн: где рядом со зданием появится новый персонаж
import { containsPoint } from './map.js'
import { BUILDING_TYPES, isBuilding, typeOf, UNIT_TYPES } from './entities.js'
import { toBox } from './placement.js'

// сколько колец клеток вокруг здания проверяем, прежде чем сдаться
const MAX_RING = 10

// клетки кольца номер ring вокруг квадрата здания (ring = 1 - вплотную к стенам)
const ringCells = (box, ring) => {
  const minI = box.minX - ring
  const maxI = box.maxX + ring - 1
  const minJ = box.minY - ring
  const maxJ = box.maxY + ring - 1
  const cells = []
  for (let i = minI; i <= maxI; i++) {
    for (let j = minJ; j <= maxJ; j++) {
      if (i === minI || i === maxI || j === minJ || j === maxJ) {
        cells.push({ x: i + 0.5, y: j + 0.5 })
      }
    }
  }
  return cells
}

// круг персонажа (центр p, радиус r) не задевает объект
const isClear = (p, r, entity) => {
  const size = typeOf(entity).size

  if (isBuilding(entity)) {
    const box = toBox(entity.x, entity.y, size)
    const nearestX = Math.min(box.maxX, Math.max(box.minX, p.x))
    const nearestY = Math.min(box.maxY, Math.max(box.minY, p.y))
    return Math.hypot(p.x - nearestX, p.y - nearestY) >= r
  }

  return Math.hypot(p.x - entity.x, p.y - entity.y) >= r + size / 2
}

// ближайшая к зданию свободная клетка для персонажа unitType; null - вокруг все занято
// внутри кольца сначала клетки ближе к центру здания (середины сторон, а не углы)
export const findSpawnPoint = (map, entities, building, unitType) => {
  const box = toBox(building.x, building.y, BUILDING_TYPES[building.type].size)
  const r = UNIT_TYPES[unitType].size / 2
  const distance = (p) => Math.hypot(p.x - building.x, p.y - building.y)

  for (let ring = 1; ring <= MAX_RING; ring++) {
    const free = ringCells(box, ring)
      .filter((p) => containsPoint(map, p) && entities.every((entity) => isClear(p, r, entity)))
      .sort((a, b) => distance(a) - distance(b))
    if (free.length) {
      return free[0]
    }
  }
  return null
}
