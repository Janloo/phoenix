import sys
import os
sys.path.append(os.path.abspath(os.getcwd()))

from phoenix.core.environment import Atmosphere
from phoenix.core.aircraft import Aircraft, Engine, WingGeo, TailGeo
from phoenix.core.airfoil import Airfoil, AirfoilData

def check_atmosphere():
    print("--- Atmosphere Check ---")
    data = [0, 1000, 3000, 5000, 10000] # meters
    for h in data:
        temp = Atmosphere.get_temperature(h)
        density = Atmosphere.get_density(h)
        print(f"Alt: {h:5.0f}m | Temp: {temp:6.2f}K | Rho: {density:5.3f} kg/m3 | Ratio: {density/1.225:.3f}")

def check_thrust_model():
    print("\n--- Thrust Model Check ---")
    # Mock Aircraft
    wing = WingGeo(11, 1.5, 1.5)
    tail = TailGeo(3, 1, 4)
    # Dummy airfoil
    af = Airfoil(AirfoilData("test", "", [-10, 10], [-1, 1], [0.1, 0.1])) 
    
    # Current Model: Fixed Thrust * Density Ratio
    eng = Engine(max_thrust=2200.0) 
    ac = Aircraft("Test", wing, tail, af, eng, 1000)
    
    print(f"SL Max Thrust: {ac.get_thrust(1.225):.1f} N")
    
    # Check at 26,000 ft (~8000m)
    rho_8k = Atmosphere.get_density(8000)
    thrust_8k = ac.get_thrust(rho_8k)
    print(f"8000m Density: {rho_8k:.3f}")
    print(f"8000m Thrust:  {thrust_8k:.1f} N (Ratio: {thrust_8k/2200:.2f})")
    
    # Real C172 Power at 8000m?
    # P_avail ~ P_0 * (rho/rho0)
    # At 8000m (26k ft), C172 engine makes very little power (<25%?)
    # But thrust = Power / Speed.
    pass

if __name__ == "__main__":
    check_atmosphere()
    check_thrust_model()
