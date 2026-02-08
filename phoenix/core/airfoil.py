import json
import os
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

@dataclass
class AirfoilData:
    name: str
    description: str
    alpha: List[float]
    cl: List[float]
    cd: List[float]
    coordinates: Optional[List[Tuple[float, float]]] = None
    
    def update_polars(self, alpha: List[float], cl: List[float], cd: List[float]):
        self.alpha = alpha
        self.cl = cl
        self.cd = cd

class Airfoil:
    def __init__(self, data: AirfoilData):
        self.data = data

    def update_polars(self, polar_data: Dict[str, List[float]]):
        """
        Updates the internal polar data from a dictionary (e.g. from XFoil).
        """
        if "alpha" in polar_data and "CL" in polar_data and "CD" in polar_data:
            self.data.update_polars(polar_data["alpha"], polar_data["CL"], polar_data["CD"])

    def get_coefficients(self, alpha: float) -> Tuple[float, float]:
        """
        Interpolates Cl and Cd for a given angle of attack (alpha) in degrees.
        """
        # Linear interpolation
        alphas = self.data.alpha
        cls = self.data.cl
        cds = self.data.cd
        
        if not alphas: # Empty polar data
            return 0.0, 0.0

        # Handle out of bounds by clamping (simple generic Stall behavior)
        if alpha <= alphas[0]:
            return cls[0], cds[0]
        if alpha >= alphas[-1]:
            return cls[-1], cds[-1]

        for i in range(len(alphas) - 1):
            if alphas[i] <= alpha <= alphas[i+1]:
                # Interpolate
                ratio = (alpha - alphas[i]) / (alphas[i+1] - alphas[i])
                cl = cls[i] + ratio * (cls[i+1] - cls[i])
                cd = cds[i] + ratio * (cds[i+1] - cds[i])
                return cl, cd
        
        return 0.0, 0.0 # Should not reach here

    @staticmethod
    def parse_selig_dat(filepath: str) -> List[Tuple[float, float]]:
        """
        Parses a .dat file in Selig format (Header line, then X Y coordinates).
        """
        coords = []
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()
                # Skip header (usually first line)
                # Some files might have more header lines, standard Selig has 1.
                start_idx = 1
                
                for line in lines[start_idx:]:
                    parts = line.split()
                    if len(parts) >= 2:
                        try:
                            x = float(parts[0])
                            y = float(parts[1])
                            coords.append((x, y))
                        except ValueError:
                            continue
        except Exception as e:
            print(f"Error parsing dat file {filepath}: {e}")
            return []
            
        return coords

class AirfoilDatabase:
    def __init__(self, data_dir: str = "phoenix/data"):
        self.data_dir = data_dir
        self.airfoils: Dict[str, AirfoilData] = {}
        # Load JSON first (legacy support / caching)
        self.load_json_database(os.path.join(data_dir, "airfoils.json"))
        # Scan for .dat files in airfoils subdir
        self.scan_dat_files(os.path.join(data_dir, "airfoils"))

    def load_json_database(self, filepath: str):
        if not os.path.exists(filepath):
            pass

        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                for entry in data:
                    af_data = AirfoilData(
                        name=entry["name"],
                        description=entry.get("description", ""),
                        alpha=entry["polars"]["alpha"],
                        cl=entry["polars"]["cl"],
                        cd=entry["polars"]["cd"]
                    )
                    self.airfoils[af_data.name] = af_data
        except Exception as e:
             print(f"Error loading JSON: {e}")
             pass

    def scan_dat_files(self, dirpath: str):
        if not os.path.exists(dirpath):
            return
            
        for filename in os.listdir(dirpath):
            if filename.endswith(".dat"):
                filepath = os.path.join(dirpath, filename)
                # Name derived from filename? or content?
                # Simple approach: Use filename without extension as key if not exists
                name_key = os.path.splitext(filename)[0].upper() # e.g. CLARKY
                
                coords = Airfoil.parse_selig_dat(filepath)
                
                # Update existing or create new
                if name_key in self.airfoils:
                    self.airfoils[name_key].coordinates = coords
                else:
                    # Create new entry with empty polars (will need XFoil to gen them later)
                    # Try to find a match in existing keys with loose matching?
                    # For now, strict match.
                    
                    # Check if we have a match in the JSON data with a different casing
                    # e.g. JSON has "NACA 2412", file is "naca2412.dat" -> match logic needed
                    # Let's try to normalize keys to UPPER removing spaces
                    
                    # For MVP, just add it.
                    self.airfoils[name_key] = AirfoilData(
                        name=name_key,
                        description=f"Imported from {filename}",
                        alpha=[], cl=[], cd=[],
                        coordinates=coords
                    )

    def get_airfoil(self, name: str) -> Optional[Airfoil]:
        if name in self.airfoils:
            return Airfoil(self.airfoils[name])
        return None

    def list_airfoils(self) -> List[str]:
        return list(self.airfoils.keys())
