import { useState, useEffect } from 'preact/hooks'
import { route } from 'preact-router'
import { useApi } from '../hooks/useApi'
import { useI18n } from '../i18n/I18nProvider'

// Check if tank has valid configuration (density and capacity > 0)
const isTankConfigured = (tank) => tank.capacity > 0 && tank.density > 0

// LocalStorage key for permanently dismissed setup prompts ("Don't remind me")
const DISMISSED_SETUP_KEY = 'kittyble_dismissed_tank_setup'
// SessionStorage key for temporarily dismissed setup prompts ("Later")
const SESSION_DISMISSED_KEY = 'kittyble_session_dismissed_tanks'

// Get permanently dismissed tank UIDs from localStorage
const getDismissedTanks = () => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_SETUP_KEY) || '[]')
  } catch {
    return []
  }
}

// Get session-dismissed tank UIDs from sessionStorage
const getSessionDismissedTanks = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_DISMISSED_KEY) || '[]')
  } catch {
    return []
  }
}

// Add tank UID to permanent dismissed list
const dismissTankSetup = (uid) => {
  const dismissed = getDismissedTanks()
  if (!dismissed.includes(uid)) {
    dismissed.push(uid)
    localStorage.setItem(DISMISSED_SETUP_KEY, JSON.stringify(dismissed))
  }
}

// Add tank UID to session dismissed list ("Later" - clears when tab closes)
const dismissTankSetupForSession = (uid) => {
  const dismissed = getSessionDismissedTanks()
  if (!dismissed.includes(uid)) {
    dismissed.push(uid)
    sessionStorage.setItem(SESSION_DISMISSED_KEY, JSON.stringify(dismissed))
  }
}

