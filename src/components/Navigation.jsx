import { route } from 'preact-router'

export function Navigation({ currentUrl }) {
  const navs = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/tanks', label: 'Tanks', icon: '🥫' },
    { path: '/recipes', label: 'Recipes', icon: '📜' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <nav className="fixed bottom-0 w-full bg-dark-surface border-t border-white/5 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navs.map(item => {
          const active = currentUrl === item.path
          return (
            <button 
              key={item.path}
              onClick={() => route(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${active ? 'text-accent-primary' : 'text-gray-500'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <div className="absolute top-0 w-8 h-0.5 bg-accent-primary rounded-b-full" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
