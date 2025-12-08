import { useState } from 'preact/hooks'
import { useApi } from '../hooks/useApi'

export function Recipes() {
  const { data, updateRecipe, deleteRecipe } = useApi()
  const [editorOpen, setEditorOpen] = useState(false)
  const [current, setCurrent] = useState(null)

  const openEditor = (recipe = null) => {
    if (!recipe) {
      setCurrent({ id: 0, name: '', is_enabled: true, daily_weight: 100, servings: 2, ingredients: [] })
    } else {
      setCurrent({ ...recipe }) 
    }
    setEditorOpen(true)
  }

  const save = async () => {
    const total = current.ingredients.reduce((acc, curr) => acc + (curr.percentage || 0), 0)
    if (Math.abs(total - 100) > 0.1) return alert(`Ingredients must sum to 100% (Current: ${total}%)`)
    
    await updateRecipe(current)
    setEditorOpen(false)
  }

  const addIng = () => {
    if (current.ingredients.length >= 6) return
    setCurrent({
        ...current,
        ingredients: [...current.ingredients, { tank_uid: data.tanks[0]?.uid, percentage: 0 }]
    })
  }

  if (editorOpen) return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{current.id === 0 ? 'New Recipe' : 'Edit Recipe'}</h2>
        <button onClick={() => setEditorOpen(false)} className="text-gray-400">Cancel</button>
      </div>

      <div className="space-y-4">
        <input className="input" placeholder="Name" value={current.name} onInput={e => setCurrent({...current, name: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-gray-400">Grams/Day</label>
                <input type="number" className="input" value={current.daily_weight} onInput={e => setCurrent({...current, daily_weight: Number(e.target.value)})} />
            </div>
            <div>
                <label className="text-xs text-gray-400">Servings</label>
                <input type="number" className="input" value={current.servings} onInput={e => setCurrent({...current, servings: Number(e.target.value)})} />
            </div>
        </div>

        <div className="card">
            <div className="flex justify-between items-center mb-2">
                <span className="heading-section mb-0">Mixer</span>
                <button onClick={addIng} className="text-accent-primary text-xs font-bold">+ Add Tank</button>
            </div>
            {current.ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                    <select 
                        className="input py-2 text-xs flex-1" 
                        value={ing.tank_uid}
                        onChange={e => {
                            const newIngs = [...current.ingredients];
                            newIngs[idx].tank_uid = e.target.value;
                            setCurrent({...current, ingredients: newIngs});
                        }}
                    >
                        {data.tanks.map(t => (
                            // Updated: UID in Dropdown
                            <option key={t.uid} value={t.uid}>
                                {t.name} (Slot {t.slot}) - {t.uid.substring(0,6)}...
                            </option>
                        ))}
                    </select>
                    <div className="relative w-20">
                        <input 
                            type="number" className="input py-2 text-xs pr-5" 
                            value={ing.percentage}
                            onInput={e => {
                                const newIngs = [...current.ingredients];
                                newIngs[idx].percentage = Number(e.target.value);
                                setCurrent({...current, ingredients: newIngs});
                            }}
                        />
                        <span className="absolute right-2 top-2.5 text-gray-400 text-xs">%</span>
                    </div>
                </div>
            ))}
        </div>

        <button onClick={save} className="btn btn-primary w-full">Save Recipe</button>
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Recipe Studio</h2>
        <button onClick={() => openEditor()} className="btn btn-primary py-2 px-4 text-sm">+ New</button>
      </div>
      
      <div className="space-y-3">
        {data.recipes.map(r => (
            <div key={r.id} className="card flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${r.is_enabled ? 'bg-success' : 'bg-gray-600'}`} />
                        <h3 className="font-bold">{r.name}</h3>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{r.daily_weight}g / {r.servings} servings</div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => openEditor(r)} className="text-gray-400">Edit</button>
                    <button onClick={() => deleteRecipe(r.id)} className="text-error">Del</button>
                </div>
            </div>
        ))}
      </div>
    </div>
  )
}