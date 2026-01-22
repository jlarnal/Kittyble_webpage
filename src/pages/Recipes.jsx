import { useState, useRef, useCallback } from 'preact/hooks'
import { useApi } from '../hooks/useApi'
import { useI18n } from '../i18n/I18nProvider'

// Colors for tank segments in the mixer bar
const SEGMENT_COLORS = [
  'bg-cyan-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-blue-500',
]

// Check if tank has valid configuration (density and capacity > 0)
const isTankConfigured = (tank) => tank.capacity > 0 && tank.density > 0

// Missing Tanks Resolver Component - shown when editing recipes with orphaned ingredients
function MissingTanksResolver({ tanks, ingredients, onChange, toHexUid, t }) {
  const configuredTanks = tanks.filter(isTankConfigured)

  // Find missing ingredients (tanks that no longer exist or aren't configured)
  const missingIngredients = ingredients.filter(ing => {
    const tank = configuredTanks.find(t => String(t.uid) === String(ing.tankUid))
    return !tank
  })

  if (missingIngredients.length === 0) return null

  // Handle substitution of a missing tank with another
  const handleSubstitute = (missingTankUid, replacementTankUid) => {
    const missingIng = ingredients.find(ing => String(ing.tankUid) === String(missingTankUid))
    if (!missingIng) return

    // Check if replacement tank is already in the mix
    const existingIng = ingredients.find(ing => String(ing.tankUid) === String(replacementTankUid))

    let newIngredients
    if (existingIng) {
      // Merge: add missing percentage to existing, remove missing
      newIngredients = ingredients
        .map(ing => {
          if (String(ing.tankUid) === String(replacementTankUid)) {
            return { ...ing, percentage: ing.percentage + missingIng.percentage }
          }
          return ing
        })
        .filter(ing => String(ing.tankUid) !== String(missingTankUid))
    } else {
      // Replace: swap the tankUid
      newIngredients = ingredients.map(ing => {
        if (String(ing.tankUid) === String(missingTankUid)) {
          return { ...ing, tankUid: replacementTankUid }
        }
        return ing
      })
    }

    onChange(newIngredients)
  }

  // Remove a missing ingredient entirely (redistribute to remaining)
  const handleRemove = (missingTankUid) => {
    const missingIng = ingredients.find(ing => String(ing.tankUid) === String(missingTankUid))
    if (!missingIng) return

    const remaining = ingredients.filter(ing => String(ing.tankUid) !== String(missingTankUid))

    if (remaining.length === 0) {
      onChange([])
      return
    }

    // Redistribute the missing percentage proportionally
    const totalRemaining = remaining.reduce((sum, ing) => sum + ing.percentage, 0)
    const redistributed = remaining.map(ing => ({
      ...ing,
      percentage: totalRemaining > 0
        ? Math.round(ing.percentage + (ing.percentage / totalRemaining) * missingIng.percentage)
        : Math.round(100 / remaining.length)
    }))

    // Fix rounding errors
    const diff = 100 - redistributed.reduce((sum, ing) => sum + ing.percentage, 0)
    if (redistributed.length > 0) redistributed[0].percentage += diff

    onChange(redistributed)
  }

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-warning">
        <span className="text-lg">⚠️</span>
        <span className="font-semibold text-sm">
          {t('recipes.missingTanks', { count: missingIngredients.length })}
        </span>
      </div>

      <div className="space-y-2">
        {missingIngredients.map(ing => (
          <div key={ing.tankUid} className="bg-dark-surface rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-xs text-gray-500">{t('recipes.unknownTank')}</div>
                <div className="text-[10px] font-mono text-gray-600">{toHexUid(ing.tankUid)}</div>
              </div>
              <span className="text-sm font-bold text-warning">{ing.percentage}%</span>
            </div>

            <div className="flex gap-2">
              <select
                className="input flex-1 py-1.5 text-sm"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleSubstitute(ing.tankUid, e.target.value)
                  }
                }}
              >
                <option value="" disabled>{t('recipes.replaceWith')}</option>
                {configuredTanks.map(tank => {
                  const alreadyInMix = ingredients.some(i => String(i.tankUid) === String(tank.uid))
                  return (
                    <option key={tank.uid} value={tank.uid}>
                      {tank.name} {alreadyInMix ? t('recipes.merge') : ''}
                    </option>
                  )
                })}
              </select>
              <button
                onClick={() => handleRemove(ing.tankUid)}
                className="btn btn-secondary py-1.5 px-3 text-xs"
                title={t('recipes.remove')}
              >
                {t('recipes.remove')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Draggable Stacked Bar Mixer Component
function StackedBarMixer({ tanks, ingredients, onChange, toHexUid, t }) {
  const barRef = useRef(null)
  const draggingRef = useRef(null) // Use ref for drag state to avoid closure issues
  const [, forceUpdate] = useState(0) // For re-render on drag state change

  // Only show configured tanks
  const configuredTanks = tanks.filter(isTankConfigured)

  // Get selected tanks with their percentages
  const selectedTanks = ingredients.map(ing => {
    const tank = configuredTanks.find(t => String(t.uid) === String(ing.tankUid))
    return { ...ing, tank }
  }).filter(ing => ing.tank)

  // Keep a ref to current values for use in event handlers
  const stateRef = useRef({ selectedTanks, ingredients, onChange })
  stateRef.current = { selectedTanks, ingredients, onChange }

  // Check if a tank is selected
  const isTankSelected = (uid) => ingredients.some(ing => String(ing.tankUid) === String(uid))

  // Toggle tank selection
  const toggleTank = (tank) => {
    if (isTankSelected(tank.uid)) {
      // Remove tank and redistribute
      const remaining = ingredients.filter(ing => String(ing.tankUid) !== String(tank.uid))
      if (remaining.length === 0) {
        onChange([])
      } else {
        // Redistribute proportionally
        const totalRemaining = remaining.reduce((sum, ing) => sum + ing.percentage, 0)
        const redistributed = remaining.map(ing => ({
          ...ing,
          percentage: totalRemaining > 0
            ? Math.round((ing.percentage / totalRemaining) * 100)
            : Math.round(100 / remaining.length)
        }))
        // Fix rounding errors
        const diff = 100 - redistributed.reduce((sum, ing) => sum + ing.percentage, 0)
        if (redistributed.length > 0) redistributed[0].percentage += diff
        onChange(redistributed)
      }
    } else {
      // Add tank with equal share
      const newCount = ingredients.length + 1
      const newShare = Math.round(100 / newCount)
      const oldShare = 100 - newShare

      const redistributed = ingredients.map(ing => ({
        ...ing,
        percentage: ingredients.length > 0
          ? Math.round((ing.percentage / 100) * oldShare)
          : 0
      }))

      // Fix rounding errors on existing
      const existingTotal = redistributed.reduce((sum, ing) => sum + ing.percentage, 0)
      const targetExisting = 100 - newShare
      if (redistributed.length > 0 && existingTotal !== targetExisting) {
        redistributed[0].percentage += (targetExisting - existingTotal)
      }

      redistributed.push({ tankUid: tank.uid, percentage: newShare })
      onChange(redistributed)
    }
  }

  // Handle drag movement - uses refs to get current values
  const handleDragMove = useCallback((e) => {
    const dragIndex = draggingRef.current
    if (dragIndex === null || !barRef.current) return

    const { selectedTanks, ingredients, onChange } = stateRef.current
    if (selectedTanks.length < 2) return

    const rect = barRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const percent = (x / rect.width) * 100

    // Calculate cumulative percentage up to the divider
    let cumBefore = 0
    for (let i = 0; i < dragIndex; i++) {
      cumBefore += selectedTanks[i].percentage
    }

    // The divider is between segment[dragIndex] and segment[dragIndex+1]
    const minPercent = 1
    const leftSeg = selectedTanks[dragIndex]
    const rightSeg = selectedTanks[dragIndex + 1]

    if (!leftSeg || !rightSeg) return

    const combined = leftSeg.percentage + rightSeg.percentage
    let newLeft = Math.round(percent - cumBefore)

    // Clamp to valid range
    newLeft = Math.max(minPercent, Math.min(combined - minPercent, newLeft))
    const newRight = combined - newLeft

    // Update ingredients
    const newIngredients = ingredients.map(ing => {
      if (String(ing.tankUid) === String(leftSeg.tankUid)) {
        return { ...ing, percentage: newLeft }
      }
      if (String(ing.tankUid) === String(rightSeg.tankUid)) {
        return { ...ing, percentage: newRight }
      }
      return ing
    })

    onChange(newIngredients)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    draggingRef.current = null
    forceUpdate(n => n + 1)
    document.removeEventListener('pointermove', handleDragMove)
    document.removeEventListener('pointerup', handleDragEnd)
  }, [handleDragMove])

  // Handle drag start on divider
  const handleDragStart = (e, index) => {
    e.preventDefault()
    draggingRef.current = index
    forceUpdate(n => n + 1)
    document.addEventListener('pointermove', handleDragMove)
    document.addEventListener('pointerup', handleDragEnd)
  }

  return (
    <div className="space-y-4">
      {/* Tank Toggle Buttons */}
      <div>
        <div className="text-xs text-gray-400 mb-2">{t('recipes.selectTanks')}</div>
        <div className="flex flex-wrap gap-2">
          {configuredTanks.map((tank, idx) => {
            const selected = isTankSelected(tank.uid)
            const colorClass = selected ? SEGMENT_COLORS[ingredients.findIndex(ing => String(ing.tankUid) === String(tank.uid)) % SEGMENT_COLORS.length] : 'bg-gray-700'
            return (
              <button
                key={tank.uid}
                onClick={() => toggleTank(tank)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selected
                    ? `${colorClass} text-white shadow-lg`
                    : 'bg-dark-surface text-gray-400 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selected ? 'bg-white' : 'bg-gray-500'}`} />
                  <span>{tank.name || t('tanks.unnamedTank')}</span>
                  <span className="text-[10px] opacity-70">#{tank.busIndex}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stacked Bar Visualization */}
      {selectedTanks.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-2">
            {t('recipes.dragDividers')}
          </div>

          {/* The bar */}
          <div
            ref={barRef}
            className="relative h-14 rounded-xl overflow-hidden flex select-none touch-none"
          >
            {selectedTanks.map((item, idx) => {
              const colorClass = SEGMENT_COLORS[idx % SEGMENT_COLORS.length]
              return (
                <div
                  key={item.tankUid}
                  className={`${colorClass} relative flex items-center justify-center transition-all duration-75`}
                  style={{ width: `${item.percentage}%` }}
                >
                  {/* Percentage label */}
                  <div className="text-white text-sm font-bold drop-shadow-lg">
                    {item.percentage}%
                  </div>

                  {/* Divider handle (between this and next segment) */}
                  {idx < selectedTanks.length - 1 && (
                    <div
                      onPointerDown={(e) => handleDragStart(e, idx)}
                      className={`absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize z-10 flex items-center justify-center
                        ${draggingRef.current === idx ? 'bg-white/30' : 'hover:bg-white/20'}`}
                      style={{ transform: 'translateX(50%)' }}
                    >
                      <div className="w-1 h-8 bg-white/50 rounded-full" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {selectedTanks.map((item, idx) => (
              <div key={item.tankUid} className="flex items-center gap-1.5 text-xs">
                <div className={`w-3 h-3 rounded ${SEGMENT_COLORS[idx % SEGMENT_COLORS.length]}`} />
                <span className="text-gray-300">{item.tank?.name}</span>
                <span className="text-gray-500">({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTanks.length === 0 && configuredTanks.length > 0 && (
        <div className="text-center py-6 text-gray-500 text-sm bg-dark-surface rounded-xl">
          {t('recipes.selectAtLeastOne')}
        </div>
      )}

      {configuredTanks.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm bg-dark-surface rounded-xl">
          {t('recipes.noConfiguredTanks')}
        </div>
      )}
    </div>
  )
}

// Delete Confirmation Modal
function DeleteConfirmModal({ recipe, onConfirm, onCancel, t }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-dark-card rounded-2xl p-5 w-full max-w-sm animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3">{t('recipes.deleteRecipe')}</h3>

        <div className="bg-dark-surface rounded-xl p-4 mb-4">
          <div className="font-semibold text-white">{recipe.name}</div>
          <div className="text-xs text-gray-400 mt-1">
            {recipe.dailyWeight}g / {recipe.servings} {t('recipes.servings').toLowerCase()}
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          {t('recipes.cannotUndo')}
        </p>

        <div className="flex gap-2">
          <button onClick={onCancel} className="btn btn-secondary flex-1 py-3">
            {t('recipes.cancel')}
          </button>
          <button onClick={onConfirm} className="btn btn-danger flex-1 py-3 font-semibold">
            {t('recipes.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Recipes() {
  const { data, updateRecipe, deleteRecipe, toHexUid } = useApi()
  const { t } = useI18n()
  const [editorOpen, setEditorOpen] = useState(false)
  const [current, setCurrent] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const openEditor = (recipe = null) => {
    if (!recipe) {
      // New recipe - don't include uid, server will assign one
      setCurrent({ name: '', dailyWeight: 100, servings: 2, ingredients: [] })
    } else {
      setCurrent({ ...recipe })
    }
    setEditorOpen(true)
  }

  const save = async () => {
    if (current.ingredients.length === 0) {
      return alert(t('recipes.selectTankAlert'))
    }

    const total = current.ingredients.reduce((acc, curr) => acc + (curr.percentage || 0), 0)
    if (Math.abs(total - 100) > 0.1) {
      return alert(t('recipes.percentageAlert', { total }))
    }

    await updateRecipe(current)
    setEditorOpen(false)
  }

  const handleIngredientsChange = (newIngredients) => {
    setCurrent({ ...current, ingredients: newIngredients })
  }

  if (editorOpen) return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{!current.uid ? t('recipes.newRecipe') : t('recipes.editRecipe')}</h2>
        <button onClick={() => setEditorOpen(false)} className="text-gray-400">{t('recipes.cancel')}</button>
      </div>

      <div className="space-y-4">
        <input className="input" placeholder={t('recipes.recipeName')} value={current.name} onInput={e => setCurrent({...current, name: e.target.value})} />

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-gray-400">{t('recipes.gramsPerDay')}</label>
                <input type="number" className="input" value={current.dailyWeight} onInput={e => setCurrent({...current, dailyWeight: Number(e.target.value)})} />
            </div>
            <div>
                <label className="text-xs text-gray-400">{t('recipes.servings')}</label>
                <input type="number" className="input" value={current.servings} onInput={e => setCurrent({...current, servings: Number(e.target.value)})} />
            </div>
        </div>

        {/* Missing tanks resolver - shown when editing recipes with orphaned ingredients */}
        <MissingTanksResolver
          tanks={data.tanks || []}
          ingredients={current.ingredients}
          onChange={handleIngredientsChange}
          toHexUid={toHexUid}
          t={t}
        />

        <div className="card">
          <div className="heading-section mb-3">{t('recipes.mixer')}</div>
          <StackedBarMixer
            tanks={data.tanks || []}
            ingredients={current.ingredients}
            onChange={handleIngredientsChange}
            toHexUid={toHexUid}
            t={t}
          />
        </div>

        <button onClick={save} className="btn btn-primary w-full">{t('recipes.saveRecipe')}</button>
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('recipes.title')}</h2>
        <button onClick={() => openEditor()} className="btn btn-primary py-2 px-4 text-sm">{t('recipes.new')}</button>
      </div>

      <div className="space-y-3">
        {data.recipes.map(r => {
          // Resolve tank names for the legend
          const allIngredients = (r.ingredients || []).map(ing => {
            const tank = data.tanks?.find(t => String(t.uid) === String(ing.tankUid))
            return { ...ing, tank }
          })
          const ingredientsWithTanks = allIngredients.filter(ing => ing.tank)
          const missingIngredients = allIngredients.filter(ing => !ing.tank)
          const missingPercentage = missingIngredients.reduce((sum, ing) => sum + ing.percentage, 0)

          return (
            <div key={r.uid} className="card">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{r.name}</h3>
                  <div className="text-xs text-gray-400 mt-1">{r.dailyWeight}g / {r.servings} {t('recipes.servings').toLowerCase()}</div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEditor(r)} className="text-gray-400">{t('recipes.edit')}</button>
                  <button onClick={() => setDeleteTarget(r)} className="text-error">{t('recipes.delete')}</button>
                </div>
              </div>

              {/* Missing tanks warning */}
              {missingIngredients.length > 0 && (
                <div className="mt-2 px-2 py-1.5 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
                  <span className="text-warning text-sm">⚠️</span>
                  <span className="text-warning text-xs">
                    {t('recipes.tanksMissing', { count: missingIngredients.length, percent: missingPercentage })}
                  </span>
                </div>
              )}

              {/* Composition Legend */}
              {ingredientsWithTanks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  {/* Mini stacked bar */}
                  <div className="h-2 rounded-full overflow-hidden flex mb-2">
                    {ingredientsWithTanks.map((ing, idx) => (
                      <div
                        key={ing.tankUid}
                        className={`${SEGMENT_COLORS[idx % SEGMENT_COLORS.length]}`}
                        style={{ width: `${ing.percentage}%` }}
                      />
                    ))}
                    {/* Missing portion shown as striped/warning */}
                    {missingPercentage > 0 && (
                      <div
                        className="bg-warning/30"
                        style={{ width: `${missingPercentage}%` }}
                      />
                    )}
                  </div>
                  {/* Tank labels */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {ingredientsWithTanks.map((ing, idx) => (
                      <div key={ing.tankUid} className="flex items-center gap-1 text-[10px]">
                        <div className={`w-2 h-2 rounded-sm ${SEGMENT_COLORS[idx % SEGMENT_COLORS.length]}`} />
                        <span className="text-gray-400">{ing.tank?.name}</span>
                        <span className="text-gray-600">{ing.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          recipe={deleteTarget}
          onConfirm={async () => {
            await deleteRecipe(deleteTarget.uid)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
          t={t}
        />
      )}
    </div>
  )
}