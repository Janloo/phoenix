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

import { airDensity, engineEfficiency, speedOfSound, machDragFactor, GRAVITY } from '../utils/physics';

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
        // The angle of attack (AoA) is the angle between the velocity vector and the chord line (pitch)
        let aoa = euler.current.x; // Simplified AoA

        // If moving, actual AoA is pitch minus flight path angle
        if (speed > 1.0) {
            // Velocity direction in local coordinates
            const velocityDir = velocity.current.clone().normalize();
            // Flight path angle
            const fpa = Math.asin(Math.max(-1, Math.min(1, velocityDir.y)));
            aoa = euler.current.x - fpa;
        }

        // Lift coefficient (Cl) curve:
        // Instead of hardcoding 0.3 + aoa*5, we should ensure that at 0 AoA, lift is moderate but 
        // if pitch/AoA is zero or negative and speed is low, it doesn't just infinitely hold the plane up.
        // A typical symmetrical wing has Cl = 0 at 0 AoA. A cambered wing has some positive Cl at 0 AoA.
        // Let's use Cl = 0.1 + (aoa * 5) so it doesn't generate excessive lift when nose-level at 0 throttle.
        let cl = 0.1 + (aoa * 5);
        // Simple stall
        if (aoa > 0.26) { // ~15 deg
            cl = Math.max(0, 0.1 + (0.26 * 5) - ((aoa - 0.26) * 10));
        } else if (aoa < -0.15) { // Negative stall
            cl = Math.min(0, 0.1 + (-0.15 * 5) - ((aoa + 0.15) * 10));
        }

        const liftMag = 0.5 * rho * speedSq * wingArea * cl;

        // Lift is perpendicular to the *velocity vector*, not simply local exact 'up'.
        // To approximate without complex quaternion math from velocity, we can use local 'up'
        // for small angles, or find the cross product.
        let liftDir = up.clone();
        if (speed > 1.0) {
            const right = forward.clone().cross(up).normalize(); // Local right
            const vDir = velocity.current.clone().normalize();
            liftDir = right.cross(vDir).normalize();
            // Ensure it points mostly "up" relative to the aircraft
            if (liftDir.y < 0 && cl > 0) liftDir.negate();
        }

        const lift = liftDir.clone().multiplyScalar(liftMag);

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
            // Higher friction to ensure it stops
            const frictionCoeff = 0.05; // Tarmac + brakes/idle friction
            const speedVal = velocity.current.length();
            if (speedVal > 0.5) {
                const vec = velocity.current.clone().normalize();
                if (vec.lengthSq() > 0) {
                    rollingResistance = vec.multiplyScalar(-normalForce * frictionCoeff);
                }
            } else {
                // Hard stop if very slow and no thrust
                if (throttle.current <= 0.05) {
                    velocity.current.set(0, 0, 0);
                }
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
