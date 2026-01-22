import { useState, useRef, useEffect } from 'preact/hooks'
import { useI18n } from './I18nProvider'

const LANGUAGES = {
  en: { flag: '\u{1F1EC}\u{1F1E7}', name: 'English' },
  fr: { flag: '\u{1F1EB}\u{1F1F7}', name: 'Fran\u00e7ais' },
  de: { flag: '\u{1F1E9}\u{1F1EA}', name: 'Deutsch' }
}

export function LanguageSelector() {
  const { lang, setLang, supportedLangs } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return

    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [open])

  const currentLang = LANGUAGES[lang] || LANGUAGES.en

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-dark-surface border border-white/10 flex items-center justify-center text-lg hover:border-white/20 transition-colors"
        title={currentLang.name}
      >
        {currentLang.flag}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-dark-card rounded-lg border border-white/10 shadow-xl overflow-hidden z-50 min-w-[140px]">
          {supportedLangs.map((code) => {
            const l = LANGUAGES[code]
            const isActive = code === lang
            return (
              <button
                key={code}
                onClick={() => {
                  setLang(code)
                  setOpen(false)
                }}
                className={`w-full px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'hover:bg-white/5 text-gray-300'
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
