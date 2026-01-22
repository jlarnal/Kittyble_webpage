import { useState } from 'preact/hooks'
import Router from 'preact-router'
import { Header } from './components/Header'
import { Navigation } from './components/Navigation'
import { ApiProvider } from './hooks/useApi'
import { I18nProvider } from './i18n/I18nProvider'

import { Dashboard } from './pages/Dashboard'
import { Tanks } from './pages/Tanks'
import { Recipes } from './pages/Recipes'
import { Settings } from './pages/Settings'
import { Calibration } from './pages/Calibration'

export function App() {
  const [currentUrl, setCurrentUrl] = useState('/')

  return (
    <I18nProvider>
      <ApiProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 pb-24 overflow-y-auto">
            <Router onChange={e => setCurrentUrl(e.url)}>
              <Dashboard path="/" />
              <Tanks path="/tanks" />
              <Recipes path="/recipes" />
              <Settings path="/settings" />
              <Calibration path="/settings/calibration" />
            </Router>
          </main>
          <Navigation currentUrl={currentUrl} />
        </div>
      </ApiProvider>
    </I18nProvider>
  )
}
