const RESUME_CAREER_HEADING = /^### (?:경력|Career)\s*$/mu

export function splitResumeContent(content: string): {
  introduction: string
  careerAndEducation: string
} {
  const careerHeading = RESUME_CAREER_HEADING.exec(content)
  if (!careerHeading) {
    throw new Error('Resume content must include a career section')
  }

  return {
    introduction: content.slice(0, careerHeading.index).trim(),
    careerAndEducation: content.slice(careerHeading.index).trim(),
  }
}
