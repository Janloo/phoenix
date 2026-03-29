import { useState, useEffect } from 'react'
import { RequirementForm } from './components/RequirementForm'
import type { Requirements } from './components/RequirementForm'
import { DesignVisualizer } from './components/DesignVisualizer'
import { Aerodynamics } from './components/Aerodynamics'
import { Geometry } from './components/Geometry'
import { Settings } from './components/Settings'
import { FlightSimulator } from './components/FlightSimulator'
import { MassDistribution } from './components/MassDistribution'
import { calculateGeometry, calculateTailArea, calculateTailDist } from './utils/sizing'
import type { UnitSystem } from './utils/units'

function App() {
  const [currentView, setCurrentView] = useState<'sizing' | 'aero' | 'geometry' | 'settings' | 'simulator' | 'weights'>('sizing');

  // Unit System State (with localStorage persistence)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    const saved = localStorage.getItem('phoenix-unit-system');
    return (saved === 'imperial' || saved === 'metric') ? saved : 'metric';
  });

  const [designReqs, setDesignReqs] = useState<Requirements>({
    altitude: 2000,
    payload: 300,
    speed: 60,
    airfoil: 'NACA2412',
    engineType: 'piston',
    tailArea: 2.0,
    tailDist: 4.5,
    tailAirfoil: 'NACA0012',
    // Planform geometry defaults
    wingTaperRatio: 0.6,
    wingSweep: 0,
    tailTaperRatio: 0.7,
    tailSweep: 0,
    // Mass & Balance Defaults
    enginePos: -0.5, // Ahead of wing
    enginePosZ: 0,
    fuelPos: 0,      // Near CG
    fuelPosZ: 0,
    structurePos: 1.0, // Behind wing (Tail boom etc)
    structurePosZ: 0,
    engineMass: 0,   // 0 = Auto-calculated
    fuelMass: 0,     // 0 = Auto-calculated
    structureMass: 0 // 0 = Auto-calculated
  });

  // Save unit system preference
  useEffect(() => {
    localStorage.setItem('phoenix-unit-system', unitSystem);
  }, [unitSystem]);

  // Reactive Sizing Logic
  // 1 pass: When Mission/Wing params change, update Tail Area (keeping Arm constant)
  useEffect(() => {
    const geom = calculateGeometry(designReqs);
    // Recalculate suggested tail area for the *current* distance
    const suggestedTailArea = calculateTailArea(geom.wingArea, geom.chord, designReqs.tailDist);

    if (Math.abs(suggestedTailArea - designReqs.tailArea) > 0.05) {
      setDesignReqs(prev => ({
        ...prev,
        tailArea: parseFloat(suggestedTailArea.toFixed(2))
      }));
    }
  }, [designReqs.payload, designReqs.speed, designReqs.altitude, designReqs.airfoil]); // Removed tailDist/Area from deps

  // Intelligent Change Handler
  const handleDesignChange = (newReqs: Requirements) => {
    // Check for Active Tail Updates
    const geom = calculateGeometry(newReqs);

    // 1. User changed Tail Area -> Update Distance
    if (Math.abs(newReqs.tailArea - designReqs.tailArea) > 0.001) {
      const newDist = calculateTailDist(geom.wingArea, geom.chord, newReqs.tailArea);
      if (newDist > 0) {
        newReqs.tailDist = parseFloat(newDist.toFixed(2));
      }
    }
    // 2. User changed Tail Distance -> Update Area
    else if (Math.abs(newReqs.tailDist - designReqs.tailDist) > 0.001) {
      const newArea = calculateTailArea(geom.wingArea, geom.chord, newReqs.tailDist);
      if (newArea > 0) {
        newReqs.tailArea = parseFloat(newArea.toFixed(2));
      }
    }

    setDesignReqs(newReqs);
  };


  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Phoenix <span className="text-slate-400 font-normal">| Aircraft Design Platform</span>
            </h1>
          </div>
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
                onClick={() => setCurrentView('geometry')}
                className={`cursor-pointer transition ${currentView === 'geometry' ? 'text-white border-b-2 border-blue-500' : 'hover:text-white'}`}
              >
                Geometry
              </li>
              <li
                onClick={() => setCurrentView('weights')}
                className={`cursor-pointer transition ${currentView === 'weights' ? 'text-white border-b-2 border-blue-500' : 'hover:text-white'}`}
              >
                Weight & Balance
              </li>
              <li
                onClick={() => setCurrentView('simulator')}
                className={`cursor-pointer transition ${currentView === 'simulator' ? 'text-green-400 border-b-2 border-green-500' : 'text-green-400/70 hover:text-green-400'}`}
              >
                Flight Simulator 3D
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

              <DesignVisualizer reqs={designReqs} unitSystem={unitSystem} />
            </div>

            {/* Right Column: Input Form */}
            <div>
              <RequirementForm data={designReqs} onChange={handleDesignChange} unitSystem={unitSystem} />
            </div>

          </div>
        )}

        {currentView === 'aero' && <Aerodynamics reqs={designReqs} unitSystem={unitSystem} />}

        {currentView === 'geometry' && <Geometry reqs={designReqs} onChange={setDesignReqs} unitSystem={unitSystem} />}

        {currentView === 'simulator' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Flight Test Simulator</h2>
              <p className="text-sm text-slate-400">Testing configuration: {designReqs.engineType} engine, {designReqs.airfoil} wing.</p>
            </div>
            <FlightSimulator
              reqs={designReqs}
              unitSystem={unitSystem}
              onExit={() => setCurrentView('sizing')}
            />
          </div>
        )}

        {currentView === 'weights' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold text-white">Weight & Balance</h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Adjust component placement to ensure aircraft stability.
              </p>
            </div>
            <MassDistribution reqs={designReqs} onChange={setDesignReqs} unitSystem={unitSystem} />
          </div>
        )}

        {currentView === 'settings' && <Settings unitSystem={unitSystem} onUnitSystemChange={setUnitSystem} />}

      </main>
    </div>
  )
}
export default App
