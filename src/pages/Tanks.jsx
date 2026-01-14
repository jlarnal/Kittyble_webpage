import { useState } from 'preact/hooks'
import { useApi } from '../hooks/useApi'

// Common EU kibble bag sizes (grams)
const REFILL_AMOUNTS = [
  { grams: 400, label: '400g' },
  { grams: 800, label: '800g' },
  { grams: 1000, label: '1kg' },
  { grams: 1500, label: '1.5kg' },
  { grams: 2000, label: '2kg' },
  { grams: 3000, label: '3kg' },
  { grams: 4000, label: '4kg' },
  { grams: 7000, label: '7kg' },
]

// Refill Amount Selection Modal
function RefillModal({ tank, onSelect, onClose }) {
  const [customValue, setCustomValue] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Compute max capacity in grams (density is in kg/L, so multiply by 1000)
  const maxCapacityGrams = tank.capacity * tank.density * 1000
  const currentWeight = tank.remainingWeight || 0
  const remainingSpace = Math.max(0, maxCapacityGrams - currentWeight)

  const handleCustomSubmit = () => {
    const value = parseInt(customValue, 10)
    if (value > 0) {
      onSelect(value)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-card rounded-2xl p-5 w-full max-w-sm animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-1">Refill {tank.name}</h3>
        <p className="text-xs text-gray-400 mb-4">
          Current: {Number(currentWeight).toFixed(0)}g · Max: {Number(maxCapacityGrams).toFixed(0)}g · Space: {Number(remainingSpace).toFixed(0)}g
        </p>

        {!showCustomInput ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {REFILL_AMOUNTS.map(({ grams, label }) => (
                <button
                  key={grams}
                  onClick={() => onSelect(grams)}
                  className="btn btn-secondary py-3 text-sm font-semibold hover:bg-accent-primary/20 hover:border-accent-primary transition-colors"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setShowCustomInput(true)}
                className="btn btn-secondary py-3 text-sm font-semibold bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                Custom
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3 mb-3">
            <div>
              <label className="text-xs text-gray-400">Enter amount (grams)</label>
              <input
                type="number"
                className="input text-center text-lg"
                value={customValue}
                onInput={e => setCustomValue(e.target.value)}
                placeholder="e.g. 2500"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCustomSubmit} className="btn btn-primary flex-1 py-2">
                Add {customValue || '0'}g
              </button>
              <button onClick={() => setShowCustomInput(false)} className="btn btn-secondary flex-1 py-2">
                Back
              </button>
            </div>
          </div>
        )}

        {!showCustomInput && (
          <button onClick={onClose} className="btn btn-secondary w-full py-2 mt-1">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

// Confirmation Modal
function ConfirmModal({ tank, amount, onConfirm, onCancel }) {
  const currentWeight = tank.remainingWeight || 0
  const newWeight = currentWeight + amount
  const maxCapacityGrams = tank.capacity * tank.density * 1000
  const wouldOverflow = newWeight > maxCapacityGrams

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-dark-card rounded-2xl p-5 w-full max-w-sm animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3">Confirm Refill</h3>

        <div className="bg-dark-surface rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Tank</span>
            <span className="font-semibold">{tank.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Adding</span>
            <span className="font-mono text-accent-primary">+{amount}g</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between">
            <span className="text-gray-400">Current</span>
            <span className="font-mono">{Number(currentWeight).toFixed(0)}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">New total</span>
            <span className={`font-mono font-bold ${wouldOverflow ? 'text-tank-low' : 'text-tank-full'}`}>
              {Number(newWeight).toFixed(0)}g
            </span>
          </div>
          {wouldOverflow && (
            <div className="text-xs text-tank-low mt-2">
              Warning: This exceeds tank capacity ({Number(maxCapacityGrams).toFixed(0)}g). The value will be capped.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onConfirm} className="btn btn-primary flex-1 py-3 font-semibold">
            Yes, Refill
          </button>
          <button onClick={onCancel} className="btn btn-secondary flex-1 py-3">
            No, Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function Tanks() {
  const { data, updateTank, toHexUid } = useApi()
  const [editing, setEditing] = useState(null)
  const [refillTank, setRefillTank] = useState(null)
  const [confirmRefill, setConfirmRefill] = useState(null) // { tank, amount }

  const [form, setForm] = useState({})

  const startEdit = (tank) => {
    setEditing(tank.uid)
    setForm({ ...tank })
  }

  const save = async () => {
    await updateTank(editing, { name: form.name, density: Number(form.density), capacity: Number(form.capacity) })
    setEditing(null)
  }

  // Refill flow: user selects amount -> show confirmation -> execute
  const handleRefillSelect = (amount) => {
    setConfirmRefill({ tank: refillTank, amount })
    setRefillTank(null)
  }

  const handleConfirmRefill = async () => {
    const { tank, amount } = confirmRefill
    const maxCapacityGrams = tank.capacity * tank.density * 1000
    const currentWeight = tank.remainingWeight || 0
    const newWeight = Math.min(currentWeight + amount, maxCapacityGrams)

    await updateTank(tank.uid, { remainingWeight: Math.round(newWeight) })
    setConfirmRefill(null)
  }

  return (
    <div className="p-4 pb-20 space-y-4">
      <h2 className="text-2xl font-bold">Tank Manager</h2>
      
      {data.tanks.map(tank => (
        <div key={tank.uid} className="card">
          <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">Slot {tank.busIndex}</span>
             </div>
             {editing !== tank.uid && (
                 <button onClick={() => startEdit(tank)} className="text-accent-primary text-sm font-semibold">Edit</button>
             )}
          </div>

          {editing === tank.uid ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="text-xs text-gray-400">Name</label>
                <input className="input" value={form.name} onInput={e => setForm({...form, name: e.target.value})} maxLength={43} />
              </div>
              {/* UID Display in Edit Mode */}
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-center py-1">
                UID: {toHexUid(tank.uid)}
              </div>
              <div>
                 <label className="text-xs text-gray-400">Density (kg/L)</label>
                 <input type="number" className="input" value={form.density} onInput={e => setForm({...form, density: e.target.value})} />
              </div>
              <div>
                 <label className="text-xs text-gray-400">Capacity (L)</label>
                 <input type="number" step="0.1" className="input" value={form.capacity} onInput={e => setForm({...form, capacity: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="btn btn-primary flex-1 py-2">Save</button>
                <button onClick={() => setEditing(null)} className="btn btn-secondary flex-1 py-2">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
               <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-lg font-bold leading-tight">{tank.name}</h3>
                 <button
                   onClick={() => setRefillTank(tank)}
                   className="text-xs font-semibold px-2 py-0.5 rounded bg-green-600 hover:bg-green-500 text-white transition-colors"
                 >
                   Refill
                 </button>
               </div>
               {/* Hex UID Subtitle */}
               <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wide mb-3">
                 {toHexUid(tank.uid)}
               </div>

               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="bg-dark-surface p-2 rounded">
                    <span className="text-gray-500 block">Density</span>
                    <span className="font-mono text-white">{Number(tank.density).toFixed(3)} kg/L</span>
                 </div>
                 <div className="bg-dark-surface p-2 rounded">
                    <span className="text-gray-500 block">Capacity</span>
                    <span className="font-mono text-white">{Number(tank.capacity).toFixed(3)} L</span>
                 </div>
               </div>
            </div>
          )}
        </div>
      ))}

      {/* Refill Amount Selection Modal */}
      {refillTank && (
        <RefillModal
          tank={refillTank}
          onSelect={handleRefillSelect}
          onClose={() => setRefillTank(null)}
        />
      )}

      {/* Confirmation Modal */}
      {confirmRefill && (
        <ConfirmModal
          tank={confirmRefill.tank}
          amount={confirmRefill.amount}
          onConfirm={handleConfirmRefill}
          onCancel={() => setConfirmRefill(null)}
        />
      )}
    </div>
  )
}