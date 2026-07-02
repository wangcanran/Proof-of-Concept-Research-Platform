<template>
  <div class="industry-resource-tabs">
    <router-link
      :to="partnersPath"
      class="tab-link"
      :class="{ active: activeTab === 'partners' }"
    >
      产业资源库
    </router-link>
    <router-link
      :to="demandsPath"
      class="tab-link"
      :class="{ active: activeTab === 'demands' }"
    >
      产业需求
    </router-link>
    <router-link
      v-if="connectionsPath"
      :to="connectionsPath"
      class="tab-link"
      :class="{ active: activeTab === 'connections' }"
    >
      {{ connectionsLabel }}
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    role?: 'applicant' | 'assistant'
    activeTab: 'partners' | 'demands' | 'connections'
    connectionsLabel?: string
  }>(),
  { role: 'applicant', connectionsLabel: '我的对接申请' },
)

const base = computed(() =>
  props.role === 'assistant' ? '/assistant/industry-resources' : '/applicant/industry-resources',
)
const partnersPath = computed(() => `${base.value}/partners`)
const demandsPath = computed(() => `${base.value}/demands`)
const connectionsPath = computed(() => {
  if (props.role === 'assistant') return `${base.value}/connection-requests`
  return `${base.value}/my-connections`
})
</script>

<style scoped>
.industry-resource-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: #fff;
  padding: 8px;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}

.tab-link {
  padding: 10px 20px;
  border-radius: 8px;
  color: #606266;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-link:hover {
  color: #b31b1b;
  background: #fef0f0;
}

.tab-link.active {
  color: #fff;
  background: #b31b1b;
}
</style>
