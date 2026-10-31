// стройка: куда встанет здание и можно ли его там поставить
import { containsPoint } from './map.js'
import { BUILDING_TYPES, isBuilding, typeOf } from './entities.js'

// углы проверяем чуть внутри здания, чтобы край карты не считался выходом за нее
const EDGE_INSET = 0.001

// квадрат здания: центр (x, y), сторона size
export const toBox = (x, y, size) => ({
  minX: x - size / 2,
  maxX: x + size / 2,
  minY: y - size / 2,
  maxY: y + size / 2,
})

// здание N x N ставим ровно по клеткам, курсор - примерно центр здания
export const snapToGrid = (type, point) => {
  const size = BUILDING_TYPES[type].size
  const left = Math.round(point.x - size / 2)
  const top = Math.round(point.y - size / 2)
  return { x: left + size / 2, y: top + size / 2 }
}

// пересекается ли квадрат с объектом на карте
const overlaps = (box, entity) => {
  const size = typeOf(entity).size

  if (isBuilding(entity)) {
    const other = toBox(entity.x, entity.y, size)
    return box.minX < other.maxX && other.minX < box.maxX && box.minY < other.maxY && other.minY < box.maxY
  }

  // персонаж - круг: ищем ближайшую к его центру точку квадрата
  const nearestX = Math.min(box.maxX, Math.max(box.minX, entity.x))
  const nearestY = Math.min(box.maxY, Math.max(box.minY, entity.y))
  return Math.hypot(entity.x - nearestX, entity.y - nearestY) < size / 2
}

// здание целиком на карте, не залезает на другие здания и не стоит на персонажах
export const canPlaceBuilding = (map, entities, type, point) => {
  const box = toBox(point.x, point.y, BUILDING_TYPES[type].size)

  const corners = [
    { x: box.minX + EDGE_INSET, y: box.minY + EDGE_INSET },
    { x: box.maxX - EDGE_INSET, y: box.minY + EDGE_INSET },
    { x: box.maxX - EDGE_INSET, y: box.maxY - EDGE_INSET },
    { x: box.minX + EDGE_INSET, y: box.maxY - EDGE_INSET },
  ]
  if (!corners.every((corner) => containsPoint(map, corner))) {
    return false
  }

  return entities.every((entity) => !overlaps(box, entity))
}
