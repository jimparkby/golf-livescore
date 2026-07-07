import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Trophy, Users, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'

type LeaderboardPlayer = {
  rank: number
  name: string
  tournaments: number
  hcp: number
  rating: number
  gender?: 'female'
}

type LeaderboardData = {
  overall: LeaderboardPlayer[]
  male: LeaderboardPlayer[]
  female: LeaderboardPlayer[]
  lastUpdated: string
}

type Tab = 'overall' | 'male' | 'female'

export default function LeaderboardCard() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<Tab>('overall')
  const [expanded, setExpanded] = useState(false)

  const fetchData = async (force = false) => {
    try {
      if (force) setRefreshing(true)
      else setLoading(true)

      const endpoint = force ? '/api/leaderboard/refresh' : '/api/leaderboard'
      const result = await api[force ? 'post' : 'get']<LeaderboardData>(endpoint)
      setData(result)

      if (force) toast.success('Рейтинг обновлен')
    } catch (error) {
      console.error('[leaderboard] Error:', error)
      toast.error('Ошибка загрузки рейтинга')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const players = data ? data[tab] : []
  const visiblePlayers = expanded ? players : players.slice(0, 10)

  if (loading) {
    return (
      <Card className="p-6 shadow-soft">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Загрузка рейтинга...</span>
        </div>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="overflow-hidden shadow-soft">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-action" />
            <h2 className="text-lg font-bold">Рейтинг 2026</h2>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 w-9 rounded-full hover:bg-accent grid place-items-center transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <TabButton
            active={tab === 'overall'}
            onClick={() => setTab('overall')}
            icon={<Users className="h-3.5 w-3.5" />}
            label="Общий"
          />
          <TabButton
            active={tab === 'male'}
            onClick={() => setTab('male')}
            label="Мужчины"
          />
          <TabButton
            active={tab === 'female'}
            onClick={() => setTab('female')}
            label="Женщины"
          />
        </div>
      </div>

      {/* Table */}
      <div className="divide-y divide-border">
        {visiblePlayers.map((player, idx) => (
          <div
            key={`${player.name}-${idx}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors"
          >
            {/* Rank */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                player.rank === 1
                  ? "bg-yellow-500/20 text-yellow-600 border-2 border-yellow-500/40"
                  : player.rank === 2
                  ? "bg-slate-400/20 text-slate-600 border-2 border-slate-400/40"
                  : player.rank === 3
                  ? "bg-orange-600/20 text-orange-700 border-2 border-orange-600/40"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {player.rank}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{player.name}</div>
              <div className="text-xs text-muted-foreground">
                {player.tournaments} турниров • HCP {player.hcp.toFixed(1)}
              </div>
            </div>

            {/* Rating */}
            <div className="text-right shrink-0">
              <div className="text-lg font-black tabular-nums">{player.rating.toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">рейтинг</div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More */}
      {players.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 text-sm font-semibold text-action hover:bg-accent/50 transition-colors border-t border-border"
        >
          {expanded ? 'Свернуть' : `Показать еще ${players.length - 10}`}
        </button>
      )}

      {/* Last Updated */}
      <div className="px-5 py-3 bg-muted/30 text-xs text-muted-foreground border-t border-border">
        Обновлено: {new Date(data.lastUpdated).toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </Card>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all",
        active
          ? "bg-action text-action-foreground"
          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
      )}
    >
      {icon}
      {label}
    </button>
  )
}
