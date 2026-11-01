// спавн: где рядом со зданием появится новый персонаж
import { canStandOnTerrain } from './map.js'
import { BUILDING_TYPES, UNIT_TYPES } from './entities.js'
import { isClearOfEntity, toBox } from './placement.js'

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

// ближайшая к зданию свободная клетка для персонажа unitType; null - вокруг все занято
// внутри кольца сначала клетки ближе к центру здания (середины сторон, а не углы)
export const findSpawnPoint = (map, entities, building, unitType) => {
  const box = toBox(building.x, building.y, BUILDING_TYPES[building.type].size)
  const r = UNIT_TYPES[unitType].size / 2
  const distance = (p) => Math.hypot(p.x - building.x, p.y - building.y)

  for (let ring = 1; ring <= MAX_RING; ring++) {
    const free = ringCells(box, ring)
      .filter((p) => canStandOnTerrain(map, p, r, UNIT_TYPES[unitType].terrain) && entities.every((entity) => isClearOfEntity(p, r, entity)))
      .sort((a, b) => distance(a) - distance(b))
    if (free.length) {
      return free[0]
    }
  }
  return null
}
