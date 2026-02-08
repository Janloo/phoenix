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
    empty_weight: float # kg
    payload: float = 0.0 # kg
    fuel: float = 0.0 # kg
    
    # Aerodynamic efficiency factors
    oswald_efficiency: float = 0.8 # e
    parasite_drag_coeff: float = 0.02 # C_D0 (fuselage etc)

    @property
    def total_mass(self) -> float:
        return self.empty_weight + self.payload + self.fuel
    
    @property
    def total_weight(self) -> float:
        return self.total_mass * 9.81

    def get_aerodynamic_forces(self, alpha: float, velocity: float, density: float) -> Tuple[float, float]:
        """
        Calculate Lift and Drag forces (Newtons).
        alpha: Angle of attack (degrees)
        velocity: True Airspeed (m/s)
        density: Air density (kg/m^3)
        """
        # Dynamic Pressure (q)
        q = 0.5 * density * velocity**2
        
        # Wing coefficients
        cl_wing, cd_profile = self.airfoil.get_coefficients(alpha)
        
        # Induced Drag: C_Di = C_L^2 / (pi * AR * e)
        # AR is Aspect Ratio
        k = 1.0 / (math.pi * self.wing.aspect_ratio * self.oswald_efficiency)
        cd_induced = k * (cl_wing ** 2)
        
        # Total coefficients
        # Simplifying: Tail lift is neglected for Drag sum approx, 
        # but technically tail trim adds drag. Keeping simple for MVP.
        # Adding parasite drag (C_D0)
        
        cl_total = cl_wing # Assuming wing dominates lift
        cd_total = cd_profile + cd_induced + self.parasite_drag_coeff
        
        lift = q * self.wing.area * cl_total
        drag = q * self.wing.area * cd_total
        
        return lift, drag

    def get_thrust(self, density: float, velocity: float, sea_level_density: float = 1.225) -> float:
        """
        Calculate available thrust.
        """
        sigma = density / sea_level_density
        
        if self.engine.type == "jet":
            # Simple Jet Model: Thrust proportional to density
            return self.engine.max_thrust * sigma
            
        elif self.engine.type == "piston":
            # Piston Model: Power drops faster than density (friction const, air less)
            # Gagg-Farrar model for Naturally Aspirated engine:
            if sigma > 0.117:
                power_factor = (sigma - 0.117) / 0.883
            else:
                power_factor = 0.0
                
            power_avail = self.engine.max_power * power_factor 
            
            if velocity < 0.1: # Avoid division by zero
                # Static thrust approximation (very rough)
                # T_static ~ (P * D)^(2/3) ... 
                # Let's just limit velocity to a small number for the formula
                velocity = 1.0 
                
            # Power = Thrust * Velocity => Thrust = Power * eff / Velocity
            thrust = (power_avail * self.engine.prop_efficiency) / velocity
            
            # Static thrust cap (physics limit for prop)
            # If we don't cap it, thrust -> infinity as V -> 0.
            # Empirical cap or user defined static thrust would be better,
            # but for flight envelope (V > V_stall), this formula is "okay".
            
            return thrust
        
        return 0.0
