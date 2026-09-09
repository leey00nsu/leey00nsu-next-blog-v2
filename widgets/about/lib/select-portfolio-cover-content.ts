const PORTFOLIO_CAREER_HEADING = /^### (?:경력|Career)\s*$/mu

export function selectPortfolioCoverContent(content: string): string {
  const careerHeading = PORTFOLIO_CAREER_HEADING.exec(content)
  if (!careerHeading) {
    throw new Error('Portfolio content must include a career section')
  }

  return content.slice(0, careerHeading.index).trim()
}
