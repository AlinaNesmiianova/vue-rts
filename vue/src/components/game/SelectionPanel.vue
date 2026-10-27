<template>
  <div class="selection-panel">
    <template v-if="entity">
      <div class="selection-panel__heading">
        <strong>{{ type.name }}</strong>
        <span
          class="selection-panel__team"
          :class="entity.team === TEAMS.PLAYER ? 'selection-panel__team--player' : 'selection-panel__team--enemy'"
        >
          {{ entity.team === TEAMS.PLAYER ? 'Синие' : 'Красные' }}
        </span>
      </div>
      <div class="selection-panel__details">
        <span>Здоровье: <strong>{{ entity.hp }} / {{ type.maxHp }}</strong></span>
        <template v-if="isUnit(entity)">
          <span>Сила: <strong>{{ type.attack }}</strong></span>
          <span>Ходьба: <strong>{{ type.speed }} кл/с</strong></span>
          <span>Атака: <strong>{{ type.attackSpeed }} уд/с</strong></span>
        </template>
        <span>Клетка: <strong>{{ Math.floor(entity.x) }}, {{ Math.floor(entity.y) }}</strong></span>
      </div>
      <div v-if="isUnit(entity)" class="selection-panel__actions">
        <span>
          {{ entity.attackTargetId !== null ? 'Атакует противника' : entity.target ? 'Перемещается' : 'Ожидает приказа' }}
        </span>
        <button type="button" class="selection-panel__destroy" @click="bus.emit(EVENTS.SELF_DESTRUCT, entity.id)">
          Самоуничтожение
        </button>
      </div>
    </template>
    <template v-else>
      <strong>Управление:</strong> ЛКМ — выбрать красного или синего бойца · ПКМ на земле — идти · ПКМ на противнике — атаковать · WASD — камера · Ctrl + колесо — масштаб
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { isUnit, TEAMS, typeOf } from '@/game/entities'

const store = useStore()
const entity = computed(() => store.getters['game/getSelected'][0] ?? null)
const type = computed(() => entity.value && typeOf(entity.value))
</script>

<style scoped lang="scss">
.selection-panel {
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 9px;
  background: rgba(17, 22, 27, 0.92);
  color: #e6e6e6;
  font-size: 13px;
  text-align: center;
  box-shadow: 0 4px 22px rgba(0, 0, 0, 0.32);

  &__heading, &__details, &__actions {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
  }

  &__heading { font-size: 15px; margin-bottom: 7px; }
  &__details strong { color: #fff; }
  &__actions { margin-top: 10px; }
  &__actions span { color: #b6c2cd; }
  &__team { padding: 1px 7px; border-radius: 4px; font-size: 12px; }
  &__team--player { background: #183c50; color: #8acdfb; }
  &__team--enemy { background: #4d2629; color: #ffaaa8; }
  &__destroy {
    padding: 6px 10px;
    border: 1px solid #d96161;
    border-radius: 5px;
    color: #ffe2e2;
    background: #693232;
    font: inherit;
    cursor: pointer;
  }

  &__destroy:hover { background: #8c3333; }
}
</style>
