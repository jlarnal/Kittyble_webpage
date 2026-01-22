import { createContext } from 'preact'
import { useContext, useState, useEffect, useCallback } from 'preact/hooks'
import translations from './translations.json'

const COOKIE_NAME = 'kittyble_lang'
const DEFAULT_LANG = 'en'
const SUPPORTED_LANGS = ['en', 'fr', 'de']

// Cookie helpers
const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

const setCookie = (name, value, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

// Get initial language from cookie or browser preference
const getInitialLang = () => {
  const saved = getCookie(COOKIE_NAME)
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved

  // Try browser language
  const browserLang = navigator.language?.slice(0, 2)
  if (SUPPORTED_LANGS.includes(browserLang)) return browserLang

  return DEFAULT_LANG
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang)

  // Update cookie when language changes
  const setLang = useCallback((newLang) => {
    if (SUPPORTED_LANGS.includes(newLang)) {
      setLangState(newLang)
      setCookie(COOKIE_NAME, newLang)
    }
  }, [])

  // Translation function with interpolation and pluralization
  const t = useCallback((key, params = {}) => {
    const langStrings = translations[lang] || translations[DEFAULT_LANG]

    // Handle pluralization: look for _one/_other suffixes
    let translationKey = key
    if (typeof params.count === 'number') {
      const pluralSuffix = params.count === 1 ? '_one' : '_other'
      if (langStrings[key + pluralSuffix]) {
        translationKey = key + pluralSuffix
      }
    }

    let str = langStrings[translationKey]

    // Fallback to English if key not found
    if (!str) {
      str = (translations[DEFAULT_LANG] || {})[translationKey] || key
    }

    // Interpolate {variable} placeholders
    if (params && typeof str === 'string') {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      })
    }

    return str
  }, [lang])

  const value = {
    lang,
    setLang,
    t,
    supportedLangs: SUPPORTED_LANGS
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}
