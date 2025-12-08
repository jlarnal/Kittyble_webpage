import { useApi } from '../hooks/useApi'

export function Dashboard() {
  const { data, stopFeed, feedImmediate } = useApi()

  // Safe access to state, defaulting to 'connecting...' if undefined
  const systemState = data.status?.state ? data.status.state.toLowerCase() : 'connecting...'

  return (
    <div className="p-4 space-y-6">
      
      {/* Updated Hero Section with Centered Visual */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative">
          <div className="absolute inset-0 bg-accent-primary/20 blur-3xl rounded-full"></div>
          {/* Use relative path for embedded safety or absolute if server handles root correctly */}
          <img src="kitty-icon.svg" alt="Kittyble" className="w-32 h-32 relative z-10 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]" />
        </div>
        <h2 className="text-2xl font-bold mt-2 text-white">Good Morning!</h2>
        <p className="text-sm text-gray-400">System is {systemState}</p>
      </div>

      {/* Status Card */}
      <div className="card bg-gradient-to-br from-dark-surface to-dark-card border-none relative overflow-hidden">
        <div className="relative z-10">
          <div className="heading-section mb-1">Next Feed</div>
          <div className="flex gap-6 justify-between items-end">
            <div>
              <div className="text-xs text-gray-400">Last Feed</div>
              <div className="text-xl font-mono text-accent-secondary">{data.status?.last_feed_time || '--:--'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Active Recipe</div>
              <div className="text-lg text-accent-primary">{data.status?.last_recipe || 'None'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={stopFeed} className="btn btn-danger h-16 text-lg">
          🛑 STOP
        </button>
        <button 
          onClick={() => data.tanks?.[0] && feedImmediate(data.tanks[0].uid, 20)} 
          className="btn btn-primary h-16 text-lg"
          disabled={!data.tanks?.length}
        >
          🍽️ Feed Now
        </button>
      </div>

      {/* Tank Grid */}
      <div>
        <div className="heading-section">Tank Levels</div>
        <div className="grid grid-cols-2 gap-3">
          {(data.tanks || []).map(tank => {
            const pct = Math.min(100, (tank.remainingWeight / tank.capacity) * 100)
            let barColor = 'bg-tank-full'
            if (pct < 15) barColor = 'bg-tank-low'
            else if (pct < 40) barColor = 'bg-tank-medium'

            return (
              <div key={tank.uid} className="bg-dark-surface rounded-xl p-3 border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] bg-gray-700 rounded px-1.5 py-0.5 text-gray-300">#{tank.slot}</span>
                  <span className="font-mono text-xs font-bold">{tank.remainingWeight}g</span>
                </div>
                <div className="mb-2">
                  <div className="text-sm font-semibold truncate leading-tight">{tank.name}</div>
                  {/* Updated: Hex UID Subtitle */}
                  <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wide truncate">
                    {tank.uid}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} transition-all duration-500`} style={{width: `${pct}%`}} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}