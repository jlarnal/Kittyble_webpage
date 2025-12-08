import { createContext } from 'preact'
import { useContext, useState, useCallback, useEffect, useRef } from 'preact/hooks'

const ApiContext = createContext()

// Initial State (Empty for PROD to avoid stale data flashing)
const createInitialState = () => {
  if (import.meta.env.PROD) return { status: {}, tanks: [], recipes: [], scale: {} }
  
  // DEV: Keep mocks for layout testing if needed, but they will be overwritten by fetch
  return {
    status: { battery: 0, state: "CONNECTING", error: "" },
    tanks: [],
    recipes: [],
    scale: { weight_g: 0.0 }
  }
}

const getPosixTz = () => {
    try {
        const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (iana.includes('Paris') || iana.includes('Berlin') || iana === 'CET') return "CET-1CEST,M3.5.0,M10.5.0/3";
        if (iana.includes('London') || iana === 'GMT') return "GMT0BST,M3.5.0/1,M10.5.0";
        if (iana.includes('New_York')) return "EST5EDT,M3.2.0,M11.1.0";
        
        const offset = -new Date().getTimezoneOffset() / 60;
        return `GMT${offset > 0 ? '-' : '+'}${Math.abs(offset)}`; 
    } catch (e) {
        return "GMT0";
    }
}

export function ApiProvider({ children }) {
  const [data, setData] = useState(createInitialState())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Ref pattern to prevent stale closures in async callbacks
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // 1. GENERIC API CALLER
  const apiCall = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    if (!options.silent) setError(null)
    
    try {
      console.log(`📡 Request: ${options.method || 'GET'} ${endpoint}`);
      
      const response = await fetch(`/api${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      })
      
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      
      const text = await response.text()
      const json = text ? JSON.parse(text) : { success: true }
      return json
      
    } catch (err) {
      console.error(`❌ API Failed: ${endpoint}`, err);
      if (!options.silent) setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 2. HELPER METHODS
  const refreshStatus = useCallback(() => apiCall('/status', { silent: true }).then(r => setData(p => ({...p, status: r}))), [apiCall])
  const refreshTanks = useCallback(() => apiCall('/tanks').then(r => setData(p => ({...p, tanks: r}))), [apiCall])
  const refreshRecipes = useCallback(() => apiCall('/recipes').then(r => setData(p => ({...p, recipes: r}))), [apiCall])
  const refreshScale = useCallback(() => apiCall('/scale').then(r => setData(p => ({...p, scale: r}))), [apiCall])

  // 3. INITIALIZATION
  useEffect(() => {
    let mounted = true;

    const performTimeSync = async () => {
        const now = Math.floor(Date.now() / 1000);
        try {
            // Attempt Extended TZ Sync
            await apiCall('/system/time', { 
                method: 'POST', 
                body: JSON.stringify({ epoch: now, tz: getPosixTz() }),
                silent: true 
            });
            console.log("✅ Time Sync (Extended) Success");
        } catch (e) {
            console.warn("⚠️ Extended Time Sync failed (400 expected on older firmware). Retrying simple epoch...");
            try {
                // Fallback to Simple Epoch
                await apiCall('/system/time', { 
                    method: 'POST', 
                    body: JSON.stringify({ epoch: now }),
                    silent: true 
                });
                console.log("✅ Time Sync (Simple) Success");
            } catch (e2) {
                console.warn("❌ All Time Sync attempts failed. Ignoring.");
            }
        }
    };

    const loadInitialData = async () => {
        try {
            // Fetch critical data in parallel
            await Promise.all([
                refreshStatus().catch(e => console.warn("Status fetch failed", e)),
                refreshTanks().catch(e => console.warn("Tanks fetch failed", e)),
                refreshRecipes().catch(e => console.warn("Recipes fetch failed", e))
            ]);
            console.log("🚀 Initial Data Load Complete");
        } catch (e) {
            console.error("💥 Critical Init Error:", e);
        }
    };

    const init = async () => {
        // Run Time Sync and Data Load INDEPENDENTLY
        // This ensures data loads even if time sync crashes
        performTimeSync(); 
        await loadInitialData();
    };

    if (mounted) init();

    return () => { mounted = false; };
  }, [apiCall, refreshStatus, refreshTanks, refreshRecipes]);

  const value = {
    data, loading, error, apiCall,
    refreshStatus, refreshTanks, refreshRecipes, refreshScale,
    
    feedImmediate: (tankUid, amount) => {
        console.log(`🖱️ Action: Feed Immediate ${amount}g from ${tankUid}`);
        return apiCall('/feed/immediate', {
            method: 'POST', body: JSON.stringify({ tank_uid: tankUid, amount_grams: amount })
        });
    },
    stopFeed: () => apiCall('/feed/stop', { method: 'POST' }),
    updateTank: (uid, body) => apiCall(`/tanks/${uid}`, { method: 'POST', body: JSON.stringify(body) }).then(refreshTanks),
    calibrateTank: (uid, pwm) => apiCall(`/tanks/${uid}/calibration`, { method: 'POST', body: JSON.stringify({ servo_idle_pwm: pwm }) }),
    updateRecipe: (recipe) => apiCall('/recipes', { method: 'POST', body: JSON.stringify(recipe) }).then(refreshRecipes),
    deleteRecipe: (id) => apiCall(`/recipes/${id}`, { method: 'DELETE' }).then(refreshRecipes),
    tareScale: () => apiCall('/scale/tare', { method: 'POST' }).then(refreshScale),
    scanWifi: () => apiCall('/wifi/scan'),
    connectWifi: (ssid, pass) => apiCall('/wifi/connect', { method: 'POST', body: JSON.stringify({ ssid, password: pass }) }),
    reboot: () => apiCall('/system/reboot', { method: 'POST' })
  }

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export const useApi = () => useContext(ApiContext)