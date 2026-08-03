import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export interface MetricCardItem {
  label: string
  value: string
}

interface MetricCardGridProps {
  items: MetricCardItem[]
}

export function MetricCardGrid({ items }: MetricCardGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
