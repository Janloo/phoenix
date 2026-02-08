import math
from phoenix.core.aircraft import Aircraft
from phoenix.core.environment import Atmosphere

class PerformanceAnalyzer:
    def __init__(self, aircraft: Aircraft):
        self.aircraft = aircraft

    def get_cl_max(self) -> float:
        # Find max Cl from airfoil data
        # In a real scenario, we'd check Reynolds numbers, flaps etc.
        # For now, just max of the polar curve
        return max(self.aircraft.airfoil.data.cl)

    def calculate_stall_speed(self, altitude: float = 0.0) -> float:
        """
        Calculate stall speed (m/s) at a given altitude.
        V_stall = sqrt( (2 * W) / (rho * S * Cl_max) )
        """
        rho = Atmosphere.get_density(altitude)
        cl_max = self.get_cl_max()
        weight = self.aircraft.total_weight # Newtons
        area = self.aircraft.wing.area
        
        if rho <= 0 or area <= 0 or cl_max <= 0:
            return float('inf')
        
        v_stall = math.sqrt((2 * weight) / (rho * area * cl_max))
        return v_stall

    def calculate_drag_at_speed(self, velocity: float, altitude: float) -> float:
        """
        Calculate Drag force at a specific speed in Level Flight (Lift = Weight).
        """
        rho = Atmosphere.get_density(altitude)
        weight = self.aircraft.total_weight
        area = self.aircraft.wing.area
        
        # Required Lift Coefficient for level flight
        # L = 0.5 * rho * V^2 * S * Cl
        # Cl = (2 * L) / (rho * V^2 * S)
        if velocity == 0: return float('inf')
        
        cl_req = (2 * weight) / (rho * velocity**2 * area)
        
        # Get Cd for this Cl
        # We need to inverse interpolate the polar: Cl -> Alpha -> Cd
        # Simplified: iterate airfoil data or assume quadratic drag polar
        # CD = CD0 + k * CL^2 (using our aircraft model's formula directly)
        
        # From aircraft.py:
        # cd_total = cd_profile + cd_induced + self.parasite_drag_coeff
        # We need cd_profile for this alpha.
        # Let's approximate cd_profile as constant or lookup?
        # Better: find alpha for this Cl from Airfoil
        
        # Simple lookup in polar for alpha corresponding to cl_req
        # This is "Inverse Interpolation"
        # For MVP, let's just use the Aircraft class generic drag calculation
        # but we need alpha.
        # Let's assume linear Cl curve: Cl = Cl0 + Cl_alpha * alpha
        # or just search the polar.
        
        # For now, let's use the simple parabolic drag model locally
        # Cd = Cd0_total + K * Cl^2
        # where Cd0_total includes airfoil min drag + parasite
        
        # Get min drag from airfoil
        min_cd_airfoil = min(self.aircraft.airfoil.data.cd)
        k = 1.0 / (math.pi * self.aircraft.wing.aspect_ratio * self.aircraft.oswald_efficiency)
        
        cd_total = min_cd_airfoil + self.aircraft.parasite_drag_coeff + k * (cl_req ** 2)
        
        drag = 0.5 * rho * velocity**2 * area * cd_total
        return drag

    def calculate_max_speed(self, altitude: float = 0.0) -> float:
        """
        Calculate Max Speed (Vmax) where Thrust = Drag.
        Iterative search.
        """
        # Range of speeds to search: Stall Speed to Mach 1 (approx 340 m/s)
        v_min = self.calculate_stall_speed(altitude)
        v_max_search = 340.0 # Simple cap
        
        # Binary search or simple step?
        # Thrust is constant with speed in our simple model?
        # Aircraft.get_thrust depends on density, not speed (simplified prop/jet mix)
        # But real props lose thrust with speed.
        # Let's assume constant power for prop? P = T*V => T = P/V
        # Or constant thrust for jet?
        # The user didn't specify. The 'Engine' class has 'max_thrust'.
        # Let's assume Constant Thrust for the MVP (Jet-like or Variable Pitch Prop best case).
        
        # thrust_avail removed from here as it depends on speed now
        
        # Bisection method
        low, high = v_min * 1.01, v_max_search
        
        for _ in range(20):
            mid = (low + high) / 2
            drag = self.calculate_drag_at_speed(mid, altitude)
            thrust_avail = self.aircraft.get_thrust(Atmosphere.get_density(altitude), mid)

            if drag < thrust_avail:
                low = mid # Can go faster
            else:
                high = mid # Too fast, drag exceeds thrust
                
        return high

    def calculate_ceiling(self) -> float:
        """
        Calculate Service Ceiling (where Rate of Climb drops to 0.5 m/s (~100 ft/min)).
        """
        # Search altitudes
        low_alt = 0.0
        high_alt = 20000.0 # 20km, way high
        
        def get_max_rc(alt):
            # At a given altitude, find best climb speed (V_y)
            # RC = (T - D) * V / W
            # We need to maximize this.
            # Simplified: V_y is usually ~1.2-1.4 V_stall or where L/D is max?
            # Max RC occurs where excess power is max.
            
            v_stall = self.calculate_stall_speed(alt)
            # Scan speeds
            best_rc = -float('inf')
            
            # coarse scan
            if v_stall == float('inf'): return -1e9

            # Check a range of speeds above stall
            for v in [v_stall * (1.1 + i*0.1) for i in range(20)]:
                drag = self.calculate_drag_at_speed(v, alt)
                thrust = self.aircraft.get_thrust(Atmosphere.get_density(alt), v)
                rc = (thrust - drag) * v / self.aircraft.total_weight
                if rc > best_rc: best_rc = rc
            
            return best_rc

        # Bisection for altitude
        for _ in range(20):
            mid_alt = (low_alt + high_alt) / 2
            max_rc = get_max_rc(mid_alt)
            
            if max_rc > 0.5: # 0.5 m/s (approx 100 ft/min)
                low_alt = mid_alt
            else:
                high_alt = mid_alt
                
        return low_alt
