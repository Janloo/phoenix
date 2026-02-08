import sys
import os
sys.path.append(os.path.abspath(os.getcwd()))

from phoenix.core.airfoil import AirfoilDatabase
from phoenix.core.geometry import WingGeo, TailGeo
from phoenix.core.aircraft import Aircraft, Engine
from phoenix.analysis.performance import PerformanceAnalyzer

def verify():
    print("Running Verification with Cessna 172 parameters...")
    
    # 1. Load DB
    db = AirfoilDatabase("phoenix/data/airfoils.json")
    if "NACA 2412" not in db.airfoils:
        print("ERROR: NACA 2412 not found in DB")
        return
        
    airfoil = db.get_airfoil("NACA 2412")
    
    # 2. Geometry (C172 approx)
    wing = WingGeo(span=11.0, chord_root=1.47, chord_tip=1.47) # 16.2 m2
    tail = TailGeo(span=3.5, chord=1.2, arm=4.5)
    
    # 3. Engine & Weight
    # 160 HP engine => approx 119,000 Watts
    engine = Engine(max_power=119000.0, type="piston")
    
    aircraft = Aircraft(
        name="Cessna 172 Verification",
        wing=wing,
        tail=tail,
        airfoil=airfoil,
        engine=engine,
        empty_weight=767.0,
        payload=160.0, # 2 people
        fuel=100.0,    # Partial fuel
        parasite_drag_coeff=0.025
    )
    
    analyzer = PerformanceAnalyzer(aircraft)
    
    v_stall = analyzer.calculate_stall_speed(0)
    v_max = analyzer.calculate_max_speed(0)
    ceiling = analyzer.calculate_ceiling()
    
    print(f"Calculated Stall Speed: {v_stall*1.94384:.1f} kts (Expected ~47-50 kts)")
    print(f"Calculated Max Speed:   {v_max*1.94384:.1f} kts (Expected ~120-126 kts)")
    print(f"Calculated Ceiling:     {ceiling*3.28084:.0f} ft (Expected ~13000-14000 ft)")

if __name__ == "__main__":
    verify()
