import { useState, useEffect } from 'preact/hooks'
import { useApi } from '../hooks/useApi'
import { useI18n } from '../i18n/I18nProvider'

// Check if tank has valid configuration (density and capacity > 0)
const isTankConfigured = (tank) => tank.capacity > 0 && tank.density > 0

// LocalStorage key for permanently dismissed setup prompts ("Don't remind me")
const DISMISSED_SETUP_KEY = 'kittyble_dismissed_tank_setup'

// Remove tank UID from permanent dismissed list (when configured)
const clearDismissedTank = (uid) => {
  try {
    const dismissed = JSON.parse(localStorage.getItem(DISMISSED_SETUP_KEY) || '[]').filter(id => id !== uid)
    localStorage.setItem(DISMISSED_SETUP_KEY, JSON.stringify(dismissed))
  } catch {
    // Ignore storage errors
  }
}

// Common EU kibble bag sizes (grams)
const REFILL_AMOUNTS_GRAMS = [
  { value: 400, label: '400g' },
  { value: 800, label: '800g' },
  { value: 1000, label: '1kg' },
  { value: 1500, label: '1.5kg' },
  { value: 2000, label: '2kg' },
  { value: 3000, label: '3kg' },
  { value: 4000, label: '4kg' },
  { value: 7000, label: '7kg' },
]

// Common volume amounts (liters)
const REFILL_AMOUNTS_LITERS = [
  { value: 0.5, label: '0.5L' },
  { value: 1, label: '1L' },
  { value: 1.5, label: '1.5L' },
  { value: 2, label: '2L' },
  { value: 3, label: '3L' },
  { value: 4, label: '4L' },
  { value: 5, label: '5L' },
  { value: 8, label: '8L' },
]

