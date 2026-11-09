import test from 'node:test'
import assert from 'node:assert/strict'
import game, { MUTATIONS, PHASES } from '../store/game.js'

const createTestStore = (scenarioId = 'duel') => {
  const state = game.state()
  if (scenarioId !== state.scenarioId) game.mutations[MUTATIONS.LOAD_SCENARIO](state, scenarioId)
  const commit = (name, payload) => game.mutations[name](state, payload)
  const dispatch = (name, payload) => game.actions[name]({ state, commit, dispatch }, payload)
  return { state, commit, dispatch }
}

test('до старта и на паузе кадры не изменяют игру, после продолжения работают', () => {
  const { state, commit, dispatch } = createTestStore()
  const initialEntities = JSON.stringify(state.entities)
  const initialEvents = JSON.stringify(state.events)
  assert.equal(state.phase, PHASES.READY)
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(JSON.stringify(state.entities), initialEntities)
  assert.equal(JSON.stringify(state.events), initialEvents)
  dispatch('start')
  assert.equal(state.phase, PHASES.RUNNING)
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(state.elapsedSeconds, 0.1)
  assert.notEqual(JSON.stringify(state.entities), initialEntities)
  dispatch('pause')
  const snapshot = JSON.stringify({ entities: state.entities, events: state.events, elapsed: state.elapsedSeconds })
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(JSON.stringify({ entities: state.entities, events: state.events, elapsed: state.elapsedSeconds }), snapshot)
  dispatch('togglePause')
  assert.equal(state.phase, PHASES.RUNNING)
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(state.elapsedSeconds, 0.2)
})

test('на паузе можно подготовить маршрут и последовательные команды, но нельзя атаковать свою группу', () => {
  const { state, commit, dispatch } = createTestStore('triangle')
  const unit = state.entities.find((entity) => entity.kind === 'unit' && entity.groupId === 'group3')
  const enemy = state.entities.find((entity) => entity.groupId === 'group2')
  const ally = state.entities.find((entity) => entity.groupId === 'group3' && entity.id !== unit.id)
  commit(MUTATIONS.SET_SELECTED, [unit.id])
  const getters = { getSelected: game.getters.getSelected(state) }
  const context = { state, getters, commit }
  game.actions.attackSelected(context, { targetId: ally.id })
  assert.equal(state.events.some((event) => event.unitId === unit.id && event.targetId === ally.id), false)
  game.actions.attackSelected(context, { targetId: enemy.id })
  assert.deepEqual(state.events.filter((event) => event.unitId === unit.id).map((event) => event.targetId), [enemy.id])
  game.actions.attackSelected(context, { targetId: state.entities.find((item) => item.groupId === 'group1').id, append: true })
  const orders = state.events.filter((event) => event.unitId === unit.id)
  assert.equal(orders.length, 2)
  assert.equal(orders[0].nextId, orders[1].id)
  assert.equal(state.phase, PHASES.READY)
  dispatch('start')
  dispatch('pause')
  assert.equal(state.phase, PHASES.PAUSED)
})

test('когда уцелели здания и юниты только одной группы, партия завершается и не перезапускается сама', () => {
  const { state, commit, dispatch } = createTestStore('triangle')
  dispatch('start')
  const last = state.entities.filter((entity) => entity.groupId === 'group3')
  state.entities = [...last, state.entities.find((entity) => entity.groupId === 'group2')]
  const enemyId = state.entities.at(-1).id
  commit(MUTATIONS.REMOVE_ENTITY, enemyId)
  assert.equal(state.phase, PHASES.FINISHED)
  assert.equal(state.winnerGroupId, 'group3')
  assert.equal(state.events.length, 0)
  const snapshot = JSON.stringify(state.entities)
  commit(MUTATIONS.TICK, 0.1)
  dispatch('start')
  assert.equal(JSON.stringify(state.entities), snapshot)
  assert.equal(state.phase, PHASES.FINISHED)
  dispatch('loadScenario', 'four')
  assert.equal(state.phase, PHASES.READY)
  assert.equal(state.winnerGroupId, null)
  assert.equal(state.groups.length, 4)
  assert.equal(state.elapsedSeconds, 0)
})

test('готовый сценарий автоматически доигрывается до победителя', () => {
  const { state, commit, dispatch } = createTestStore('duel')
  dispatch('start')
  for (let i = 0; i < 1200 && state.phase !== PHASES.FINISHED; i++) {
    commit(MUTATIONS.TICK, 0.1)
  }
  assert.equal(state.phase, PHASES.FINISHED)
  assert.ok(state.winnerGroupId)
  assert.equal(new Set(state.entities.map((entity) => entity.groupId)).size, 1)
  assert.ok(state.entities.every((entity) => entity.groupId === state.winnerGroupId))
})