// Setup Prompt Modal for unconfigured tanks
function SetupPromptModal({ tank, toHexUid, onSetup, onDismiss, onLater, t }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onLater}>
      <div className="bg-dark-card rounded-2xl p-5 w-full max-w-sm animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🔧</span>
          <h3 className="text-lg font-bold">{t('dashboard.setupRequired')}</h3>
        </div>

        <div className="bg-dark-surface rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{t('tanks.slot', { index: tank.busIndex })}</span>
          </div>
          <div className="text-sm font-semibold">{tank.name || t('dashboard.unnamedTank')}</div>
          <div className="text-[10px] font-mono text-gray-500 uppercase">{toHexUid(tank.uid)}</div>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          {t('dashboard.setupDescription')}
        </p>

        <div className="space-y-2">
          <button
            onClick={onSetup}
            className="btn btn-primary w-full py-3 font-semibold"
          >
            {t('dashboard.configureNow')}
          </button>
          <button
            onClick={onDismiss}
            className="btn btn-secondary w-full py-2 text-sm"
          >
            {t('dashboard.dontRemind')}
          </button>
          <button
            onClick={onLater}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t('dashboard.later')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data, stopFeed, feedImmediate, toHexUid } = useApi()
  const { t } = useI18n()
  const [setupPromptTank, setSetupPromptTank] = useState(null)

  // Safe access to state, defaulting to 'connecting...' if undefined
  const systemState = data.status?.state ? data.status.state.toLowerCase() : 'connecting...'

  // Check for unconfigured tanks that haven't been dismissed
  useEffect(() => {
    if (!data.tanks?.length || setupPromptTank) return

    const permanentDismissed = getDismissedTanks()
    const sessionDismissed = getSessionDismissedTanks()
    const unconfigured = data.tanks.find(
      tank => !isTankConfigured(tank) &&
              !permanentDismissed.includes(tank.uid) &&
              !sessionDismissed.includes(tank.uid)
    )

    if (unconfigured) {
      setSetupPromptTank(unconfigured)
    }
  }, [data.tanks?.length])

  const handleSetupPromptSetup = () => {
    const tankUid = setupPromptTank.uid
    setSetupPromptTank(null)
    // Store the tank UID in sessionStorage for the Tanks page to auto-start edit mode
    sessionStorage.setItem('kittyble_auto_edit_tank', String(tankUid))
    route('/tanks')
  }

  const handleSetupPromptDismiss = () => {
    dismissTankSetup(setupPromptTank.uid)
    setSetupPromptTank(null)
  }

  const handleSetupPromptLater = () => {
    dismissTankSetupForSession(setupPromptTank.uid)
    setSetupPromptTank(null)
  }

  return (
    <div className="p-4 space-y-6">

      {/* Updated Hero Section with Centered Visual */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative">
          <div className="absolute inset-0 bg-accent-primary/20 blur-3xl rounded-full"></div>
          {/* Use relative path for embedded safety or absolute if server handles root correctly */}
          <img src="kitty-icon.svg" alt="Kittyble" className="w-32 h-32 relative z-10 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]" />
        </div>
        <h2 className="text-2xl font-bold mt-2 text-white">{t('dashboard.greeting')}</h2>
        <p className="text-sm text-gray-400">{t('dashboard.systemStatus', { state: systemState })}</p>
      </div>

      {/* Status Card */}
      <div className="card bg-gradient-to-br from-dark-surface to-dark-card border-none relative overflow-hidden">
        <div className="relative z-10">
          <div className="heading-section mb-1">{t('dashboard.nextFeed')}</div>
          <div className="flex gap-6 justify-between items-end">
            <div>
              <div className="text-xs text-gray-400">{t('dashboard.lastFeed')}</div>
              <div className="text-xl font-mono text-accent-secondary">{data.status?.lastFeedTime || '--:--'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">{t('dashboard.activeRecipe')}</div>
              <div className="text-lg text-accent-primary">{data.status?.lastRecipe || t('dashboard.none')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        {systemState === 'feeding' || systemState === 'dispensing' ? (
          <button onClick={stopFeed} className="btn btn-danger h-16 text-lg">
            🛑 {t('dashboard.stop')}
          </button>
        ) : (
          <div /> /* Empty placeholder to maintain grid layout */
        )}
        <button
          onClick={() => data.tanks?.[0] && feedImmediate(data.tanks[0].uid, 20)}
          className="btn btn-primary h-16 text-lg"
          disabled={!data.tanks?.length}
        >
          🍽️ {t('dashboard.feedNow')}
        </button>
      </div>

      {/* Tank Grid */}
      <div>
        <div className="heading-section">{t('dashboard.tankLevels')}</div>
        <div className="grid grid-cols-2 gap-3">
          {(data.tanks || []).map(tank => {
            const configured = isTankConfigured(tank)
            const maxCapacityGrams = configured ? tank.capacity * tank.density : 0
            const pct = configured ? Math.min(100, (tank.remainingWeightGrams / maxCapacityGrams) * 100) : 0
            let barColor = 'bg-tank-full'
            if (pct < 15) barColor = 'bg-tank-low'
            else if (pct < 40) barColor = 'bg-tank-medium'

            return (
              <div key={tank.uid} className="bg-dark-surface rounded-xl p-3 border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] bg-gray-700 rounded px-1.5 py-0.5 text-gray-300">#{tank.busIndex}</span>
                  {configured ? (
                    <span className="font-mono text-xs font-bold">{Number(tank.remainingWeightGrams).toFixed(0)}g</span>
                  ) : (
                    <span className="text-[10px] bg-orange-600/80 rounded px-1.5 py-0.5 text-white">{t('dashboard.notConfigured')}</span>
                  )}
                </div>
                <div className="mb-2">
                  <div className="text-sm font-semibold truncate leading-tight">{tank.name || t('dashboard.unnamedTank')}</div>
                  {/* Hex UID Subtitle */}
                  <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wide truncate">
                    {toHexUid(tank.uid)}
                  </div>
                </div>
                {configured ? (
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all duration-500`} style={{width: `${pct}%`}} />
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-500 italic">{t('dashboard.enableHint')}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Setup Prompt Modal for unconfigured tanks */}
      {setupPromptTank && (
        <SetupPromptModal
          tank={setupPromptTank}
          toHexUid={toHexUid}
          onSetup={handleSetupPromptSetup}
          onDismiss={handleSetupPromptDismiss}
          onLater={handleSetupPromptLater}
          t={t}
        />
      )}
    </div>
  )
}