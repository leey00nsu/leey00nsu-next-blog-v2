import { Container } from '@/widgets/layout/ui/container'

interface SiteLayoutProps {
  children: React.ReactNode
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return <Container>{children}</Container>
}
