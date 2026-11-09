// Все элементы карты, очередь событий и состояние партии хранятся во Vuex.
// Компоненты отображают готовое состояние, а TICK применяет события кадра.

<<<<<<< HEAD
import { cameraMatrix, createCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '@/game/camera'
import { containsPoint, createSquareMap } from '@/game/map'
import { BUILDING_TYPES, createBuilding, createStartEntities, createUnit, isBuilding, isUnit, stepToTarget, typeOf, UNIT_TYPES } from '@/game/entities'
import { findPath } from '@/game/pathfinding'
import { canPlaceBuilding, canUseUnitTerrain, isSegmentClear, shipyardDirection, snapToGrid } from '@/game/placement'
import { assignSlots, formationSlots, insideRect, toggleId, toRect } from '@/game/selection'
import { findSpawnPoint } from '@/game/spawn'

const MAP_SIZE = 120 // карта 120 на 120
const REPATH_DELAY = 0.5 // между попытками обойти движущееся препятствие, в секундах
=======
import { cameraMatrix, createCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '../game/camera.js'
import { containsPoint, createSquareMap } from '../game/map.js'
import { canAttack, isBuilding, isUnit } from '../game/entities.js'
import { addOrders, ORDER_TYPES } from '../game/events.js'
import { advanceFrame } from '../game/frame.js'
import { createScenario } from '../game/scenarios.js'
import { getGameResult, remainingGroups } from '../game/result.js'
>>>>>>> temp/three-commits

const MAP_SIZE = 120
const byDepth = (a, b) => a.x + a.y - (b.x + b.y)

<<<<<<< HEAD
// путь персонажа до точки в обход объектов
const routeUnit = (commit, state, unit, to, groupIds = []) => {
  const obstacles = state.entities.filter((entity) => !groupIds.includes(entity.id) || entity.id === unit.id)
  const path = findPath(state.map, obstacles, unit, to, typeOf(unit).size / 2)
  commit(MUTATIONS.SET_PATH, { id: unit.id, path })
}
=======
export const PHASES = { READY: 'ready', RUNNING: 'running', PAUSED: 'paused', FINISHED: 'finished' }
>>>>>>> temp/three-commits

export const MUTATIONS = {
  SET_VIEWPORT: 'SET_VIEWPORT',
  SET_CAMERA: 'SET_CAMERA',
  SET_SELECTED: 'SET_SELECTED',
<<<<<<< HEAD
  SET_PATH: 'SET_PATH',
=======
  ADD_ORDERS: 'ADD_ORDERS',
  REMOVE_ENTITY: 'REMOVE_ENTITY',
  LOAD_SCENARIO: 'LOAD_SCENARIO',
  SET_PHASE: 'SET_PHASE',
>>>>>>> temp/three-commits
  TICK: 'TICK',
  ADD_ENTITY: 'ADD_ENTITY',
  SET_PLACEMENT: 'SET_PLACEMENT',
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
    placement: null, // стройка: { type, x, y }, пока игрок выбирает место; x, y = null - курсор еще не на поле
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
<<<<<<< HEAD
    // первая точка пути - текущая цель, остальные ждут очереди
    [MUTATIONS.SET_PATH]: (state, { id, path }) => {
      const unit = state.entities.find((e) => e.id === id)
      unit.target = path[0] ?? null
      unit.path = path.slice(1)
      unit.repathDelay = 0
    },
    // один кадр: каждый идущий персонаж делает шаг к цели
    [MUTATIONS.TICK]: (state, dt) => {
      const movingUnits = state.entities.filter((e) => isUnit(e) && e.target)
      movingUnits.forEach((unit) => {
        unit.repathDelay = Math.max(0, unit.repathDelay - dt)
        const next = stepToTarget(unit, dt)
        const type = typeOf(unit)
        const clear = state.entities.every((entity) => entity.id === unit.id || isSegmentClear(unit, next, type.size / 2, entity, type))
        if (clear && canUseUnitTerrain(state.map, state.entities, type, next)) {
          Object.assign(unit, next)
        } else if (!clear && !unit.repathDelay) {
          unit.repathDelay = REPATH_DELAY
          // объект мог появиться или переместиться на пути - обходим его с текущей позиции
          const finish = unit.path[unit.path.length - 1] ?? unit.target
          const path = findPath(state.map, state.entities, unit, finish, type.size / 2)
          // неполный обход не заменяет цель: в плотной группе ждем, пока соседи пройдут
          const last = path[path.length - 1]
          if (last && Math.hypot(last.x - finish.x, last.y - finish.y) < 1e-9) {
            unit.target = path[0]
            unit.path = path.slice(1)
          }
        }
      })
    },
    [MUTATIONS.ADD_ENTITY]: (state, entity) => {
      state.entities = [...state.entities, entity]
    },
    [MUTATIONS.SET_PLACEMENT]: (state, placement) => {
      state.placement = placement
=======
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
>>>>>>> temp/three-commits
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
<<<<<<< HEAD

    // shift + клик: добавить объект к выбору или убрать из него
    toggleSelected: ({ commit, state }, id) => {
      commit(MUTATIONS.SET_SELECTED, toggleId(state.selectedIds, id))
    },

    // рамка (углы в точках экрана): выбираем персонажей внутри; add (shift) - к уже выбранным
    selectArea: ({ commit, state }, { from, to, add }) => {
      const rect = toRect(from, to)
      const ids = state.entities
        .filter((e) => isUnit(e) && insideRect(rect, worldToScreen(state.camera, state.viewport, e)))
        .map((e) => e.id)
      const selected = add ? [...new Set([...state.selectedIds, ...ids])] : ids
      commit(MUTATIONS.SET_SELECTED, selected)
    },

    // все выбранные персонажи идут к точке и встают вокруг нее строем, а не друг в друга
    moveSelected: ({ commit, state, getters }, screenPoint) => {
      const target = screenToWorld(state.camera, state.viewport, screenPoint)
      if (!containsPoint(state.map, target)) {
        return
      }

      const units = getters.getSelected.filter(isUnit)
      if (!units.length) {
        return
      }
      // сухопутные и водные персонажи получают места только на своей местности
      const groupKey = (unit) => `${typeOf(unit).terrain}:${!!typeOf(unit).ship}`
      const groups = [...new Set(units.map(groupKey))]
      groups.forEach((key) => {
        const group = units.filter((unit) => groupKey(unit) === key)
        const { terrain, ship } = typeOf(group[0])
        const radius = Math.max(...group.map((unit) => typeOf(unit).size / 2))
        const groupIds = group.map((unit) => unit.id)
        const slots = formationSlots(state.map, state.entities, target, group.length, radius, groupIds, terrain, ship)
        assignSlots(group, slots, target).forEach(({ unit, point }) => {
          if (point) routeUnit(commit, state, unit, point, groupIds)
          else commit(MUTATIONS.SET_PATH, { id: unit.id, path: [] })
        })
      })
=======
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
>>>>>>> temp/three-commits
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
      const entity = UNIT_TYPES[type]?.ship
        ? createUnit(type, x, y)
        : createBuilding(type, x, y, type === 'shipyard' ? shipyardDirection(state.map, { x, y }) : undefined)
      commit(MUTATIONS.ADD_ENTITY, entity)

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

    // здание сразу создает count своих персонажей на ближайших свободных местах рядом с собой
    // по очереди: каждый следующий ищет место уже с учетом предыдущих; места кончились - создаем сколько поместилось
    spawnUnits: ({ commit, state }, { id, count = 1, type }) => {
      const building = state.entities.find((e) => e.id === id && isBuilding(e))
      const spawns = building && BUILDING_TYPES[building.type].spawns
      const types = Array.isArray(spawns) ? spawns : spawns ? [spawns] : []
      const unitType = type ?? types[0]
      if (!types.includes(unitType)) {
        return
      }

      for (let n = 0; n < count; n++) {
        const point = findSpawnPoint(state.map, state.entities, building, unitType)
        if (!point) {
          return
        }
        commit(MUTATIONS.ADD_ENTITY, createUnit(unitType, point.x, point.y))
      }
    },
  },
}
