<!-- src/components/ErrorHandler.vue -->
<template>
  <div v-if="showError" class="error-overlay">
    <div class="error-content">
      <h3>{{ errorTitle }}</h3>
      <p>{{ errorMessage }}</p>
      <div class="error-actions">
        <button @click="retry" v-if="canRetry">重试</button>
        <button @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showError = ref(false)
const errorTitle = ref('')
const errorMessage = ref('')
const canRetry = ref(false)
const retryCallback = ref<() => void>(() => {})

const showErrorDialog = (title: string, message: string, retry?: () => void) => {
  errorTitle.value = title
  errorMessage.value = message
  canRetry.value = !!retry
  if (retry) retryCallback.value = retry
  showError.value = true
}

const retry = () => {
  if (retryCallback.value) {
    retryCallback.value()
  }
  close()
}

const close = () => {
  showError.value = false
}

defineExpose({
  showErrorDialog,
})
</script>

<style scoped>
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.error-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 400px;
  text-align: center;
}

.error-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
