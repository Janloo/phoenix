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

class Airfoil:
    def __init__(self, data: AirfoilData):
        self.data = data

    def get_coefficients(self, alpha: float) -> Tuple[float, float]:
        """
        Interpolates Cl and Cd for a given angle of attack (alpha) in degrees.
        """
        # Linear interpolation
        alphas = self.data.alpha
        cls = self.data.cl
        cds = self.data.cd

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

class AirfoilDatabase:
    def __init__(self, filepath: str = "phoenix/data/airfoils.json"):
        self.filepath = filepath
        self.airfoils: Dict[str, AirfoilData] = {}
        self.load_database()

    def load_database(self):
        if not os.path.exists(self.filepath):
            # Try absolute path if relative fails, or create default if needed
            # For now, simplistic handling
            print(f"Warning: Database file not found at {self.filepath}")
            return

        with open(self.filepath, 'r') as f:
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

    def get_airfoil(self, name: str) -> Optional[Airfoil]:
        if name in self.airfoils:
            return Airfoil(self.airfoils[name])
        return None

    def list_airfoils(self) -> List[str]:
        return list(self.airfoils.keys())
