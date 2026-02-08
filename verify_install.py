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
    db = AirfoilDatabase("phoenix/data")
    if "NACA2412" not in db.airfoils:
        print("ERROR: NACA2412 not found in DB")
        return
        
    airfoil = db.get_airfoil("NACA2412")
    
    # Check other new airfoils
    for name in ["CLARKY", "E387"]:
        af = db.get_airfoil(name)
        if af and af.data.coordinates:
             print(f"Verified {name}: Loaded with {len(af.data.coordinates)} points")
        else:
             print(f"Warning: {name} incomplete")

    # 2. Geometry (C172 approx)
    if airfoil.data.coordinates:
        print(f"Airfoil Geometry Loaded (NACA2412): {len(airfoil.data.coordinates)} points")
    else:
        print("Warning: Airfoil Geometry NOT loaded")

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
