import { useState } from 'preact/hooks'
import { useApi } from '../hooks/useApi'

export function Tanks() {
  const { data, updateTank } = useApi()
  const [editing, setEditing] = useState(null)
  
  const [form, setForm] = useState({})

  const startEdit = (tank) => {
    setEditing(tank.uid)
    setForm({ ...tank })
  }

  const save = async () => {
    await updateTank(editing, { name: form.name, density: Number(form.density) })
    setEditing(null)
  }

  return (
    <div className="p-4 pb-20 space-y-4">
      <h2 className="text-2xl font-bold">Tank Manager</h2>
      
      {data.tanks.map(tank => (
        <div key={tank.uid} className="card">
          <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">Slot {tank.slot}</span>
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
                UID: {tank.uid}
              </div>
              <div>
                 <label className="text-xs text-gray-400">Density (g/L)</label>
                 <input type="number" className="input" value={form.density} onInput={e => setForm({...form, density: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="btn btn-primary flex-1 py-2">Save</button>
                <button onClick={() => setEditing(null)} className="btn btn-secondary flex-1 py-2">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
               <h3 className="text-lg font-bold leading-tight">{tank.name}</h3>
               {/* Updated: Hex UID Subtitle */}
               <div className="text-[10px] font-mono text-gray-600 uppercase tracking-wide mb-3">
                 {tank.uid}
               </div>

               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="bg-dark-surface p-2 rounded">
                    <span className="text-gray-500 block">Density</span>
                    <span className="font-mono text-white">{tank.density} g/L</span>
                 </div>
                 <div className="bg-dark-surface p-2 rounded">
                    <span className="text-gray-500 block">Capacity</span>
                    <span className="font-mono text-white">{tank.capacity} mL</span>
                 </div>
               </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}