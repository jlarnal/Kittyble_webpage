import { route } from 'preact-router'
import { useI18n } from '../i18n/I18nProvider'

export function Navigation({ currentUrl }) {
  const { t } = useI18n()

  const navs = [
    { path: '/', labelKey: 'nav.home', icon: 'home.svg' },
    { path: '/tanks', labelKey: 'nav.tanks', icon: 'kibbles.svg' },
    { path: '/recipes', labelKey: 'nav.recipes', icon: 'recipes.svg' },
    { path: '/settings', labelKey: 'nav.settings', icon: 'settings.svg' },
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
              <img src={item.icon} alt={t(item.labelKey)} className={`w-8 h-8 transition-opacity ${active ? 'opacity-100' : 'opacity-50'}`} />
              <span className="text-[16px] font-medium">{t(item.labelKey)}</span>
              {active && <div className="absolute top-0 w-8 h-0.5 bg-accent-primary rounded-b-full" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
