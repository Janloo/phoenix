import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Plane, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { Requirements } from './RequirementForm';
import { type UnitSystem, convertSpeed, convertAltitude } from '../utils/units';
import { calculateGeometry } from '../utils/sizing';

interface Props {
    reqs: Requirements;
    unitSystem: UnitSystem;
    onExit: () => void;
}

// --- Physics Constants ---
const GRAVITY = 9.81;
const SEA_LEVEL_DENSITY = 1.225; // kg/m³ at MSL

/**
 * ISA (International Standard Atmosphere) air density as a function of altitude.
 * Uses the troposphere formula up to 11 000 m, then the stratosphere above.
 */
function airDensity(altitudeM: number): number {
    const h = Math.max(0, altitudeM);
    if (h <= 11000) {
        // Troposphere: temperature lapse rate 6.5 K/km
        const T = 288.15 - 0.0065 * h;
        return SEA_LEVEL_DENSITY * Math.pow(T / 288.15, 4.256);
    } else {
        // Stratosphere: isothermal at 216.65 K
        const rhoAt11k = SEA_LEVEL_DENSITY * Math.pow(216.65 / 288.15, 4.256);
        return rhoAt11k * Math.exp(-GRAVITY * (h - 11000) / (287.05 * 216.65));
    }
}

/**
 * Engine + propeller efficiency factor (0–1) as a function of altitude and airspeed.
 *
 * - Altitude effect: piston/turboprop power scales roughly with air density ratio.
 *   (Turbofan would be different, but we use a generic model here.)
 * - Speed (propulsive efficiency): a propeller has peak efficiency at a design
 *   advance ratio. We model this as a bell-curve centred on ~80 m/s (~155 kt)
 *   for a generic GA/turboprop aircraft. At 0 speed efficiency is low (~30%),
 *   peaks near design speed, then falls off at very high speeds.
 */
function engineEfficiency(altitudeM: number, speedMs: number): number {
    const rho = airDensity(altitudeM);
    const altitudeFactor = rho / SEA_LEVEL_DENSITY; // 1.0 at MSL → 0 at extreme alt

    // Propulsive efficiency: bell-curve with peak at ~80 m/s
    const designSpeed = 80; // m/s – tune to aircraft type
    const bandwidth = 70;   // m/s – width of efficiency bell
    const rawEta = Math.exp(-Math.pow((speedMs - designSpeed) / bandwidth, 2));
    // Floor at 0.30 so there's always some thrust at low speed (static thrust)
    const propEfficiency = 0.30 + 0.70 * rawEta;

    return altitudeFactor * propEfficiency;
}

/**
 * ISA speed of sound as a function of altitude.
 * a = sqrt(gamma * R * T) = 20.05 * sqrt(T)
 */
function speedOfSound(altitudeM: number): number {
    const h = Math.max(0, altitudeM);
    const T = h <= 11000
        ? 288.15 - 0.0065 * h   // troposphere
        : 216.65;                // stratosphere (isothermal)
    return 20.05 * Math.sqrt(T);
}

/**
 * Mach-number drag divergence multiplier.
 * Below M 0.80  → 1.0 (no compressibility penalty).
 * Above  M 0.80  → rises steeply modelling wave drag.
 * This creates a hard physical speed ceiling for any subsonic aircraft.
 */
function machDragFactor(mach: number): number {
    if (mach < 0.80) return 1.0;
    // Cubic rise in drag beyond drag-divergence Mach (~0.80)
    const dM = mach - 0.80;
    return 1.0 + 20 * dM * dM * dM + 5 * dM;
}

