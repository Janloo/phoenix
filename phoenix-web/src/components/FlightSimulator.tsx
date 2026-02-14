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
const AIR_DENSITY = 1.225;

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
const ChaseCamera = ({ position, quaternion }: { position: THREE.Vector3, quaternion: THREE.Quaternion }) => {
    const { camera } = useThree();
    const offset = new THREE.Vector3(0, 5, 15); // Behind and above

    useFrame(() => {
        // Calculate ideal camera position
        const targetPos = position.clone().add(offset.clone().applyQuaternion(quaternion));

        // Smoothly interpolate camera position
        camera.position.lerp(targetPos, 0.1);
        camera.lookAt(position);
    });
    return null;
};

// --- Main Simulation Scene ---
const SimulationScene: React.FC<{ reqs: Requirements; setTelemetry: (t: any) => void }> = ({ reqs, setTelemetry }) => {
    // Physics State
    const position = useRef(new THREE.Vector3(0, 0, 0)); // Start on ground
    const velocity = useRef(new THREE.Vector3(0, 0, 0)); // Start stationary
    const quaternion = useRef(new THREE.Quaternion());
    const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ')); // Pitch, Yaw, Roll

    // Inputs
    const keys = useRef<{ [key: string]: boolean }>({});
    const throttle = useRef(0); // 0 to 100%

    // Aircraft Params
    const { mtow, wingArea } = useMemo(() => calculateGeometry(reqs), [reqs]);
    const maxThrust = (mtow * 9.81) * 0.5; // T/W ~ 0.5 for generic GA

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

    useFrame((_state, delta) => {
        // 1. Process Input
        if (keys.current['ArrowUp']) euler.current.x -= 2 * delta; // Pitch Down
        if (keys.current['ArrowDown']) euler.current.x += 2 * delta; // Pitch Up
        if (keys.current['ArrowLeft']) euler.current.z += 2 * delta; // Roll Left
        if (keys.current['ArrowRight']) euler.current.z -= 2 * delta; // Roll Right
        if (keys.current['KeyQ']) euler.current.y += 1 * delta; // Yaw Left
        if (keys.current['KeyE']) euler.current.y -= 1 * delta; // Yaw Right

        if (keys.current['KeyW']) throttle.current = Math.min(1, throttle.current + 0.5 * delta);
        if (keys.current['KeyS']) throttle.current = Math.max(0, throttle.current - 0.5 * delta);

        // Clamp Pitch/Roll slightly to avoid easy flipping in this simple model
        euler.current.z *= 0.99; // Auto-level roll

        // 2. Compute Physics Forces
        // Local Velocity
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion.current);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion.current);

        const speed = velocity.current.length();
        const speedSq = speed * speed;

        // Lift
        // Simplified: Lift = 0.5 * rho * v^2 * S * Cl
        // Cl approx proportional to Angle of Attack (here simplified as pitch for now, ideally alpha)
        // For this demo: Lift opposes gravity + extra for pitch up
        const cl = 0.3 + (euler.current.x * 5); // Base lift + Pitch effect
        const liftMag = 0.5 * AIR_DENSITY * speedSq * wingArea * Math.max(0, cl);
        const lift = up.clone().multiplyScalar(liftMag);

        // Drag
        const cd = 0.04 + (cl * cl * 0.05);
        const dragMag = 0.5 * AIR_DENSITY * speedSq * wingArea * cd;
        const drag = velocity.current.clone().normalize().multiplyScalar(-dragMag);
        if (speed < 0.1) drag.set(0, 0, 0);

        // Thrust
        const thrust = forward.clone().multiplyScalar(maxThrust * throttle.current);

        // Gravity
        const gravity = new THREE.Vector3(0, -GRAVITY * mtow, 0);

        // Total Force
        const totalForce = new THREE.Vector3().add(thrust).add(drag).add(lift).add(gravity);

        // Acceleration (F=ma)
        const accel = totalForce.divideScalar(mtow);

        // Integration
        velocity.current.add(accel.multiplyScalar(delta));
        position.current.add(velocity.current.clone().multiplyScalar(delta));

        // Ground Collision
        if (position.current.y < 0) {
            position.current.y = 0;
            velocity.current.y = Math.max(0, velocity.current.y);
            // Friction
            velocity.current.multiplyScalar(0.99); // Rolling resistance
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
        });
    });

    return (
        <group position={position.current}>
            <Aircraft reqs={reqs} pitch={euler.current.x} roll={euler.current.z} yaw={euler.current.y} />
            <ChaseCamera position={position.current} quaternion={quaternion.current} />
        </group>
    );
};


export const FlightSimulator: React.FC<Props> = ({ reqs, unitSystem, onExit }) => {
    const [telemetry, setTelemetry] = useState({
        altitude: 0,
        speed: 0,
        throttle: 0,
        heading: 0,
        pitch: 0,
        roll: 0
    });

    return (
        <div className="w-full h-[600px] relative bg-black rounded-lg overflow-hidden border border-slate-700">
            {/* 3D Viewport */}
            <Canvas shadows camera={{ fov: 60 }}>
                <Sky sunPosition={[100, 20, 100]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />

                <SimulationScene reqs={reqs} setTelemetry={setTelemetry} />

                <Grid infiniteGrid fadeDistance={500} sectionColor="#4f4f4f" cellColor="#2f2f2f" />
                <Plane args={[1000, 1000]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                    <meshStandardMaterial color="#1a2e1a" />
                </Plane>
            </Canvas>

            {/* HUD Overlay */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between">
                {/* Top Bar */}
                <div className="flex justify-between items-start">
                    <div className="bg-black/50 p-3 rounded backdrop-blur-sm text-green-400 font-mono text-sm">
                        <div>THROTTLE: {(telemetry.throttle * 100).toFixed(0)}%</div>
                        <div>PITCH: {telemetry.pitch.toFixed(1)}°</div>
                        <div>ROLL: {telemetry.roll.toFixed(1)}°</div>
                    </div>
                    <button
                        onClick={onExit}
                        className="pointer-events-auto bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded font-bold backdrop-blur-sm transition"
                    >
                        ABSORT FLIGHT
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
                <div className="text-center text-slate-500 text-xs font-mono">
                    CONTROLS: W/S (Throttle) | ARROWS (Pitch/Roll) | Q/E (Yaw)
                </div>
            </div>
        </div>
    );
};
