import { useState } from 'react'
import { RequirementForm } from './components/RequirementForm'
import type { Requirements } from './components/RequirementForm'
import { DesignVisualizer } from './components/DesignVisualizer'
import { Aerodynamics } from './components/Aerodynamics'
import { Settings } from './components/Settings'

function App() {
  const [currentView, setCurrentView] = useState<'sizing' | 'aero' | 'settings'>('sizing');
  const [designReqs, setDesignReqs] = useState<Requirements>({
    range: 1000,
    payload: 400,
    speed: 60,
    airfoil: 'NACA2412'
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Phoenix <span className="text-slate-400 font-normal">| Aircraft Design Platform</span>
          </h1>
          <nav>
            <ul className="flex space-x-6 text-sm font-medium text-slate-400">
              <li
                onClick={() => setCurrentView('sizing')}
                className={`cursor-pointer transition ${currentView === 'sizing' ? 'text-white border-b-2 border-blue-500' : 'hover:text-white'}`}
              >
                Sizing Tool
              </li>
              <li
                onClick={() => setCurrentView('aero')}
                className={`cursor-pointer transition ${currentView === 'aero' ? 'text-white border-b-2 border-blue-500' : 'hover:text-white'}`}
              >
                Aerodynamics
              </li>
              <li
                onClick={() => setCurrentView('settings')}
                className={`cursor-pointer transition ${currentView === 'settings' ? 'text-white border-b-2 border-blue-500' : 'hover:text-white'}`}
              >
                Settings
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-8">
        {currentView === 'sizing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

            {/* Left Column: Context/Info -> NOW VISUALIZATION */}
            <div className="space-y-6">
              <div className="prose prose-invert">
                <h2 className="text-3xl font-extrabold text-white">Geometric Sizing</h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Real-time estimation of aircraft geometry based on mission requirements.
                </p>
              </div>

              <DesignVisualizer reqs={designReqs} />
            </div>

            {/* Right Column: Input Form */}
            <div>
              <RequirementForm data={designReqs} onChange={setDesignReqs} />
            </div>

          </div>
        )}

        {currentView === 'aero' && <Aerodynamics />}

        {currentView === 'settings' && <Settings />}

      </main>
    </div>
  )
}

export default App
