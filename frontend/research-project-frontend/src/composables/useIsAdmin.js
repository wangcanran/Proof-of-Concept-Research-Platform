import { computed } from 'vue'

export function useIsAdmin() {
  const isAdmin = computed(() => {
    const role = localStorage.getItem('userRole') || ''
    return role.toLowerCase() === 'admin'
  })
  return { isAdmin }
}
