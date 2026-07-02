<template>
  <div class="assigned-partners">
    <div v-for="p in providers" :key="p.industry_partner_id" class="assigned-item">
      <div class="info">
        <span class="name">{{ p.partner_name || p.industry_partner_id }}</span>
        <span v-if="p.org_category_label" class="tag">{{ p.org_category_label }}</span>
        <span v-if="p.source_label" class="tag source">{{ p.source_label }}</span>
        <div v-if="p.contact_name" class="meta">{{ p.contact_name }} · {{ p.contact_phone }}</div>
      </div>
      <el-button
        v-if="editable && p.source !== 'applicant_apply'"
        link
        type="danger"
        @click="$emit('remove', p)"
      >移除</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssignedIndustryPartnerInfo } from '@/components/IncubationIndustryPartnerAssignPanel.vue'

defineProps<{
  providers: AssignedIndustryPartnerInfo[]
  editable?: boolean
}>()
defineEmits<{ remove: [AssignedIndustryPartnerInfo] }>()
</script>

<style scoped>
.assigned-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; background: #f5f7fa; border-radius: 8px; margin-bottom: 8px;
}
.name { font-weight: 600; margin-right: 8px; }
.tag { font-size: 12px; color: #909399; }
.tag.source { margin-left: 4px; color: #67c23a; }
.meta { font-size: 13px; color: #606266; margin-top: 4px; }
</style>
