// обход зданий: ищем путь по клеткам (A*), потом срезаем лишние повороты
import { containsPoint } from './map.js'
import { BUILDING_TYPES, isBuilding } from './entities.js'
import { toBox } from './placement.js'

// 8 соседей клетки: 4 по сторонам и 4 по диагонали
const NEIGHBORS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
]

// с таким шагом проверяем отрезок, меньше толщины любого здания
const CHECK_STEP = 0.1

// как далеко от цели ищем свободную клетку, если цель в здании
const MAX_SEARCH_RING = 20

const keyOf = (i, j) => `${i},${j}`
const cellOf = (point) => ({ i: Math.floor(point.x), j: Math.floor(point.y) })
const centerOf = (cell) => ({ x: cell.i + 0.5, y: cell.j + 0.5 })

// все, что нужно поиску: занятые клетки и здания, раздутые на радиус персонажа
const createGrid = (map, entities, radius) => {
  const buildings = entities.filter(isBuilding)
  const blocked = new Set()
  buildings.forEach((building) => {
    const box = toBox(building.x, building.y, BUILDING_TYPES[building.type].size)
    for (let i = Math.floor(box.minX); i < Math.ceil(box.maxX); i++) {
      for (let j = Math.floor(box.minY); j < Math.ceil(box.maxY); j++) {
        blocked.add(keyOf(i, j))
      }
    }
  })

  // центр персонажа не должен заходить в здание ближе чем на радиус
  const boxes = buildings.map((b) => toBox(b.x, b.y, BUILDING_TYPES[b.type].size + radius * 2))
  return { map, blocked, boxes }
}

const isFreeCell = (grid, cell) => !grid.blocked.has(keyOf(cell.i, cell.j)) && containsPoint(grid.map, centerOf(cell))

const isFreePoint = (grid, p) => grid.boxes.every((b) => p.x <= b.minX || p.x >= b.maxX || p.y <= b.minY || p.y >= b.maxY)

// можно ли пройти по прямой: проверяем точки отрезка с маленьким шагом
const canWalkStraight = (grid, from, to) => {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / CHECK_STEP)
  for (let k = 1; k <= steps; k++) {
    const t = k / steps
    if (!isFreePoint(grid, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })) {
      return false
    }
  }
  return true
}

// цель в здании - ищем ближайшую к ней свободную клетку, обходя кольца вокруг
const nearestFreeCell = (grid, cell) => {
  if (isFreeCell(grid, cell)) {
    return cell
  }

  for (let r = 1; r <= MAX_SEARCH_RING; r++) {
    const ring = []
    for (let i = cell.i - r; i <= cell.i + r; i++) {
      for (let j = cell.j - r; j <= cell.j + r; j++) {
        if (Math.max(Math.abs(i - cell.i), Math.abs(j - cell.j)) === r && isFreeCell(grid, { i, j })) {
          ring.push({ i, j })
        }
      }
    }
    if (ring.length) {
      const dist = (c) => Math.hypot(c.i - cell.i, c.j - cell.j)
      return ring.reduce((best, c) => (dist(c) < dist(best) ? c : best))
    }
  }
  return cell
}

// A*: всегда раскрываем клетку с наименьшим f = пройдено (g) + примерно осталось (h)
// если до цели не дойти, возвращаем путь к самой близкой к ней клетке
const searchCells = (grid, start, goal) => {
  const h = (c) => Math.hypot(c.i - goal.i, c.j - goal.j)
  const startNode = { ...start, g: 0, h: h(start), parent: null }
  const open = [startNode]
  const closed = new Set()
  const bestG = new Map() // лучший найденный g для клетки, чтобы не класть в очередь худшие пути
  let closest = startNode

  while (open.length) {
    const index = open.reduce((best, n, k) => (n.g + n.h < open[best].g + open[best].h ? k : best), 0)
    const node = open.splice(index, 1)[0]
    const key = keyOf(node.i, node.j)
    if (closed.has(key)) {
      continue
    }
    closed.add(key)

    if (node.h < closest.h) {
      closest = node
    }
    if (node.i === goal.i && node.j === goal.j) {
      break
    }

    NEIGHBORS.forEach(([di, dj]) => {
      const next = { i: node.i + di, j: node.j + dj }
      if (closed.has(keyOf(next.i, next.j)) || !isFreeCell(grid, next)) {
        return
      }
      // по диагонали только если обе соседние клетки свободны, иначе срежем угол здания
      if (di && dj && (!isFreeCell(grid, { i: node.i + di, j: node.j }) || !isFreeCell(grid, { i: node.i, j: node.j + dj }))) {
        return
      }
      const g = node.g + Math.hypot(di, dj)
      if (g >= (bestG.get(keyOf(next.i, next.j)) ?? Infinity)) {
        return
      }
      bestG.set(keyOf(next.i, next.j), g)
      open.push({ ...next, g, h: h(next), parent: node })
    })
  }

  const cells = []
  for (let node = closest; node; node = node.parent) {
    cells.unshift(node)
  }
  return cells
}

// из точек по клеткам оставляем только повороты: идем по прямой до самой дальней видимой точки
const smoothPath = (grid, points) => {
  const result = []
  let i = 0
  while (i < points.length - 1) {
    let far = i + 1
    while (far + 1 < points.length && canWalkStraight(grid, points[i], points[far + 1])) {
      far++
    }
    result.push(points[far])
    i = far
  }
  return result
}

// путь персонажа от from к to в обход зданий: список точек, по которым идти
// цель в здании - идем к ближайшей свободной клетке, цель недостижима - подходим как можно ближе
export const findPath = (map, entities, from, to, radius) => {
  const grid = createGrid(map, entities, radius)
  if (canWalkStraight(grid, from, to)) {
    return [to]
  }

  const target = cellOf(to)
  const cells = searchCells(grid, cellOf(from), nearestFreeCell(grid, target))
  const points = cells.map(centerOf)

  // дошли до клетки цели и сама цель не у стены - встаем ровно в нее, а не в центр клетки
  const last = cells[cells.length - 1]
  if (last.i === target.i && last.j === target.j && isFreePoint(grid, to)) {
    points[points.length - 1] = to
  }

  return smoothPath(grid, [from, ...points])
}
