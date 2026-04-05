// src/utils/navigation.js
import { useRouter } from 'vue-router'

export const useNavigation = () => {
  const router = useRouter()

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  return {
    goToDashboard,
  }
}
