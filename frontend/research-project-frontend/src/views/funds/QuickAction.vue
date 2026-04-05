<!-- src/components/funds/QuickAction.vue -->
<template>
  <div class="quick-action" @click="handleClick">
    <div class="action-icon">
      <span>{{ icon }}</span>
    </div>
    <div class="action-title">{{ title }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  icon: string
}

const props = defineProps<Props>()
const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
}

.quick-action:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.2);
  transform: translateY(-2px);
}

.action-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, rgba(179,27,27,0.06) 0%, #bae7ff 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.action-title {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}
</style>
