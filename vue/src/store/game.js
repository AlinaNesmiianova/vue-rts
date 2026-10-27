// состояние игры: карта, объекты, выбор персонажа, камера и приказы
// компоненты читают геттеры и вызывают действия

import { cameraMatrix, createCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '@/game/camera'
import { containsPoint, createSquareMap } from '@/game/map'
import { canAttack, createStartEntities, isBuilding, isUnit } from '@/game/entities'
import { advanceBattle } from '@/game/combat'

const MAP_SIZE = 120 // карта 120 на 120
const byDepth = (a, b) => a.x + a.y - (b.x + b.y)

export const MUTATIONS = {
  SET_VIEWPORT: 'SET_VIEWPORT',
  SET_CAMERA: 'SET_CAMERA',
  SET_SELECTED: 'SET_SELECTED',
  SET_TARGET: 'SET_TARGET',
  SET_ATTACK_TARGET: 'SET_ATTACK_TARGET',
  REMOVE_ENTITY: 'REMOVE_ENTITY',
  TICK: 'TICK',
}

export default {
  namespaced: true,
  state: () => ({
    map: createSquareMap(MAP_SIZE),
    entities: createStartEntities(),
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
    [MUTATIONS.SET_TARGET]: (state, { id, target }) => {
      const unit = state.entities.find((e) => e.id === id)
      if (!unit || !isUnit(unit)) return

      unit.target = target
      unit.attackTargetId = null
      unit.attackCooldown = 0
    },
    [MUTATIONS.SET_ATTACK_TARGET]: (state, { id, targetId }) => {
      const unit = state.entities.find((e) => e.id === id)
      const enemy = state.entities.find((e) => e.id === targetId)
      if (!canAttack(unit, enemy)) return

      unit.target = null
      unit.attackTargetId = targetId
      unit.attackCooldown = 0
    },
    [MUTATIONS.REMOVE_ENTITY]: (state, id) => {
      state.entities = state.entities.filter((e) => e.id !== id)
      state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id)
      state.entities.filter(isUnit).forEach((unit) => {
        if (unit.attackTargetId === id) {
          unit.attackTargetId = null
          unit.attackCooldown = 0
        }
      })
    },
    // один кадр: движение, удары, удаление погибших
    [MUTATIONS.TICK]: (state, dt) => {
      state.entities = advanceBattle(state.entities, dt)
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

    moveSelected: ({ commit, state, getters }, screenPoint) => {
      const target = screenToWorld(state.camera, state.viewport, screenPoint)
      if (!containsPoint(state.map, target)) return

      // приказы получают юниты любой команды, но не здания
      const units = getters.getSelected.filter(isUnit)
      units.forEach((unit) => {
        commit(MUTATIONS.SET_TARGET, { id: unit.id, target: { ...target } })
      })
    },

    attackSelected: ({ commit, state, getters }, targetId) => {
      const enemy = state.entities.find((entity) => entity.id === targetId)
      // проверка команд единая для красных и синих
      const units = getters.getSelected.filter((unit) => canAttack(unit, enemy))
      units.forEach((unit) => {
        commit(MUTATIONS.SET_ATTACK_TARGET, { id: unit.id, targetId })
      })
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
