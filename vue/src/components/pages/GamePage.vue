<template>
  <div class="game-page">
    <GameField />
    <div class="game-page__legend" aria-label="Обозначения команд">
      <span><i class="game-page__dot game-page__dot--player"></i> Синие</span>
      <span><i class="game-page__dot game-page__dot--enemy"></i> Красные</span>
    </div>
    <SelectionPanel class="game-page__panel" />
    <RouterLink class="game-page__exit" :to="{ name: $routes.INDEX }">Выход</RouterLink>
  </div>
</template>

<script setup>
import GameField from '@/components/game/GameField.vue'
import SelectionPanel from '@/components/game/SelectionPanel.vue'
import { useGameEvents } from '@/composables/useGameEvents'

useGameEvents()
</script>

<style scoped lang="scss">
// на весь экран, поверх общей сетки #project из main.css
.game-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  user-select: none;

  &__legend {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    gap: 16px;
    padding: 7px 12px;
    background: rgba(17, 22, 27, 0.85);
    border-radius: 7px;
    color: #f0f0f0;
    font-size: 13px;
  }

  &__legend span { display: flex; align-items: center; gap: 7px; }
  &__dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
  &__dot--player { background: #3d8ecc; }
  &__dot--enemy { background: #d66565; }

  &__panel {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100vw - 24px);
  }

  &__exit {
    position: absolute;
    top: 8px;
    right: 8px;
  }
}
</style>