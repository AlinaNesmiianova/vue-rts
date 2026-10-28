// Состояние игры: все элементы карты, очередь событий, выбор и камера.
// Каждый кадр применяет события к карте; компоненты только отображают результат.

import { cameraMatrix, createCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '@/game/camera'
import { containsPoint, createSquareMap } from '@/game/map'
import { canAttack, createStartEntities, isBuilding, isUnit } from '@/game/entities'
import { addOrders, ORDER_TYPES } from '@/game/events'
import { advanceFrame } from '@/game/frame'

const MAP_SIZE = 120 // карта 120 на 120
const byDepth = (a, b) => a.x + a.y - (b.x + b.y)

export const MUTATIONS = {
  SET_VIEWPORT: 'SET_VIEWPORT',
  SET_CAMERA: 'SET_CAMERA',
  SET_SELECTED: 'SET_SELECTED',
  ADD_ORDERS: 'ADD_ORDERS',
  REMOVE_ENTITY: 'REMOVE_ENTITY',
  TICK: 'TICK',
}

export default {
  namespaced: true,
  state: () => ({
    map: createSquareMap(MAP_SIZE),
    entities: createStartEntities(), // отдельное хранилище всех объектов карты
    events: [], // текущие и ожидающие события; первые для каждого юнита активны
    nextEventId: 1,
    selectedIds: [], // массив, чтобы потом добавить выделение нескольких
    camera: createCamera(),
    viewport: { width: 0, height: 0 },
  }),
  getters: {
    getMap: (state) => state.map,
    getUnits: (state) => state.entities.filter(isUnit).sort(byDepth),
    getBuildings: (state) => state.entities.filter(isBuilding).sort(byDepth),
    getSelected: (state) => state.entities.filter((e) => state.selectedIds.includes(e.id)),
    isSelected: (state) => (id) => state.selectedIds.includes(id),
    getUnitEvents: (state) => (id) => state.events.filter((event) => event.unitId === id),
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
    },
    // один кадр: применение событий, движение, удары, удаление погибших
    [MUTATIONS.TICK]: (state, dt) => {
      const next = advanceFrame(state.entities, state.events, dt)
      state.entities = next.entities
      state.events = next.events
      const aliveIds = new Set(state.entities.map((entity) => entity.id))
      state.selectedIds = state.selectedIds.filter((id) => aliveIds.has(id))
    },
  },
  actions: {
    setViewport: ({ commit }, viewport) => {
      commit(MUTATIONS.SET_VIEWPORT, viewport)
    },

    panCamera: ({ commit, state }, delta) => {
      const camera = panCamera(state.camera, state.viewport, delta, state.map.bounds)
      commit(MUTATIONS.SET_CAMERA, camera)
    },

    zoomCamera: ({ commit, state }, zoom) => {
      const camera = zoomCamera(state.camera, state.viewport, zoom, state.map.bounds)
      commit(MUTATIONS.SET_CAMERA, camera)
    },

    select: ({ commit, state }, id) => {
      const exists = state.entities.some((entity) => entity.id === id)
      commit(MUTATIONS.SET_SELECTED, id !== null && exists ? [id] : [])
    },

    moveSelected: ({ commit, state, getters }, { point, append = false }) => {
      const target = screenToWorld(state.camera, state.viewport, point)
      if (!containsPoint(state.map, target)) return

      // приказы получают юниты любой команды, но не здания
      const unitIds = getters.getSelected.filter(isUnit).map((unit) => unit.id)
      if (unitIds.length) commit(MUTATIONS.ADD_ORDERS, { unitIds, order: { type: ORDER_TYPES.MOVE, target }, append })
    },

    attackSelected: ({ commit, state, getters }, { targetId, append = false }) => {
      const enemy = state.entities.find((entity) => entity.id === targetId)
      // проверка команд единая для красных и синих
      const unitIds = getters.getSelected.filter((unit) => canAttack(unit, enemy)).map((unit) => unit.id)
      if (unitIds.length) commit(MUTATIONS.ADD_ORDERS, { unitIds, order: { type: ORDER_TYPES.ATTACK, targetId }, append })
    },

    selfDestruct: ({ commit, state }, id) => {
      const unit = state.entities.find((entity) => entity.id === id)
      if (unit && isUnit(unit)) commit(MUTATIONS.REMOVE_ENTITY, id)
    },

    tick: ({ commit }, dt) => {
      commit(MUTATIONS.TICK, dt)
    },
  },
}
