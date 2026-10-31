// состояние игры: карта, объекты, выбор персонажа-юнита, камера
// компоненты только читают геттеры и вызывают действия

import { cameraMatrix, createCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '@/game/camera'
import { containsPoint, createSquareMap } from '@/game/map'
import { createBuilding, createStartEntities, isBuilding, isUnit, stepToTarget, typeOf } from '@/game/entities'
import { findPath } from '@/game/pathfinding'
import { canPlaceBuilding, snapToGrid } from '@/game/placement'

const MAP_SIZE = 120 // карта 120 на 120

const byDepth = (a, b) => a.x + a.y - (b.x + b.y)

// путь персонажа до точки в обход зданий
const routeUnit = (commit, state, unit, to) => {
  const path = findPath(state.map, state.entities, unit, to, typeOf(unit).size / 2)
  commit(MUTATIONS.SET_PATH, { id: unit.id, path })
}

export const MUTATIONS = {
  SET_VIEWPORT: 'SET_VIEWPORT',
  SET_CAMERA: 'SET_CAMERA',
  SET_SELECTED: 'SET_SELECTED',
  SET_PATH: 'SET_PATH',
  TICK: 'TICK',
  ADD_ENTITY: 'ADD_ENTITY',
  SET_PLACEMENT: 'SET_PLACEMENT',
}

export default {
  namespaced: true,
  state: () => ({
    map: createSquareMap(MAP_SIZE),
    entities: createStartEntities(),
    selectedIds: [], // массив, чтобы потом добавить выделение нескольких
    camera: createCamera(),
    viewport: { width: 0, height: 0 },
    placement: null, // стройка: { type, x, y }, пока игрок выбирает место; x, y = null - курсор еще не на поле
  }),
  getters: {
    getMap: (state) => state.map,
    getUnits: (state) => state.entities.filter(isUnit).sort(byDepth),
    getBuildings: (state) => state.entities.filter(isBuilding).sort(byDepth),
    getSelected: (state) => state.entities.filter((e) => state.selectedIds.includes(e.id)),
    isSelected: (state) => (id) => state.selectedIds.includes(id),
    getCameraMatrix: (state) => cameraMatrix(state.camera, state.viewport),
    toScreen: (state) => (point) => worldToScreen(state.camera, state.viewport, point),
    getPlacement: (state) => state.placement,
    isPlacementValid: (state) => {
      const placement = state.placement
      if (!placement || placement.x === null) {
        return false
      }
      return canPlaceBuilding(state.map, state.entities, placement.type, placement)
    },
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
    // первая точка пути - текущая цель, остальные ждут очереди
    [MUTATIONS.SET_PATH]: (state, { id, path }) => {
      const unit = state.entities.find((e) => e.id === id)
      unit.target = path[0] ?? null
      unit.path = path.slice(1)
    },
    // один кадр: каждый идущий персонаж делает шаг к цели
    [MUTATIONS.TICK]: (state, dt) => {
      const movingUnits = state.entities.filter((e) => isUnit(e) && e.target)
      movingUnits.forEach((unit) => {
        Object.assign(unit, stepToTarget(unit, dt))
      })
    },
    [MUTATIONS.ADD_ENTITY]: (state, entity) => {
      state.entities = [...state.entities, entity]
    },
    [MUTATIONS.SET_PLACEMENT]: (state, placement) => {
      state.placement = placement
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

    select: ({ commit }, id) => {
      const ids = id === null ? [] : [id]
      commit(MUTATIONS.SET_SELECTED, ids)
    },

    moveSelected: ({ commit, state, getters }, screenPoint) => {
      const target = screenToWorld(state.camera, state.viewport, screenPoint)
      if (!containsPoint(state.map, target)) {
        return
      }

      const units = getters.getSelected.filter(isUnit)
      units.forEach((unit) => {
        routeUnit(commit, state, unit, target)
      })
    },

    tick: ({ commit }, dt) => {
      commit(MUTATIONS.TICK, dt)
    },

    // нажали кнопку здания: начинаем стройку, а если это здание уже строим - отменяем
    startPlacement: ({ commit, state }, type) => {
      if (state.placement?.type === type) {
        commit(MUTATIONS.SET_PLACEMENT, null)
        return
      }

      commit(MUTATIONS.SET_PLACEMENT, { type, x: null, y: null })
    },

    // курсор двигается: здание едет за ним, прижимаясь к клеткам
    movePlacement: ({ commit, state }, screenPoint) => {
      const point = screenToWorld(state.camera, state.viewport, screenPoint)
      const cell = snapToGrid(state.placement.type, point)
      commit(MUTATIONS.SET_PLACEMENT, { ...state.placement, ...cell })
    },

    cancelPlacement: ({ commit }) => {
      commit(MUTATIONS.SET_PLACEMENT, null)
    },

    // ставим здание, если место свободно; keep - не выходить из стройки (shift)
    placeBuilding: ({ commit, state, getters }, { keep = false } = {}) => {
      if (!getters.isPlacementValid) {
        return
      }

      const { type, x, y } = state.placement
      commit(MUTATIONS.ADD_ENTITY, createBuilding(type, x, y))

      // новое здание могло встать поперек чьего-то пути - идущие ищут новый путь к той же точке
      const movingUnits = state.entities.filter((e) => isUnit(e) && e.target)
      movingUnits.forEach((unit) => {
        const finish = unit.path[unit.path.length - 1] ?? unit.target
        routeUnit(commit, state, unit, finish)
      })

      if (!keep) {
        commit(MUTATIONS.SET_PLACEMENT, null)
      }
    },
  },
}
