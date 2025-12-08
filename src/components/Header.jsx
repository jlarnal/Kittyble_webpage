import { useApi } from '../hooks/useApi'

export function Header() {
  const { data } = useApi()
  
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
            <span className="text-[10px] uppercase text-gray-400 tracking-wider">
               {data.status?.state || 'CONNECTING'}
            </span>
          </div>
        </div>
        
        {/* Battery & Status */}
        <div className="flex items-center gap-3">
           {data.status?.error && data.status.error !== 'ERR_NONE' && (
             <span className="text-xs bg-error/20 text-error px-2 py-0.5 rounded animate-pulse">
               {data.status.error}
             </span>
           )}
           <div className={`flex items-center gap-1 font-mono text-xs ${getBatteryColor(data.status?.battery || 0)}`}>
             <span>{data.status?.battery || 0}%</span>
             <div className="w-5 h-2.5 border border-current rounded-[2px] p-[1px]">
               <div className="h-full bg-current rounded-[1px]" style={{width: `${data.status?.battery || 0}%`}} />
             </div>
           </div>
        </div>
      </div>
    </header>
  )
}