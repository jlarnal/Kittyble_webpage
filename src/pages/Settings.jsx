import { useState } from 'preact/hooks'
import { route } from 'preact-router'
import { useApi } from '../hooks/useApi'

export function Settings() {
  const { data, tareScale, scanWifi, connectWifi, reboot } = useApi()
  const [wifiList, setWifiList] = useState(null)
  
  const handleScan = async () => {
      setWifiList('scanning')
      const res = await scanWifi()
      setWifiList(res)
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <div className="card space-y-4">
        <div className="heading-section">General</div>
        <div className="flex justify-between items-center">
            <div>
                <div className="font-bold">Scale</div>
                <div className="text-xs text-gray-400">Current Reading</div>
            </div>
            <div className="flex items-center gap-3">
                <span className="font-mono text-xl text-accent-primary">{data.scale?.weight_g?.toFixed(1) || '0.0'}g</span>
                <button onClick={tareScale} className="btn btn-secondary py-1 px-3 text-xs">Tare</button>
            </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="heading-section">WiFi</div>
        {!wifiList ? (
            <button onClick={handleScan} className="btn btn-secondary w-full">Scan Networks</button>
        ) : wifiList === 'scanning' ? (
            <div className="text-center text-sm animate-pulse">Scanning...</div>
        ) : (
            <div className="space-y-2">
                {wifiList.map((net, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-dark-surface rounded">
                        <span className="font-medium">{net.ssid}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{net.rssi}dBm</span>
                            <button onClick={() => connectWifi(net.ssid, prompt("Password"))} className="text-accent-primary text-xs font-bold">Connect</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      <div className="space-y-2">
        <button onClick={() => route('/settings/calibration')} className="card w-full flex justify-between items-center hover:bg-dark-surface/50">
            <span className="font-bold">Servo Calibration</span>
            <span className="text-gray-500">→</span>
        </button>
        
        <div className="card">
            <div className="heading-section">Firmware Update</div>
            <input type="file" className="text-sm text-gray-400 w-full" onChange={(e) => {
                const form = new FormData();
                form.append('update', e.target.files[0]);
                fetch('/api/system/update', { method: 'POST', body: form });
            }} />
        </div>
      </div>

      <div className="pt-4">
        <button onClick={reboot} className="btn btn-danger w-full">Restart Device</button>
      </div>
    </div>
  )
}
