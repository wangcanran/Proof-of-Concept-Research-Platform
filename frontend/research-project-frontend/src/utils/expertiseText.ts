/** 解析合并存储的专家扩展描述（导入格式：【专业领域】…【个人简介】…） */
export function parseExpertiseDescription(text?: string | null) {
  const raw = text != null ? String(text).trim() : ''
  if (!raw) return { professionalField: '', personalBio: '', raw: '' }

  const fieldMatch = raw.match(/【专业领域】([\s\S]*?)(?=【个人简介】|$)/)
  const bioMatch = raw.match(/【个人简介】([\s\S]*)/)

  if (fieldMatch || bioMatch) {
    return {
      professionalField: (fieldMatch?.[1] || '').trim(),
      personalBio: (bioMatch?.[1] || '').trim(),
      raw,
    }
  }

  return { professionalField: raw, personalBio: '', raw }
}

/** 列表展示用：优先 API 已解析字段，否则本地解析 */
export function getExpertProfessionalField(user: {
  research_field?: string | null
  professional_field?: string | null
  professionalField?: string | null
  expertise_description?: string | null
}) {
  if (user.professional_field) return user.professional_field
  if (user.professionalField) return user.professionalField
  if (user.research_field && !/【专业领域】|【个人简介】/.test(user.research_field)) {
    return user.research_field
  }
  return parseExpertiseDescription(user.research_field || user.expertise_description).professionalField
}

export function getExpertPersonalBio(user: {
  personal_bio?: string | null
  personalBio?: string | null
  expertise_description?: string | null
  research_field?: string | null
}) {
  if (user.personal_bio) return user.personal_bio
  if (user.personalBio) return user.personalBio
  return parseExpertiseDescription(user.expertise_description || user.research_field).personalBio
}
