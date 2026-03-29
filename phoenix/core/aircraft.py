from dataclasses import dataclass
import math
from typing import Tuple
from phoenix.core.geometry import WingGeo, TailGeo
from phoenix.core.airfoil import Airfoil

@dataclass
class Engine:
    type: str = "piston" # "piston" or "jet"
    # For Piston:
    max_power: float = 0.0 # Watts (e.g. 119000 for 160hp)
    prop_efficiency: float = 0.8
    # For Jet:
    max_thrust: float = 0.0 # Newtons
    
@dataclass
class Aircraft:
    name: str
    wing: WingGeo
    tail: TailGeo
    airfoil: Airfoil
    engine: Engine
    
    # Component Masses (kg)
    fuselage_mass: float
    fuselage_length: float
    engine_mass: float
    
    # Component Positions (relative to datum, X=Front, Y=Right, Z=Up)
    # Positions are the Center of Gravity of each component
    wing_pos: Tuple[float, float, float] 
    tail_pos: Tuple[float, float, float]
    engine_pos: Tuple[float, float, float]
    fuselage_pos: Tuple[float, float, float]
    
    # Variable masses
    payload: float = 0.0
    fuel: float = 0.0
    payload_pos: Tuple[float, float, float] = (0, 0, 0)
    fuel_pos: Tuple[float, float, float] = (0, 0, 0)
    
    # Aerodynamic efficiency factors
    oswald_efficiency: float = 0.8
    parasite_drag_coeff: float = 0.02

    @property
    def total_mass(self) -> float:
        return (self.wing.mass + self.tail.mass + self.fuselage_mass + 
                self.engine_mass + self.payload + self.fuel)
    
    @property
    def total_weight(self) -> float:
        return self.total_mass * 9.81
    
    def get_cg(self) -> Tuple[float, float, float]:
        """Calculates the Center of Gravity position (X, Y, Z)."""
        m_total = self.total_mass
        if m_total == 0: return (0, 0, 0)
        
        comp_masses = [
            (self.wing.mass, self.wing_pos),
            (self.tail.mass, self.tail_pos),
            (self.fuselage_mass, self.fuselage_pos),
            (self.engine_mass, self.engine_pos),
            (self.payload, self.payload_pos),
            (self.fuel, self.fuel_pos)
        ]
        
        cg_x = sum(m * p[0] for m, p in comp_masses) / m_total
        cg_y = sum(m * p[1] for m, p in comp_masses) / m_total
        cg_z = sum(m * p[2] for m, p in comp_masses) / m_total
        
        return (cg_x, cg_y, cg_z)

    def get_inertia_tensor(self) -> Tuple[float, float, float]:
        """
        Estimates the principal moments of inertia (Ixx, Iyy, Izz) 
        around the CG using the Parallel Axis Theorem.
        Simplified geometric approximations are used for components.
        """
        cg = self.get_cg()
        ixx = 0.0
        iyy = 0.0
        izz = 0.0
        
        # 1. Wing - Approx as a beam along Y axis
        # Ixx_local = 1/12 * m * b^2
        # Izz_local = 1/12 * m * b^2
        w_ixx = (1/12) * self.wing.mass * self.wing.span**2
        w_izz = w_ixx
        
        # 2. Fuselage - Approx as a cylinder along X axis
        # Assuming radius r = 0.5m for now
        r_fus = 0.5
        f_ixx = 0.5 * self.fuselage_mass * r_fus**2
        f_iyy = (1/12) * self.fuselage_mass * self.fuselage_length**2
        f_izz = f_iyy
        
        # Apply Parallel Axis Theorem for all components
        comp_data = [
            (self.wing.mass, self.wing_pos, (w_ixx, 0, w_izz)),
            (self.tail.mass, self.tail_pos, (0, 0, 0)), # Tail ignored for local inertia
            (self.fuselage_mass, self.fuselage_pos, (f_ixx, f_iyy, f_izz)),
            (self.engine_mass, self.engine_pos, (0, 0, 0)),
            (self.payload, self.payload_pos, (0, 0, 0)),
            (self.fuel, self.fuel_pos, (0, 0, 0))
        ]
        
        for m, p, (l_ixx, l_iyy, l_izz) in comp_data:
            dx = p[0] - cg[0]
            dy = p[1] - cg[1]
            dz = p[2] - cg[2]
            
            ixx += l_ixx + m * (dy**2 + dz**2)
            iyy += l_iyy + m * (dx**2 + dz**2)
            izz += l_izz + m * (dx**2 + dy**2)
            
        return (ixx, iyy, izz)

    def get_aerodynamic_forces_and_moments(
        self, 
        v_body: Tuple[float, float, float], 
        omega: Tuple[float, float, float],
        controls: Dict[str, float],
        density: float
    ) -> Tuple[Tuple[float, float, float], Tuple[float, float, float]]:
        """
        Calculates total aerodynamic Forces and Moments in the Body Frame (X=Fwd, Y=Right, Z=Up).
        Uses Blade Element Theory (BET) for the wing.
        
        v_body: (u, v, w) linear velocity in body frame (m/s)
        omega: (p, q, r) angular velocity in body frame (rad/s)
        controls: {'elevator': [-1..1], 'aileron': [-1..1], 'rudder': [-1..1]}
        """
        cg = self.get_cg()
        total_force = [0.0, 0.0, 0.0]
        total_moment = [0.0, 0.0, 0.0]
        
        # 1. Wing BET
        num_stations = 20
        stations = self.wing.get_stations(num_stations)
        
        for y_station, chord, area in stations:
            # Position of station relative to datum
            r_datum = (self.wing_pos[0], y_station, self.wing_pos[2])
            # Position relative to CG
            r_cg = (r_datum[0] - cg[0], r_datum[1] - cg[1], r_datum[2] - cg[2])
            
            # Local velocity at station: V_local = V_body + omega x r
            # Cross product w x r:
            # [ q*rz - r*ry, r*rx - p*rz, p*ry - q*rx ]
            v_rot = (
                omega[1] * r_cg[2] - omega[2] * r_cg[1],
                omega[2] * r_cg[0] - omega[0] * r_cg[2],
                omega[0] * r_cg[1] - omega[1] * r_cg[0]
            )
            v_local = (v_body[0] + v_rot[0], v_body[1] + v_rot[1], v_body[2] + v_rot[2])
            
            # Local Airspeed
            v_sq = v_local[0]**2 + v_local[2]**2 # Ignoring lateral for local wing alpha
            v_mag = math.sqrt(v_sq)
            
            if v_mag < 0.1: continue
            
            # Local Alpha (Angle of Attack)
            # Alpha = atan2(w, u)
            alpha_local = math.degrees(math.atan2(-v_local[2], v_local[0]))
            
            # Aileron effect: Add to local alpha based on station
            # y_station is positive for right wing. Aileron 'a' increases lift on right wing.
            aileron_deflection = controls.get('aileron', 0.0)
            # Simple linear model: 5 degrees per full deflection
            alpha_local += aileron_deflection * (y_station / (self.wing.span / 2)) * 5.0
            
            # Get coefficients
            cl, cd = self.airfoil.get_coefficients(alpha_local)
            
            # Local forces (Lift/Drag)
            q_local = 0.5 * density * v_mag**2
            lift = q_local * area * cl
            drag = q_local * area * cd
            
            # Convert Lift/Drag to Body Frame (X, Y, Z)
            # Assuming small alpha approximation for rotation or direct rotation
            angle_rad = math.atan2(-v_local[2], v_local[0])
            s = math.sin(angle_rad)
            c = math.cos(angle_rad)
            
            # Body X force: Lift*sin(alpha) - Drag*cos(alpha)
            # (Wait, if alpha is angle between X and V, Lift is perpendicular to V)
            # Standard: Fx = Lift*sin - Drag*cos, Fz = Lift*cos + Drag*sin
            fx = lift * s - drag * c
            fz = lift * c + drag * s
            
            # Sum forces
            total_force[0] += fx
            total_force[2] += fz
            
            # Sum moments: M = r x F
            # Force vector at station: (fx, 0, fz)
            total_moment[0] += r_cg[1] * fz - r_cg[2] * 0
            total_moment[1] += r_cg[2] * fx - r_cg[0] * fz
            total_moment[2] += r_cg[0] * 0 - r_cg[1] * fx

        # 2. Tail and Parasite effects (Simplified for now)
        # Adding a rough pitching moment for elevator
        # Adding a rough drag for parasite
        v_abs = math.sqrt(sum(v**2 for v in v_body))
        q_total = 0.5 * density * v_abs**2
        
        # Parasite Drag
        f_drag_parasite = q_total * self.wing.area * self.parasite_drag_coeff
        if v_abs > 0.1:
            total_force[0] -= f_drag_parasite * (v_body[0] / v_abs)
            
        # Elevator effect
        elev = controls.get('elevator', 0.0)
        # Moment = Force_tail * Arm. Force_tail proportional to q * area_tail * alpha_tail
        # alpha_tail approx alpha_ac + elevator
        alpha_ac = math.degrees(math.atan2(-v_body[2], v_body[0])) if v_abs > 0.1 else 0.0
        m_pitch_elev = -elev * q_total * self.tail.area * self.tail.arm * 0.1 # 0.1 is a 'gain'
        total_moment[1] += m_pitch_elev

        return tuple(total_force), tuple(total_moment)

    def get_thrust(self, density: float, velocity: float, sea_level_density: float = 1.225) -> float:
        sigma = density / sea_level_density
        if self.engine.type == "jet":
            return self.engine.max_thrust * sigma
        elif self.engine.type == "piston":
            if sigma > 0.117:
                power_factor = (sigma - 0.117) / 0.883
            else:
                power_factor = 0.0
            power_avail = self.engine.max_power * power_factor 
            if velocity < 1.0: velocity = 1.0 
            thrust = (power_avail * self.engine.prop_efficiency) / velocity
            return thrust
        return 0.0
