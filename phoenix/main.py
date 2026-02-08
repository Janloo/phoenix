import sys
import os
# Add project root to path
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/..'))

from phoenix.core.airfoil import AirfoilDatabase
from phoenix.core.geometry import WingGeo, TailGeo
from phoenix.core.aircraft import Aircraft, Engine
from phoenix.analysis.performance import PerformanceAnalyzer

def input_float(prompt, default=None):
    if default is not None:
        val = input(f"{prompt} [{default}]: ")
        if val.strip() == "": return default
    else:
        val = input(f"{prompt}: ")
    return float(val)

def main():
    print("=== Phoenix Aircraft Design Platform ===")
    
    # 1. Load Airfoils
    db = AirfoilDatabase("phoenix/data")
    print(f"Loaded {len(db.airfoils)} airfoils.")
    
    # 2. Select Airfoil
    print("\nAvailable Airfoils:")
    names = db.list_airfoils()
    for i, name in enumerate(names):
        print(f"{i+1}. {name}")
    
    choice = int(input("\nSelect Airfoil (number): ")) - 1
    selected_airfoil_name = names[choice]
    airfoil = db.get_airfoil(selected_airfoil_name)
    print(f"Selected: {selected_airfoil_name}")
    
    # 2b. XFoil Analysis Option
    print("\n--- Aerodynamic Analysis ---")
    xfoil_choice = input("Run XFoil Analysis? (y/n) [n]: ").lower()
    
    if xfoil_choice == 'y':
        from phoenix.analysis.xfoil_interface import XFoilWrapper
        
        # Estimate Reynolds?
        # Re = (density * velocity * chord) / viscosity
        # Viscosity ~ 1.78e-5 kg/(m s)
        # Just ask user for now or use a default GA value
        reynolds = input_float("Reynolds Number (e.g. 1000000 for GA)", 1000000.0)
        
        print(f"Running XFoil for {selected_airfoil_name}...")
        coords = airfoil.data.coordinates
        if not coords:
            print("Error: No geometry coordinates available for this airfoil. Cannot run XFoil.")
        else:
            polar_data = XFoilWrapper.run_xfoil(selected_airfoil_name, coords, reynolds)
            
            if polar_data:
                print(f"Success! Generated polar with {len(polar_data['alpha'])} points.")
                # Update airfoil with new data
                airfoil.update_polars(polar_data)
                # print(polar_data) # Debug
            else:
                print("XFoil analysis failed. Using specific/default database polars.")

    # 3. Geometric Config
    print("\n--- Wing Geometry ---")
    span = input_float("Wingspan (m)", 11.0)
    chord = input_float("Average Chord (m)", 1.5)
    
    wing = WingGeo(span=span, chord_root=chord, chord_tip=chord) # Simplified constant chord
    print(f"Wing Area: {wing.area:.2f} m2")
    print(f"Aspect Ratio: {wing.aspect_ratio:.2f}")

    print("\n--- Propulsion & Weight ---")
    empty_weight = input_float("Empty Weight (kg)", 700.0)
    max_power = input_float("Max Power (Watts) (160HP ~ 119000)", 119000.0)
    
    # 4. Create Aircraft
    # Assumptions for MVP
    tail = TailGeo(span=3.0, chord=1.0, arm=5.0) # Generic tail
    engine = Engine(max_power=max_power, type="piston")
    
    aircraft = Aircraft(
        name="Concept-1",
        wing=wing,
        tail=tail,
        airfoil=airfoil,
        engine=engine,
        empty_weight=empty_weight,
        payload=80.0, # Pilot
        fuel=100.0
    )
    
    # 5. Analysis
    print("\nCalculating Performance...")
    analyzer = PerformanceAnalyzer(aircraft)
    
    v_stall = analyzer.calculate_stall_speed(0) # Sea level
    v_max = analyzer.calculate_max_speed(0)
    ceiling = analyzer.calculate_ceiling()
    
    print("\n=== Performance Report ===")
    print(f"Total Weight: {aircraft.total_weight:.1f} N ({aircraft.total_mass:.1f} kg)")
    print(f"Wing Loading: {aircraft.total_weight/wing.area:.1f} N/m2")
    print("-" * 30)
    print(f"Stall Speed (SL): {v_stall:.1f} m/s ({v_stall*1.94384:.1f} kts)")
    print(f"Max Speed (SL):   {v_max:.1f} m/s ({v_max*1.94384:.1f} kts)")
    print(f"Service Ceiling:  {ceiling:.0f} m ({ceiling*3.28084:.0f} ft)")
    print("==========================")

if __name__ == "__main__":
    main()
