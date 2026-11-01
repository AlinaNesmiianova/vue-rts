// Все элементы карты, очередь событий и состояние партии хранятся во Vuex.
// Компоненты отображают готовое состояние, а TICK применяет события кадра.

import { cameraMatrix, createCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '../game/camera.js'
import { containsPoint, createSquareMap } from '../game/map.js'
import { canAttack, isBuilding, isUnit } from '../game/entities.js'
import { addOrders, ORDER_TYPES } from '../game/events.js'
import { advanceFrame } from '../game/frame.js'
import { createScenario } from '../game/scenarios.js'
import { getGameResult, remainingGroups } from '../game/result.js'

const MAP_SIZE = 120
const byDepth = (a, b) => a.x + a.y - (b.x + b.y)

export const PHASES = { READY: 'ready', RUNNING: 'running', PAUSED: 'paused', FINISHED: 'finished' }

export const MUTATIONS = {
  SET_VIEWPORT: 'SET_VIEWPORT',
  SET_CAMERA: 'SET_CAMERA',
  SET_SELECTED: 'SET_SELECTED',
  ADD_ORDERS: 'ADD_ORDERS',
  REMOVE_ENTITY: 'REMOVE_ENTITY',
  LOAD_SCENARIO: 'LOAD_SCENARIO',
  SET_PHASE: 'SET_PHASE',
  TICK: 'TICK',
}

// Если была уничтожена последняя сущность предпоследней группы, игра окончена.
const finishIfNeeded = (state) => {
  const result = getGameResult(state.entities)
  if (!result.finished) return
  state.phase = PHASES.FINISHED
  state.winnerGroupId = result.winnerGroupId
  state.events = []
}

export default {
  namespaced: true,
  state: () => ({
    map: createSquareMap(MAP_SIZE),
    ...createScenario(), // группы, все объекты карты и подготовленные очереди
    phase: PHASES.READY,
    winnerGroupId: null,
    elapsedSeconds: 0,
    selectedIds: [],
    camera: createCamera(),
    viewport: { width: 0, height: 0 },
  }),
  getters: {
    getMap: (state) => state.map,
    getUnits: (state) => state.entities.filter(isUnit).sort(byDepth),
    getBuildings: (state) => state.entities.filter(isBuilding).sort(byDepth),
    getSelected: (state) => state.entities.filter((entity) => state.selectedIds.includes(entity.id)),
    isSelected: (state) => (id) => state.selectedIds.includes(id),
    getUnitEvents: (state) => (id) => state.events.filter((event) => event.unitId === id),
    getGroup: (state) => (id) => state.groups.find((group) => group.id === id),
    getRemainingGroups: (state) => remainingGroups(state.entities),
    getCameraMatrix: (state) => cameraMatrix(state.camera, state.viewport),
    toScreen: (state) => (point) => worldToScreen(state.camera, state.viewport, point),
  },
  mutations: {
    [MUTATIONS.SET_VIEWPORT]: (state, viewport) => {
      state.viewport = viewport
    },
    [MUTATIONS.SET_CAMERA]: (state, camera) => {
      state.camera = camera
    },
    [MUTATIONS.SET_SELECTED]: (state, ids) => {
      state.selectedIds = ids
    },
    [MUTATIONS.ADD_ORDERS]: (state, { unitIds, order, append }) => {
      const next = addOrders(state.events, state.nextEventId, unitIds, order, append)
      state.events = next.events
      state.nextEventId = next.nextEventId
    },
    [MUTATIONS.REMOVE_ENTITY]: (state, id) => {
      state.entities = state.entities.filter((entity) => entity.id !== id)
      state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id)
      state.events = state.events.filter((event) => event.unitId !== id)
      finishIfNeeded(state)
    },
    [MUTATIONS.LOAD_SCENARIO]: (state, scenarioId) => {
      Object.assign(state, createScenario(scenarioId), {
        phase: PHASES.READY,
        winnerGroupId: null,
        elapsedSeconds: 0,
        selectedIds: [],
        camera: createCamera(),
      })
    },
    [MUTATIONS.SET_PHASE]: (state, phase) => {
      state.phase = phase
    },
    [MUTATIONS.TICK]: (state, dt) => {
      if (state.phase !== PHASES.RUNNING || !Number.isFinite(dt) || dt <= 0) return
      const next = advanceFrame(state.entities, state.events, dt)
      state.entities = next.entities
      state.events = next.events
      state.elapsedSeconds += dt
      const aliveIds = new Set(state.entities.map((entity) => entity.id))
      state.selectedIds = state.selectedIds.filter((id) => aliveIds.has(id))
      finishIfNeeded(state)
    },
  },
  actions: {
    setViewport: ({ commit }, viewport) => {
      commit(MUTATIONS.SET_VIEWPORT, viewport)
    },
    panCamera: ({ commit, state }, delta) => {
      commit(MUTATIONS.SET_CAMERA, panCamera(state.camera, state.viewport, delta, state.map.bounds))
    },
    zoomCamera: ({ commit, state }, zoom) => {
      commit(MUTATIONS.SET_CAMERA, zoomCamera(state.camera, state.viewport, zoom, state.map.bounds))
    },
    select: ({ commit, state }, id) => {
      const exists = state.entities.some((entity) => entity.id === id)
      commit(MUTATIONS.SET_SELECTED, id !== null && exists ? [id] : [])
    },
    moveSelected: ({ commit, state, getters }, { point, append = false }) => {
      if (state.phase === PHASES.FINISHED) return
      const target = screenToWorld(state.camera, state.viewport, point)
      if (!containsPoint(state.map, target)) return
      const unitIds = getters.getSelected.filter(isUnit).map((unit) => unit.id)
      if (unitIds.length) commit(MUTATIONS.ADD_ORDERS, { unitIds, order: { type: ORDER_TYPES.MOVE, target }, append })
    },
    attackSelected: ({ commit, state, getters }, { targetId, append = false }) => {
      if (state.phase === PHASES.FINISHED) return
      const enemy = state.entities.find((entity) => entity.id === targetId)
      // Единственная проверка враждебности — разные идентификаторы групп.
      const unitIds = getters.getSelected.filter((unit) => canAttack(unit, enemy)).map((unit) => unit.id)
      if (unitIds.length) commit(MUTATIONS.ADD_ORDERS, { unitIds, order: { type: ORDER_TYPES.ATTACK, targetId }, append })
    },
    selfDestruct: ({ commit, state }, id) => {
      if (state.phase === PHASES.FINISHED) return
      const entity = state.entities.find((item) => item.id === id)
      if (entity && isUnit(entity)) commit(MUTATIONS.REMOVE_ENTITY, id)
    },
    loadScenario: ({ commit }, scenarioId) => {
      commit(MUTATIONS.LOAD_SCENARIO, scenarioId)
    },
    start: ({ commit, state }) => {
      if ([PHASES.READY, PHASES.PAUSED].includes(state.phase)) commit(MUTATIONS.SET_PHASE, PHASES.RUNNING)
    },
    pause: ({ commit, state }) => {
      if (state.phase === PHASES.RUNNING) commit(MUTATIONS.SET_PHASE, PHASES.PAUSED)
    },
    togglePause: ({ dispatch, state }) => {
      if (state.phase === PHASES.RUNNING) dispatch('pause')
      else dispatch('start')
    },
    tick: ({ commit }, dt) => {
      commit(MUTATIONS.TICK, dt)
    },
  },
}
