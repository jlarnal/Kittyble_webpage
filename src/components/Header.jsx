import { useApi } from '../hooks/useApi'
import { useI18n } from '../i18n/I18nProvider'
import { LanguageSelector } from '../i18n/LanguageSelector'

export function Header() {
  const { data, sseConnected, feedingProgress } = useApi()
  const { t } = useI18n()

  const getBatteryColor = (lvl) => {
    if (lvl > 50) return 'text-success'
    if (lvl > 20) return 'text-warning'
    return 'text-error animate-pulse'
  }

  return (
    <header className="sticky top-0 z-50 bg-dark-surface/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* Updated: Use relative path for flat structure */}
          <img src="kitty-icon.svg" alt="Logo" className="w-8 h-8" />
          <div>
            <h1 className="font-bold leading-none">Kittyble</h1>
            <div className="flex items-center gap-1.5">
              {/* SSE connection indicator */}
              <span
                className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-success' : 'bg-gray-600'}`}
                title={sseConnected ? t('header.liveUpdates') : t('header.connecting')}
              />
              <span className="text-[10px] uppercase text-gray-400 tracking-wider">
                {data.status?.state || 'CONNECTING'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Language, Battery & Status */}
        <div className="flex items-center gap-3">
           {data.status?.error && data.status.error !== 'ERR_NONE' && (
             <span className="text-xs bg-error/20 text-error px-2 py-0.5 rounded animate-pulse">
               {data.status.error}
             </span>
           )}
           <LanguageSelector />
           <div className={`flex items-center gap-1 font-mono text-xs ${getBatteryColor(data.status?.battery || 0)}`}>
             <span>{data.status?.battery || 0}%</span>
             <div className="w-5 h-2.5 border border-current rounded-[2px] p-[1px]">
               <div className="h-full bg-current rounded-[1px]" style={{width: `${data.status?.battery || 0}%`}} />
             </div>
           </div>
        </div>
      </div>

      {/* Feeding progress bar - appears during active feeding */}
      {feedingProgress && (
        <div className="mt-2 bg-dark-card rounded-lg p-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{t('header.dispensing')}</span>
            <span className="font-mono">{feedingProgress.weight.toFixed(1)}g / {feedingProgress.target}g</span>
          </div>
          <div className="h-2 bg-dark-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-200"
              style={{ width: `${Math.min(100, (feedingProgress.weight / feedingProgress.target) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </header>
  )
}