// --- Aircraft Model Component ---
const Aircraft: React.FC<{ reqs: Requirements; pitch: number; roll: number; yaw: number }> = ({ reqs, pitch, roll, yaw }) => {
    const { span, chord } = calculateGeometry(reqs);

    // Scale factors for visualization (1 unit = 1 meter)
    const fuselageLength = span * 0.75;
    const fuselageWidth = span * 0.1;

    return (
        <group rotation={[pitch, yaw, -roll]}>
            {/* Fuselage */}
            <mesh position={[0, 0, 0]}>
                <capsuleGeometry args={[fuselageWidth / 2, fuselageLength, 4, 8]} />
                <meshStandardMaterial color="#334155" />
            </mesh>

            {/* Wing */}
            <mesh position={[0, 0.2, -chord / 4]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[span, chord, 0.1]} />
                <meshStandardMaterial color="#3b82f6" />
            </mesh>

            {/* Vertical Stabilizer */}
            <mesh position={[0, 0.5, fuselageLength / 2 - 0.5]}>
                <boxGeometry args={[0.1, 1, 1]} />
                <meshStandardMaterial color="#475569" />
            </mesh>

            {/* Horizontal Stabilizer */}
            <mesh position={[0, 0.1, fuselageLength / 2 - 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[span * 0.4, chord * 0.6, 0.1]} />
                <meshStandardMaterial color="#475569" />
            </mesh>

            {/* Propeller (Visual only) */}
            <mesh position={[0, 0, -fuselageLength / 2 - 0.2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.2, 8]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>
        </group>
    );
};

// --- Camera Controller ---
// --- Camera Controller ---
const CockpitCamera = ({ position, quaternion }: { position: THREE.Vector3, quaternion: THREE.Quaternion }) => {
    const { camera } = useThree();

    useFrame(() => {
        // Offset for pilot's head (e.g., slightly up and forward)
        // 0.5m up, 2m forward (relative to center)
        const offset = new THREE.Vector3(0, 0.5, -2).applyQuaternion(quaternion);
        const camPos = position.clone().add(offset);

        camera.position.copy(camPos);
        camera.quaternion.copy(quaternion);
    });
    return null;
};

// --- Main Simulation Scene ---
const SimulationScene: React.FC<{
    reqs: Requirements;
    maxThrust: number;   // Newtons – controlled by HUD slider
    setTelemetry: (t: {
        altitude: number;
        speed: number;
        throttle: number;
        heading: number;
        pitch: number;
        roll: number;
        elevator: number;
        aileron: number;
        rudder: number;
    }) => void
}> = ({ reqs, maxThrust, setTelemetry }) => {
    // Physics State
    const position = useRef(new THREE.Vector3(0, 0, 0)); // Start on ground
    const velocity = useRef(new THREE.Vector3(0, 0, 0)); // Start stationary
    const quaternion = useRef(new THREE.Quaternion());
    const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ')); // Pitch, Yaw, Roll

    // Inputs
    const keys = useRef<{ [key: string]: boolean }>({});
    const throttle = useRef(0); // 0 to 100%

    // Aircraft Params
    const { mtow, wingArea } = useMemo(() => {
        const geom = calculateGeometry(reqs);
        return {
            mtow: Math.max(geom.mtow, 100), // Min 100kg
            wingArea: Math.max(geom.wingArea, 1) // Min 1m^2
        };
    }, [reqs]);
    // maxThrust comes from the HUD slider (prop)

    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
        const handleUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
        };
    }, []);

    // Control Surfaces State (Smoothed)
    const controls = useRef({ elevator: 0, aileron: 0, rudder: 0 });

    useFrame((_state, delta) => {
        const dt = Math.min(delta, 0.1); // Clamp delta to avoid instability
        // 1. Process Input & Smooth Control Surfaces
        // Targets
        let targetElevator = 0;
        if (keys.current['ArrowUp']) targetElevator = -1; // Pitch Down
        if (keys.current['ArrowDown']) targetElevator = 1; // Pitch Up

        let targetAileron = 0;
        if (keys.current['ArrowLeft']) targetAileron = -1; // Roll Left
        if (keys.current['ArrowRight']) targetAileron = 1; // Roll Right

        let targetRudder = 0;
        if (keys.current['KeyQ']) targetRudder = 1; // Yaw Left
        if (keys.current['KeyE']) targetRudder = -1; // Yaw Right

        // Smoothing (actuator speed)
        const controlSpeed = 5 * dt;
        controls.current.elevator += (targetElevator - controls.current.elevator) * controlSpeed;
        controls.current.aileron += (targetAileron - controls.current.aileron) * controlSpeed;
        controls.current.rudder += (targetRudder - controls.current.rudder) * controlSpeed;

        if (keys.current['KeyW']) throttle.current = Math.min(1, throttle.current + 0.5 * dt);
        if (keys.current['KeyS']) throttle.current = Math.max(0, throttle.current - 0.5 * dt);

        // 2. Compute Physics Forces
        // Velocity magnitude — computed early so pitch-damping can use it
        const speed = velocity.current.length();
        const speedSq = speed * speed;

        // Apply Control Inputs to Physics
        // Control authority: ramps from 0 at rest to 1.0 at ~20 m/s (v²/400), capped at 1.0.
        // Keeping the cap at 1.0 (not 2.0) prevents explosive pitch accumulation at speed.
        const controlAuthority = Math.min(velocity.current.lengthSq() / 400, 1.0);

        // Pitch rate: 0.8 rad/s max, roll: 0.8 rad/s max, yaw: 0.5 rad/s max
        euler.current.x += controls.current.elevator * 0.8 * controlAuthority * dt;
        euler.current.z -= controls.current.aileron * 0.8 * controlAuthority * dt;
        euler.current.y += controls.current.rudder * 0.5 * controlAuthority * dt;

        // --- Pitch clamp: ±45° prevents inverted flight where all forces flip ---
        const MAX_PITCH = Math.PI / 4; // 45°
        euler.current.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, euler.current.x));

        // --- Pitch damping: gently restores level when no elevator input ---
        // Strength 1.5 s time-constant; stronger when airborne (speed > 5 m/s)
        if (speed > 5) {
            euler.current.x *= Math.pow(0.995, dt * 60); // ~0.5 rad/s decay
        }

        // --- Roll auto-level ---
        euler.current.z *= 0.98; // slightly stronger auto-level

        // Local aircraft axes
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion.current);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion.current);

        // Altitude-dependent air density (ISA model) – shared by lift and drag
        const rho = airDensity(position.current.y);

        // Lift: Lift = 0.5 * rho * v^2 * S * Cl
        // Cl approx proportional to Angle of Attack (simplified as pitch)
        const cl = 0.3 + (euler.current.x * 5); // Base lift + Pitch effect
        const liftMag = 0.5 * rho * speedSq * wingArea * Math.max(0, cl);
        const lift = up.clone().multiplyScalar(liftMag);

        // Drag with compressibility (Mach divergence)
        // Cd0 = 0.065 accounts for fuselage, trim and interference drag
        //       beyond the wing polar alone.
        const mach = speed / speedOfSound(position.current.y);
        const cd = (0.065 + cl * cl * 0.05) * machDragFactor(mach);
        const dragMag = 0.5 * rho * speedSq * wingArea * cd;
        let drag = new THREE.Vector3(0, 0, 0);
        if (speed > 0.001) {
            const dragDir = velocity.current.clone().normalize();
            if (!Number.isNaN(dragDir.x)) {
                drag = dragDir.multiplyScalar(-dragMag);
            }
        }

        // Thrust – scaled by engine+propeller efficiency (altitude × speed)
        const efficiency = engineEfficiency(position.current.y, speed);
        const thrust = forward.clone().multiplyScalar(maxThrust * throttle.current * efficiency);

        // Gravity
        const gravity = new THREE.Vector3(0, -GRAVITY * mtow, 0);

        // Ground Physics (Rolling Resistance)
        const isOnGround = position.current.y <= 0.05;
        let rollingResistance = new THREE.Vector3(0, 0, 0);
        if (isOnGround) {
            const liftY = lift.y; // Assuming up is (0,1,0) roughly
            const weight = mtow * GRAVITY;
            const normalForce = Math.max(0, weight - liftY);
            const frictionCoeff = 0.02; // Tarmac
            const speedVal = velocity.current.length();
            if (speedVal > 0.1) {
                const vec = velocity.current.clone().normalize();
                if (vec.lengthSq() > 0) {
                    rollingResistance = vec.multiplyScalar(-normalForce * frictionCoeff);
                }
            } else if (throttle.current <= 0.01) {
                // Stop if very slow AND no significant throttle
                velocity.current.set(0, 0, 0);
            }
        }

        // Total Force
        const totalForce = new THREE.Vector3().add(thrust).add(drag).add(lift).add(gravity).add(rollingResistance);

        // Acceleration (F=ma)
        const accel = totalForce.divideScalar(mtow);

        // Integration
        velocity.current.add(accel.multiplyScalar(dt));
        position.current.add(velocity.current.clone().multiplyScalar(dt));

        // Ground Collision
        if (position.current.y < 0) {
            position.current.y = 0;
            velocity.current.y = Math.max(0, velocity.current.y);
        }

        // Update Orientation
        quaternion.current.setFromEuler(euler.current);

        // Telemetry Update
        setTelemetry({
            altitude: position.current.y,
            speed: velocity.current.length(),
            throttle: throttle.current,
            heading: (euler.current.y * 180 / Math.PI) % 360,
            pitch: (euler.current.x * 180 / Math.PI),
            roll: (euler.current.z * 180 / Math.PI),
            elevator: controls.current.elevator,
            aileron: controls.current.aileron,
            rudder: controls.current.rudder
        });
    });

    return (
        <group position={position.current}>
            <Aircraft reqs={reqs} pitch={euler.current.x} roll={euler.current.z} yaw={euler.current.y} />
            <CockpitCamera position={position.current} quaternion={quaternion.current} />
        </group>
    );
};


