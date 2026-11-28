import { clamp } from './camera.js'
import { distanceToTarget } from './combat.js'
import { isBuilding, isObstacle, nearestStorage, typeOf } from './entities.js'
import { advanceUnit, routeUnit } from './pathfinding.js'

const REACH = 0.65 // от края рабочего до объекта
const EPSILON = 1e-9

const stop = (worker) => {
  worker.target = null
  worker.path = []
}

// без карты идем прямо к ближайшей точке стены или к центру ресурса
const walkStraight = (worker, destination, dt, distanceToWalk) => {
  const { x, y } = destination
  const half = typeOf(destination).size / 2
  const point = isBuilding(destination) ? {
    x: clamp(worker.x, x - half, x + half),
    y: clamp(worker.y, y - half, y + half),
  } : destination
  const dx = point.x - worker.x
  const dy = point.y - worker.y
  const length = Math.hypot(dx, dy)
  const { speed } = typeOf(worker)
  const timeSpent = Math.min(dt, distanceToWalk / speed)
  const step = speed * timeSpent
  worker.x += dx / length * step
  worker.y += dy / length * step
  return dt - timeSpent
}

const followRoute = (map, entities, worker, destination, dt, reached) => {
  const obstacles = entities.filter(isObstacle)
  if (!worker.target && !worker.repathDelay) {
    routeUnit(map, obstacles, worker, destination, [], reached)
  }
  const { x, y } = worker
  const timeLeft = advanceUnit(map, obstacles, worker, dt)
  const stayedInPlace = worker.x === x && worker.y === y
  // если путь перекрыли, следующая попытка ищет любую свободную точку у объекта
  if (stayedInPlace && worker.target && timeLeft === 0) stop(worker)
  return timeLeft
}

// остаток времени после подхода; null - рабочий еще не дошел
const approach = (map, entities, worker, destination, dt, reach) => {
  if (worker.gatherDestinationId !== destination.id) {
    stop(worker)
    worker.repathDelay = 0
    worker.gatherDestinationId = destination.id
  }

  const distance = (point) => distanceToTarget(point, destination)
  const reached = (point) => distance(point) <= reach + EPSILON
  let timeLeft = dt
  if (!reached(worker)) {
    timeLeft = map
      ? followRoute(map, entities, worker, destination, dt, reached)
      : walkStraight(worker, destination, dt, distance(worker) - reach)
  }
  if (!reached(worker)) return null
  stop(worker)
  return timeLeft
}

const needsDelivery = (cargo, source, carryCapacity) => {
  if (!cargo) return false
  if (!source || cargo.amount >= carryCapacity) return true
  return cargo.type !== source.type
}

// пока можно добывать, сохраняем долю секунды для следующего кадра
const gatherAtSource = (worker, order, source, dt) => {
  const { gatherRate, carryCapacity } = typeOf(worker)
  const workTime = (order.gatherTime ?? 0) + dt
  const carried = worker.cargo?.amount ?? 0
  const freeSpace = carryCapacity - carried
  const readyToGather = Math.floor(workTime * gatherRate + EPSILON)
  const gathered = Math.min(readyToGather, freeSpace, source.amount)

  if (gathered > 0) {
    source.amount -= gathered
    worker.cargo = { type: source.type, amount: carried + gathered }
  }

  const timeLeft = Math.max(0, workTime - gathered / gatherRate)
  if (source.amount > 0 && gathered < freeSpace) {
    order.gatherTime = timeLeft
    return 0
  }

  order.gatherTime = 0
  return timeLeft
}

// один приказ: добываем целыми единицами, сдаем груз и возвращаемся, пока есть запас
export const advanceGathering = ({ map, entities, worker, order, resource, dt, deliveries }) => {
  const { carryCapacity, size } = typeOf(worker)
  const reach = REACH + size / 2
  let timeLeft = dt

  while (timeLeft > 0) {
    const source = resource?.amount > 0 ? resource : null
    const cargo = worker.cargo
    if (!source && !cargo) return true

    const deliverCargo = needsDelivery(cargo, source, carryCapacity)
    const destination = deliverCargo ? nearestStorage(entities, worker.groupId, worker) : source
    if (!destination) {
      stop(worker)
      worker.gatherDestinationId = null
      return false
    }

    timeLeft = approach(map, entities, worker, destination, timeLeft, reach)
    if (timeLeft === null) return false

    if (deliverCargo) {
      deliveries.push({ groupId: worker.groupId, ...cargo })
      worker.cargo = null
      if (!source) return true
      continue
    }

    timeLeft = gatherAtSource(worker, order, source, timeLeft)
  }

  return false
}
