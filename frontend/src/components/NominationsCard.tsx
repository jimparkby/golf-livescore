import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Trophy, Award, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

type Nomination = {
  name: string
  longest: number
  closest: number
  gender: 'male' | 'female'
}

type NominationsData = {
  longest: {
    male: Nomination[]
    female: Nomination[]
  }
  closest: {
    male: Nomination[]
    female: Nomination[]
  }
}

type Tab = 'longest' | 'closest'

export default function NominationsCard() {
  const [data, setData] = useState<NominationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('longest')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.get<{ nominations: NominationsData }>('/api/leaderboard')
        setData(result.nominations)
      } catch (error) {
        console.error('[nominations] Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return null
  if (!data) return null

  const nominations = tab === 'longest' ? data.longest : data.closest
  const icon = tab === 'longest' ? <Zap className="h-4 w-4" /> : <Target className="h-4 w-4" />

  return (
    <Card className="overflow-hidden shadow-soft">
      {/* Header */}
      <div className="p-5 border-b border-border space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-action" />
          <h2 className="text-lg font-bold">Номинации</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('longest')}
            className={cn(
              "flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all",
              tab === 'longest'
                ? "bg-action text-action-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Longest Drive
          </button>
          <button
            onClick={() => setTab('closest')}
            className={cn(
              "flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all",
              tab === 'closest'
                ? "bg-action text-action-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            <Target className="h-3.5 w-3.5" />
            Closest to Pin
          </button>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Male */}
        <div className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
            {icon}
            Мужчины
          </div>
          <div className="space-y-2">
            {nominations.male.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">Нет данных</div>
            ) : (
              nominations.male.map((nom, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      idx === 0
                        ? "bg-yellow-500/20 text-yellow-600"
                        : idx === 1
                        ? "bg-slate-400/20 text-slate-600"
                        : idx === 2
                        ? "bg-orange-600/20 text-orange-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{nom.name}</div>
                  </div>
                  <div className="text-sm font-bold tabular-nums text-action">
                    {tab === 'longest' ? nom.longest : nom.closest}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Female */}
        <div className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
            {icon}
            Женщины
          </div>
          <div className="space-y-2">
            {nominations.female.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">Нет данных</div>
            ) : (
              nominations.female.map((nom, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      idx === 0
                        ? "bg-yellow-500/20 text-yellow-600"
                        : idx === 1
                        ? "bg-slate-400/20 text-slate-600"
                        : idx === 2
                        ? "bg-orange-600/20 text-orange-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{nom.name}</div>
                  </div>
                  <div className="text-sm font-bold tabular-nums text-action">
                    {tab === 'longest' ? nom.longest : nom.closest}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