export const FlightSimulator: React.FC<Props> = ({ reqs, unitSystem, onExit }) => {
    const [telemetry, setTelemetry] = useState<{
        altitude: number;
        speed: number;
        throttle: number;
        heading: number;
        pitch: number;
        roll: number;
        elevator: number;
        aileron: number;
        rudder: number;
    }>({
        altitude: 0,
        speed: 0,
        throttle: 0,
        heading: 0,
        pitch: 0,
        roll: 0,
        elevator: 0,
        aileron: 0,
        rudder: 0
    });

    // Suggested max thrust from aircraft parameters (T/W = 0.30)
    const calcThrust = useMemo(() => {
        const geom = calculateGeometry(reqs);
        const mtow = Math.max(geom.mtow, 100);
        return Math.round(mtow * 9.81 * 0.30); // Newtons
    }, [reqs]);

    // User-overridable max thrust; initialised to the calculated suggestion
    const [thrustN, setThrustN] = useState<number>(() => {
        const geom = calculateGeometry(reqs);
        return Math.round(Math.max(geom.mtow, 100) * 9.81 * 0.30);
    });

    // Slider range: 0 → 3× suggested thrust
    const sliderMax = calcThrust * 3;

    return (
        <div className="w-full h-[600px] relative bg-black rounded-lg overflow-hidden border border-slate-700">
            {/* 3D Viewport */}
            <Canvas shadows camera={{ fov: 60, far: 500000 }}>
                <Sky sunPosition={[100, 20, 100]} distance={450000} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />

                <SimulationScene reqs={reqs} maxThrust={thrustN} setTelemetry={setTelemetry} />

                <Grid
                    infiniteGrid
                    fadeDistance={25000}
                    sectionColor="#666666"
                    cellColor="#333333"
                    sectionSize={250}
                    cellSize={50}
                />
                <Plane args={[100000, 100000]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                    <meshStandardMaterial color="#1a2e1a" />
                </Plane>
            </Canvas>

            {/* HUD Overlay */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between">
                {/* Top Bar */}
                <div className="flex justify-between items-start gap-4">
                    {/* Flight state */}
                    <div className="bg-black/50 p-3 rounded backdrop-blur-sm text-green-400 font-mono text-sm">
                        <div>THROTTLE: {(telemetry.throttle * 100).toFixed(0)}%</div>
                        <div>PITCH: {telemetry.pitch.toFixed(1)}°</div>
                        <div>ROLL: {telemetry.roll.toFixed(1)}°</div>
                    </div>

                    {/* Engine thrust override */}
                    <div className="pointer-events-auto bg-black/60 p-3 rounded backdrop-blur-sm text-yellow-300 font-mono text-xs flex flex-col gap-1 min-w-[200px]">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-yellow-400">MAX THRUST</span>
                            <span className="text-white text-sm font-bold">{thrustN.toLocaleString()} N</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={sliderMax}
                            step={Math.max(1, Math.round(sliderMax / 200))}
                            value={thrustN}
                            onChange={e => setThrustN(Number(e.target.value))}
                            className="w-full accent-yellow-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-slate-400">
                            <span>0</span>
                            <button
                                onClick={() => setThrustN(calcThrust)}
                                className="text-yellow-500 hover:text-yellow-300 underline"
                            >
                                AUTO ({calcThrust.toLocaleString()} N)
                            </button>
                            <span>{sliderMax.toLocaleString()}</span>
                        </div>
                    </div>

                    <button
                        onClick={onExit}
                        className="pointer-events-auto bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded font-bold backdrop-blur-sm transition"
                    >
                        ABORT FLIGHT
                    </button>
                </div>

                {/* Center HUD */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 border-2 border-green-500/50 rounded-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    </div>
                </div>

                {/* Bottom Stats */}
                <div className="flex justify-between items-end">
                    <div className="bg-black/50 p-4 rounded backdrop-blur-sm text-white font-mono">
                        <div className="text-2xl font-bold">{convertSpeed(telemetry.speed, unitSystem).toFixed(0)} <span className="text-sm text-slate-400">{unitSystem === 'metric' ? 'm/s' : 'kts'}</span></div>
                        <div className="text-xs text-slate-400">AIRSPEED</div>
                    </div>

                    <div className="bg-black/50 p-4 rounded backdrop-blur-sm text-white font-mono text-right">
                        <div className="text-2xl font-bold">{convertAltitude(telemetry.altitude, unitSystem).toFixed(0)} <span className="text-sm text-slate-400">{unitSystem === 'metric' ? 'm' : 'ft'}</span></div>
                        <div className="text-xs text-slate-400">ALTITUDE</div>
                    </div>
                </div>

                {/* Controls Hint */}
                <div className="absolute bottom-6 left-6 text-slate-400 font-mono text-xs space-y-2">
                    <div className="bg-black/50 p-3 rounded backdrop-blur-sm">
                        <div className="font-bold text-slate-300 mb-1">CONTROLS INPUT</div>
                        {/* Elevator */}
                        <div className="flex items-center gap-2">
                            <span className="w-12">ELEV</span>
                            <div className="w-24 h-2 bg-slate-700 rounded overflow-hidden relative">
                                <div
                                    className="absolute top-0 h-full bg-blue-500 transition-all duration-75"
                                    style={{
                                        left: '50%',
                                        width: `${Math.abs(telemetry.elevator) * 50}%`,
                                        transform: `translateX(${telemetry.elevator < 0 ? '-100%' : '0'})`
                                    }}
                                />
                            </div>
                            <span className="w-8 text-right">{(telemetry.elevator * 100).toFixed(0)}%</span>
                        </div>
                        {/* Aileron */}
                        <div className="flex items-center gap-2">
                            <span className="w-12">AIL</span>
                            <div className="w-24 h-2 bg-slate-700 rounded overflow-hidden relative">
                                <div
                                    className="absolute top-0 h-full bg-blue-500 transition-all duration-75"
                                    style={{
                                        left: '50%',
                                        width: `${Math.abs(telemetry.aileron) * 50}%`,
                                        transform: `translateX(${telemetry.aileron < 0 ? '-100%' : '0'})`
                                    }}
                                />
                            </div>
                            <span className="w-8 text-right">{(telemetry.aileron * 100).toFixed(0)}%</span>
                        </div>
                        {/* Rudder */}
                        <div className="flex items-center gap-2">
                            <span className="w-12">RUD</span>
                            <div className="w-24 h-2 bg-slate-700 rounded overflow-hidden relative">
                                <div
                                    className="absolute top-0 h-full bg-blue-500 transition-all duration-75"
                                    style={{
                                        left: '50%',
                                        width: `${Math.abs(telemetry.rudder) * 50}%`,
                                        transform: `translateX(${telemetry.rudder < 0 ? '-100%' : '0'})`
                                    }}
                                />
                            </div>
                            <span className="w-8 text-right">{(telemetry.rudder * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                <div className="text-center text-slate-500 text-xs font-mono pb-2">
                    CONTROLS: W/S (Throttle) | ARROWS (Pitch/Roll) | Q/E (Yaw)
                </div>
            </div>
        </div>
    );
};
