import test from 'node:test'
import assert from 'node:assert/strict'
import { createBuilding, createUnit, TEAMS } from './entities.js'
import { addOrders, ORDER_TYPES } from './events.js'
import { advanceFrame } from './frame.js'

const move = (x, y) => ({ type: ORDER_TYPES.MOVE, target: { x, y } })

test('обычный приказ заменяет маршрут, Shift добавляет событие со связью nextId', () => {
  const unit = createUnit('fast', 0, 0)
  const first = addOrders([], 1, [unit.id], move(1, 0))
  const second = addOrders(first.events, first.nextEventId, [unit.id], move(2, 0), true)
  assert.equal(second.events.length, 2)
  assert.equal(second.events[0].nextId, second.events[1].id)
  assert.equal(second.events[1].nextId, null)

  const replacement = addOrders(second.events, second.nextEventId, [unit.id], move(3, 0))
  assert.equal(replacement.events.length, 1)
  assert.deepEqual(replacement.events[0].target, { x: 3, y: 0 })
  assert.equal(replacement.events[0].nextId, null)
})

test('при достижении первой точки юнит без остановки переходит ко второй', () => {
  const unit = createUnit('fast', 0, 0)
  const first = addOrders([], 1, [unit.id], move(1, 0))
  const second = addOrders(first.events, first.nextEventId, [unit.id], move(3, 0), true)
  const before = JSON.stringify({ unit, events: second.events })

  const frame = advanceFrame([unit], second.events, 0.5) // fast: 3 клетки/сек
  assert.ok(Math.abs(frame.entities[0].x - 1.5) < 1e-9)
  assert.equal(frame.events.length, 1)
  assert.equal(frame.events[0].id, second.events[1].id)
  assert.deepEqual(frame.entities[0].target, { x: 3, y: 0 })
  assert.equal(JSON.stringify({ unit, events: second.events }), before) // чистый пересчёт кадра

  const finished = advanceFrame(frame.entities, frame.events, 0.5)
  assert.equal(finished.entities[0].x, 3)
  assert.equal(finished.entities[0].target, null)
  assert.deepEqual(finished.events, [])
})

test('разные юниты выполняют собственные очереди, не мешая друг другу', () => {
  const first = createUnit('fast', 0, 0)
  const second = createUnit('slow', 0, 2)
  let queue = addOrders([], 1, [first.id, second.id], move(1, 0))
  queue = addOrders(queue.events, queue.nextEventId, [first.id], move(4, 0), true)
  const frame = advanceFrame([first, second], queue.events, 1)

  assert.equal(frame.entities[0].x, 3)
  assert.ok(frame.entities[1].x > 0)
  assert.equal(frame.events.filter((event) => event.unitId === first.id).length, 1)
  assert.equal(frame.events.filter((event) => event.unitId === second.id).length, 1)
})

test('атака после перемещения запускается только после достижения точки', () => {
  const unit = createUnit('fast', 0, 0)
  const enemy = createBuilding('house', 5, 0, TEAMS.ENEMY)
  let queue = addOrders([], 1, [unit.id], move(2, 0))
  queue = addOrders(queue.events, queue.nextEventId, [unit.id], { type: ORDER_TYPES.ATTACK, targetId: enemy.id }, true)

  const first = advanceFrame([unit, enemy], queue.events, 0.5)
  assert.equal(first.entities[1].hp, enemy.hp)
  assert.equal(first.entities[0].attackTargetId, null)

  const second = advanceFrame(first.entities, first.events, 0.5)
  assert.equal(second.entities[0].x, 2)
  assert.equal(second.entities[0].attackTargetId, enemy.id)
  assert.equal(second.entities[1].hp, enemy.hp)
  const third = advanceFrame(second.entities, second.events, 1)
  assert.ok(third.entities[0].x > 2)
})

test('исчезнувшая цель не блокирует следующий приказ', () => {
  const unit = createUnit('fast', 0, 0)
  const enemy = createUnit('slow', 1, 0, TEAMS.ENEMY)
  let queue = addOrders([], 1, [unit.id], { type: ORDER_TYPES.ATTACK, targetId: enemy.id })
  queue = addOrders(queue.events, queue.nextEventId, [unit.id], move(2, 0), true)

  const frame = advanceFrame([unit], queue.events, 0.5)
  assert.equal(frame.events.length, 1)
  assert.equal(frame.events[0].type, ORDER_TYPES.MOVE)
  assert.equal(frame.entities[0].x, 1.5)
})

test('при смерти персонажа из стора событий исчезают все его будущие приказы', () => {
  const unit = createUnit('fast', 0, 0)
  let queue = addOrders([], 1, [unit.id], move(1, 0))
  queue = addOrders(queue.events, queue.nextEventId, [unit.id], move(2, 0), true)
  assert.deepEqual(advanceFrame([], queue.events, 0.1).events, [])
})
