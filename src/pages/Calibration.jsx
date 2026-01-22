import { useState } from 'preact/hooks'
import { route } from 'preact-router'
import { useApi } from '../hooks/useApi'
import { useI18n } from '../i18n/I18nProvider'

export function Calibration() {
  const { data, calibrateTank, toHexUid } = useApi()
  const { t } = useI18n()
  // Store local PWM edits keyed by tank UID
  const [pwmValues, setPwmValues] = useState({})

  const handlePwmChange = (uid, val) => {
    setPwmValues(prev => ({ ...prev, [uid]: parseInt(val) }))
  }

  // Helper to get the current slider value (Local Edit -> API Value -> Default)
  const getPwm = (tank) => {
    return pwmValues[tank.uid] ?? tank.calibration?.idlePwm ?? 1500
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <button onClick={() => route('/settings')} className="text-gray-400">← {t('calibration.back')}</button>
        <h2 className="text-xl font-bold">{t('calibration.title')}</h2>
      </div>

      <div className="p-3 bg-warning/10 border border-warning/20 rounded text-warning text-xs">
        {t('calibration.warning')}
      </div>

      <div className="space-y-4">
        {data.tanks.length === 0 ? (
          <div className="text-center text-gray-500 py-8 italic">
            {t('calibration.noTanks')}
          </div>
        ) : (
          data.tanks.map(tank => {
            const currentPwm = getPwm(tank)

            return (
              <div key={tank.uid} className="card">
                {/* Tank Header */}
                <div className="mb-4 border-b border-white/5 pb-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white">{tank.name}</h3>
                    <span className="text-xs bg-dark-surface px-2 py-1 rounded text-gray-400">{t('calibration.slot', { index: tank.busIndex })}</span>
                  </div>
                  {/* Hex UID Subtitle */}
                  <div className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mt-1">
                    {t('calibration.uid', { uid: toHexUid(tank.uid) })}
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">{t('calibration.idlePwm', { value: currentPwm })}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="500" max="2500"
                        value={currentPwm}
                        onInput={e => handlePwmChange(tank.uid, e.target.value)}
                        className="flex-1 accent-accent-primary h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        className="input w-20 py-1 text-center font-mono text-sm"
                        value={currentPwm}
                        onInput={e => handlePwmChange(tank.uid, e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => calibrateTank(tank.uid, currentPwm)}
                    className="btn btn-primary w-full py-2 text-sm"
                  >
                    {t('calibration.testSetIdle')}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}