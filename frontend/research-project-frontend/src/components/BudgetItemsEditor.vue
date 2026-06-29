<!-- 经费预算明细编辑（金额单位：元，与库内 FundsRequestItem 一致） -->
<template>
  <div class="budget-editor">
    <p v-if="hint" class="budget-hint">{{ hint }}</p>
    <div class="budget-table-wrap">
      <table class="budget-table">
        <thead>
          <tr>
            <th style="width: 140px">预算科目</th>
            <th style="width: 160px">项目名称</th>
            <th>详细说明</th>
            <th style="width: 120px">金额（元）</th>
            <th style="width: 56px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="modelValue.length === 0">
            <td colspan="5" class="empty-row">暂无明细，请点击下方「添加科目」</td>
          </tr>
          <tr v-for="(item, index) in modelValue" :key="index">
            <td>
              <select v-model="item.category" class="budget-select">
                <option v-for="opt in BUDGET_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </td>
            <td>
              <input
                v-model="item.item_name"
                type="text"
                class="budget-input"
                placeholder="预算项目名称"
              />
            </td>
            <td>
              <input
                v-model="item.description"
                type="text"
                class="budget-input"
                placeholder="可选"
              />
            </td>
            <td>
              <input
                v-model.number="item.amount"
                type="number"
                min="0"
                step="0.01"
                class="budget-input amount-input"
                placeholder="0"
              />
            </td>
            <td>
              <button type="button" class="remove-btn" title="删除" @click="removeRow(index)">×</button>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="modelValue.length > 0">
          <tr>
            <td colspan="3" class="total-label">合计（元）</td>
            <td class="total-value">{{ totalYuan.toFixed(2) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <button type="button" class="add-row-btn" @click="addRow">+ 添加科目</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BUDGET_CATEGORY_OPTIONS, type BudgetRow } from '@/constants/budgetCategories'

const props = withDefaults(
  defineProps<{
    modelValue: BudgetRow[]
    hint?: string
  }>(),
  {
    hint: '金额请按元填写。',
  },
)

const emit = defineEmits<{
  'update:modelValue': [BudgetRow[]]
}>()

const totalYuan = computed(() =>
  props.modelValue.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
)

function addRow() {
  emit('update:modelValue', [
    ...props.modelValue,
    { category: '', item_name: '', description: '', amount: 0 },
  ])
}

function removeRow(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}
</script>

<style scoped>
.budget-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #7f8c8d;
  line-height: 1.5;
}

.budget-table-wrap {
  overflow-x: auto;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
}

.budget-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.budget-table th,
.budget-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
}

.budget-table th {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
}

.empty-row {
  text-align: center;
  color: #999;
  padding: 24px !important;
}

.budget-select,
.budget-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.amount-input {
  text-align: right;
}

.remove-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #fee;
  color: #c0392b;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.remove-btn:hover {
  background: #fcc;
}

.total-label {
  text-align: right;
  font-weight: 600;
  color: #2c3e50;
}

.total-value {
  font-weight: 700;
  color: #b31b1b;
  text-align: right;
}

.add-row-btn {
  margin-top: 12px;
  padding: 8px 16px;
  border: 1px dashed #b31b1b;
  background: #fffbfb;
  color: #b31b1b;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.add-row-btn:hover {
  background: #fff5f5;
}
</style>
