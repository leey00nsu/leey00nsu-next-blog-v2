import type { ReactNode } from 'react'
import { Container } from '@/widgets/layout/ui/container'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <Container>{children}</Container>
}