// Refill Amount Selection Modal
function RefillModal({ tank, onSelect, onClose, t }) {
  const [customValue, setCustomValue] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [unit, setUnit] = useState('g') // 'g' for grams, 'L' for liters
  const [mode, setMode] = useState('add') // 'add' or 'set'

  // Compute max capacity in grams (capacity in L, density in g/L)
  const maxCapacityGrams = tank.capacity * tank.density
  const currentWeight = tank.remainingWeightGrams || 0
  const remainingSpace = Math.max(0, maxCapacityGrams - currentWeight)

  // Convert grams to liters for display (density in g/L)
  const gramsToLiters = (g) => g / tank.density
  const litersToGrams = (l) => l * tank.density

  // Format value in current unit
  const formatValue = (grams) => {
    if (unit === 'g') {
      return `${Number(grams).toFixed(0)}g`
    }
    return `${Number(gramsToLiters(grams)).toFixed(2)}L`
  }

  // Convert input value to grams
  const inputToGrams = (val) => {
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) return 0
    return unit === 'g' ? num : litersToGrams(num)
  }

  const handlePresetSelect = (presetValue) => {
    const grams = unit === 'g' ? presetValue : litersToGrams(presetValue)
    onSelect(grams, mode)
  }

  const handleCustomSubmit = () => {
    const grams = inputToGrams(customValue)
    if (grams > 0) {
      onSelect(grams, mode)
    }
  }

  const handleFillToMax = () => {
    if (mode === 'add') {
      onSelect(remainingSpace, mode)
    } else {
      onSelect(maxCapacityGrams, mode)
    }
  }

  const presets = unit === 'g' ? REFILL_AMOUNTS_GRAMS : REFILL_AMOUNTS_LITERS

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-card rounded-2xl p-5 w-full max-w-sm animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">{t('tanks.refillTitle', { name: tank.name })}</h3>
        <p className="text-xs text-gray-400 mb-3">
          {t('tanks.current')} {formatValue(currentWeight)} · {t('tanks.max')} {formatValue(maxCapacityGrams)} · {t('tanks.space')} {formatValue(remainingSpace)}
        </p>

        {/* Mode Toggle: ADD vs SET */}
        <div className="flex gap-1 mb-3 p-1 bg-dark-surface rounded-lg">
          <button
            onClick={() => setMode('add')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              mode === 'add'
                ? 'bg-accent-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('tanks.addToTank')}
          </button>
          <button
            onClick={() => setMode('set')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              mode === 'set'
                ? 'bg-accent-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('tanks.setValue')}
          </button>
        </div>

        {/* Unit Toggle: Grams vs Liters */}
        <div className="flex gap-1 mb-3 p-1 bg-dark-surface rounded-lg">
          <button
            onClick={() => { setUnit('g'); setCustomValue('') }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              unit === 'g'
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('tanks.grams')}
          </button>
          <button
            onClick={() => { setUnit('L'); setCustomValue('') }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              unit === 'L'
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('tanks.liters')}
          </button>
        </div>

        {!showCustomInput ? (
          <>
            {/* Fill to Max Button */}
            <button
              onClick={handleFillToMax}
              className="w-full mb-3 py-2.5 text-sm font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors"
            >
              {t('tanks.fillToMax', { value: mode === 'add' ? formatValue(remainingSpace) : formatValue(maxCapacityGrams) })}
            </button>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {presets.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handlePresetSelect(value)}
                  className="btn btn-secondary py-3 text-sm font-semibold hover:bg-accent-primary/20 hover:border-accent-primary transition-colors"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setShowCustomInput(true)}
                className="btn btn-secondary py-3 text-sm font-semibold bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                {t('tanks.custom')}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3 mb-3">
            <div>
              <label className="text-xs text-gray-400">{t('tanks.enterAmount', { unit: unit === 'g' ? t('tanks.grams') : t('tanks.liters') })}</label>
              <input
                type="number"
                step={unit === 'L' ? '0.1' : '1'}
                className="input text-center text-lg"
                value={customValue}
                onInput={e => setCustomValue(e.target.value)}
                placeholder={unit === 'g' ? 'e.g. 2500' : 'e.g. 2.5'}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCustomInput(false)} className="btn btn-secondary flex-1 py-2">
                {t('tanks.back')}
              </button>
              <button onClick={handleCustomSubmit} className="btn btn-primary flex-1 py-2">
                {mode === 'add' ? t('tanks.refill') : t('tanks.set')} {customValue || '0'}{unit}
              </button>
            </div>
          </div>
        )}

        {!showCustomInput && (
          <button onClick={onClose} className="btn btn-secondary w-full py-2 mt-1">
            {t('tanks.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}

// Confirmation Modal
function ConfirmModal({ tank, amount, mode, onConfirm, onCancel, t }) {
  const currentWeight = tank.remainingWeightGrams || 0
  const maxCapacityGrams = tank.capacity * tank.density

  // Calculate new weight based on mode
  const newWeight = mode === 'add' ? currentWeight + amount : amount
  const wouldOverflow = newWeight > maxCapacityGrams
  const isAddMode = mode === 'add'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-dark-card rounded-2xl p-5 w-full max-w-sm animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3">
          {isAddMode ? t('tanks.confirmRefill') : t('tanks.confirmSetValue')}
        </h3>

        <div className="bg-dark-surface rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">{t('tanks.tank')}</span>
            <span className="font-semibold">{tank.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{isAddMode ? t('tanks.adding') : t('tanks.settingTo')}</span>
            <span className={`font-mono ${isAddMode ? 'text-accent-primary' : 'text-orange-400'}`}>
              {isAddMode ? '+' : ''}{Number(amount).toFixed(0)}g
            </span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between">
            <span className="text-gray-400">{t('tanks.current').replace(':', '')}</span>
            <span className="font-mono">{Number(currentWeight).toFixed(0)}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{t('tanks.newTotal')}</span>
            <span className={`font-mono font-bold ${wouldOverflow ? 'text-tank-low' : 'text-tank-full'}`}>
              {Number(newWeight).toFixed(0)}g
            </span>
          </div>
          {wouldOverflow && (
            <div className="text-xs text-tank-low mt-2">
              {t('tanks.overflowWarning', { max: Number(maxCapacityGrams).toFixed(0) })}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="btn btn-secondary flex-1 py-3">
            {t('tanks.cancel')}
          </button>
          <button onClick={onConfirm} className="btn btn-primary flex-1 py-3 font-semibold">
            {isAddMode ? t('tanks.refill') : t('tanks.set')}
          </button>
        </div>
      </div>
    </div>
  )
}

// SessionStorage key for auto-edit request from Dashboard
const AUTO_EDIT_KEY = 'kittyble_auto_edit_tank'

export function Tanks() {
  const { data, updateTank, toHexUid } = useApi()
  const { t } = useI18n()
  const [editing, setEditing] = useState(null)
  const [refillTank, setRefillTank] = useState(null)
  const [confirmRefill, setConfirmRefill] = useState(null) // { tank, amount, mode }
  const [validationError, setValidationError] = useState(null)
  const [autoEditProcessed, setAutoEditProcessed] = useState(false)

  const [form, setForm] = useState({})

  // Auto-start edit mode if requested from Dashboard setup prompt
  useEffect(() => {
    if (autoEditProcessed || !data.tanks?.length) return

    const editUidParam = sessionStorage.getItem(AUTO_EDIT_KEY)
    if (!editUidParam) return

    setAutoEditProcessed(true)
    sessionStorage.removeItem(AUTO_EDIT_KEY)

    // Compare UIDs as strings to avoid precision loss with large 64-bit integers
    const tankToEdit = data.tanks.find(t => String(t.uid) === editUidParam)
    if (tankToEdit) {
      setEditing(tankToEdit.uid)
      setForm({ ...tankToEdit })
      setValidationError(null)
    }
  }, [data.tanks, autoEditProcessed])

  const startEdit = (tank) => {
    setEditing(tank.uid)
    setForm({ ...tank })
    setValidationError(null)
  }

  const save = async () => {
    // Validate name is not empty
    const trimmedName = (form.name || '').trim()
    if (!trimmedName) {
      setValidationError(t('tanks.nameRequired'))
      return
    }

    const density = Number(form.density)
    const capacity = Number(form.capacity)

    await updateTank(editing, { name: trimmedName, density, capacity })

    // If tank is now configured, clear any dismissed flag for this tank
    if (density > 0 && capacity > 0) {
      clearDismissedTank(editing)
    }

    setEditing(null)
    setValidationError(null)
  }

  // Refill flow: user selects amount -> show confirmation -> execute
  const handleRefillSelect = (amount, mode) => {
    setConfirmRefill({ tank: refillTank, amount, mode })
    setRefillTank(null)
  }

  const handleConfirmRefill = async () => {
    const { tank, amount, mode } = confirmRefill
    const maxCapacityGrams = tank.capacity * tank.density
    const currentWeight = tank.remainingWeightGrams || 0

    // Calculate new weight based on mode
    const rawNewWeight = mode === 'add' ? currentWeight + amount : amount
    const newWeight = Math.min(rawNewWeight, maxCapacityGrams)

    await updateTank(tank.uid, { remainingWeightGrams: Math.round(newWeight) })
    setConfirmRefill(null)
  }

  return (
    <div className="p-4 pb-20 space-y-4">
      <h2 className="text-2xl font-bold">{t('tanks.title')}</h2>

      {data.tanks.map(tank => {
        const configured = isTankConfigured(tank)
        const isEditing = editing === tank.uid

        return (
          <div key={tank.uid} className={`card ${isEditing ? 'border-2 animate-glimmer' : ''}`}>
            <div className="flex justify-between items-start mb-3">
               <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{t('tanks.slot', { index: tank.busIndex })}</span>
                  {!configured && (
                    <span className="text-xs bg-orange-600/80 px-2 py-0.5 rounded text-white">{t('tanks.notConfigured')}</span>
                  )}
               </div>
               {!isEditing && (
                   <button onClick={() => startEdit(tank)} className="text-accent-primary text-sm font-semibold">{t('tanks.edit')}</button>
               )}
            </div>

            {isEditing ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-xs text-gray-400">{t('tanks.name')}</label>
                  <input
                    className={`input ${validationError && !form.name?.trim() ? 'border-red-500' : ''}`}
                    value={form.name}
                    onInput={e => { setForm({...form, name: e.target.value}); setValidationError(null) }}
                    maxLength={43}
                    placeholder={t('tanks.enterName')}
                  />
                </div>
                {/* UID Display in Edit Mode */}
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-center py-1">
                  UID: {toHexUid(tank.uid)}
                </div>
                <div>
                   <label className="text-xs text-gray-400">{t('tanks.density')}</label>
                   <input type="number" step="1" className="input" value={form.density} onInput={e => setForm({...form, density: e.target.value})} placeholder="e.g. 550" />
                </div>
                <div>
                   <label className="text-xs text-gray-400">{t('tanks.capacity')}</label>
                   <input type="number" step="0.1" className="input" value={form.capacity} onInput={e => setForm({...form, capacity: e.target.value})} placeholder="e.g. 2.5" />
                </div>
                {validationError && (
                  <div className="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">
                    {validationError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(null); setValidationError(null) }} className="btn btn-secondary flex-1 py-2">{t('tanks.cancel')}</button>
                  <button onClick={save} className="btn btn-primary flex-1 py-2">{t('tanks.save')}</button>
                </div>
              </div>
            ) : (
              <div>
                 <div className="flex items-center gap-2 mb-1">
                   <h3 className="text-lg font-bold leading-tight">{tank.name || t('tanks.unnamedTank')}</h3>
                   {configured && (
                     <button
                       onClick={() => setRefillTank(tank)}
                       className="text-xs font-semibold px-2 py-0.5 rounded bg-green-600 hover:bg-green-500 text-white transition-colors"
                     >
                       {t('tanks.refill')}
                     </button>
                   )}
                 </div>
                 {/* Hex UID Subtitle */}
                 <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wide mb-3">
                   {toHexUid(tank.uid)}
                 </div>

                 {configured ? (
                   <div className="grid grid-cols-2 gap-2 text-xs">
                     <div className="bg-dark-surface p-2 rounded">
                        <span className="text-gray-500 block">{t('tanks.densityLabel')}</span>
                        <span className="font-mono text-white">{Number(tank.density).toFixed(0)} g/L</span>
                     </div>
                     <div className="bg-dark-surface p-2 rounded">
                        <span className="text-gray-500 block">{t('tanks.capacityLabel')}</span>
                        <span className="font-mono text-white">{Number(tank.capacity).toFixed(1)} L</span>
                     </div>
                   </div>
                 ) : (
                   <div className="text-sm text-gray-500 italic bg-dark-surface rounded p-3">
                     {t('tanks.enableHint')}
                   </div>
                 )}
              </div>
            )}
          </div>
        )
      })}

      {/* Refill Amount Selection Modal */}
      {refillTank && (
        <RefillModal
          tank={refillTank}
          onSelect={handleRefillSelect}
          onClose={() => setRefillTank(null)}
          t={t}
        />
      )}

      {/* Confirmation Modal */}
      {confirmRefill && (
        <ConfirmModal
          tank={confirmRefill.tank}
          amount={confirmRefill.amount}
          mode={confirmRefill.mode}
          onConfirm={handleConfirmRefill}
          onCancel={() => setConfirmRefill(null)}
          t={t}
        />
      )}

    </div>
  )
}