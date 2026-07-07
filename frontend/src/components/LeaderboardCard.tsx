import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Trophy, Users, RefreshCw, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

type LeaderboardPlayer = {
  rank: number
  name: string
  tournaments: number
  hcp: number
  rating: number
}

type LeaderboardData = {
  overall: LeaderboardPlayer[]
  male: LeaderboardPlayer[]
  female: LeaderboardPlayer[]
  tournaments: any[]
  stats: {
    totalPlayers: number
    malePlayers: number
    femalePlayers: number
    totalTournaments: number
    tournamentNames: string[]
  }
  lastUpdated: string
}

type Tab = 'overall' | 'male' | 'female'

export default function LeaderboardCard() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<Tab>('overall')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

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

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    if (!data) return []
    const players = data[tab]
    if (!searchQuery.trim()) return players

    const query = searchQuery.toLowerCase()
    return players.filter(p => p.name.toLowerCase().includes(query))
  }, [data, tab, searchQuery])

  // Show top 20 by default, all if expanded or searching
  const visiblePlayers = showAll || searchQuery ? filteredPlayers : filteredPlayers.slice(0, 20)

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

  const allPlayers = data[tab]
  const hasMore = filteredPlayers.length > 20

  return (
    <Card className="overflow-hidden shadow-soft">
      {/* Header */}
      <div className="p-5 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
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

        {/* Stats */}
        {data.stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg py-2">
              <div className="text-xl font-bold">{data.stats.totalPlayers}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Игроков</div>
            </div>
            <div className="bg-muted/50 rounded-lg py-2">
              <div className="text-xl font-bold">{data.stats.totalTournaments}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Турниров</div>
            </div>
            <div className="bg-muted/50 rounded-lg py-2">
              <div className="text-xl font-bold">{data.tournaments?.length || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Результатов</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <TabButton
            active={tab === 'overall'}
            onClick={() => { setTab('overall'); setSearchQuery(''); setShowAll(false); }}
            icon={<Users className="h-3.5 w-3.5" />}
            label="Общий"
            count={data.stats?.totalPlayers}
          />
          <TabButton
            active={tab === 'male'}
            onClick={() => { setTab('male'); setSearchQuery(''); setShowAll(false); }}
            label="Мужчины"
            count={data.stats?.malePlayers}
          />
          <TabButton
            active={tab === 'female'}
            onClick={() => { setTab('female'); setSearchQuery(''); setShowAll(false); }}
            label="Женщины"
            count={data.stats?.femalePlayers}
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени..."
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
        {visiblePlayers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {searchQuery ? 'Игроки не найдены' : 'Нет данных'}
          </div>
        ) : (
          visiblePlayers.map((player, idx) => (
            <div
              key={`${player.name}-${idx}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors"
            >
              {/* Rank */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
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
          ))
        )}
      </div>

      {/* Show More / Less */}
      {!searchQuery && hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 text-sm font-semibold text-action hover:bg-accent/50 transition-colors border-t border-border"
        >
          {showAll
            ? 'Свернуть'
            : `Показать всех (еще ${filteredPlayers.length - 20})`
          }
        </button>
      )}

      {/* Footer */}
      <div className="px-5 py-3 bg-muted/30 text-xs text-muted-foreground border-t border-border space-y-1">
        <div>
          Показано: {visiblePlayers.length} из {allPlayers.length}
        </div>
        <div>
          Обновлено: {new Date(data.lastUpdated).toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </Card>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  label: string
  count?: number
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
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded-full",
          active ? "bg-action-foreground/20" : "bg-muted-foreground/20"
        )}>
          {count}
        </span>
      )}
    </button>
  )
}
