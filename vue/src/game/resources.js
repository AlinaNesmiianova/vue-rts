// ресурсы: что добывают, объекты с запасом на карте и запасы клана
import { TERRAIN_TYPES } from './map.js'

// виды ресурсов, порядок здесь = порядок в интерфейсе
export const RESOURCES = { wood: 'Дерево', stone: 'Камень', ore: 'Руда', gold: 'Золото' }

// объект на карте: ключ = вид ресурса, size - диаметр в клетках, amount - начальный запас
// запас кончился - объект исчезает; все стоят на суше
const LAND = TERRAIN_TYPES.LAND
export const RESOURCE_TYPES = {
  wood: { name: 'Лес', size: 1.8, amount: 200, color: '#3f6b4a', terrain: LAND },
  stone: { name: 'Каменоломня', size: 1.6, amount: 150, color: '#8a8f96', terrain: LAND },
  ore: { name: 'Рудная жила', size: 1.4, amount: 100, color: '#8a5a4a', terrain: LAND },
  gold: { name: 'Золотая жила', size: 1.2, amount: 80, color: '#e0b84a', terrain: LAND },
}

// с чем клан начинает партию
export const START_STOCK = { wood: 100, stone: 50, ore: 20, gold: 20 }

// у каждого клана свой запас, копия, чтобы кланы не делили один объект
export const createStock = (stock = START_STOCK) => ({ ...stock })

// строки для интерфейса: название и сколько есть, в порядке RESOURCES
export const stockRows = (stock) => Object.entries(RESOURCES).map(([key, name]) => ({
  key,
  name,
  amount: stock?.[key] ?? 0,
}))
