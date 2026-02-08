import os
import subprocess
from typing import List, Tuple, Optional, Dict

class XFoilWrapper:
    @staticmethod
    def parse_polar_file(filepath: str) -> Dict[str, List[float]]:
        """
        Parses a standard XFoil polar output file.
        Returns a dictionary with 'alpha', 'CL', 'CD', 'CM', etc.
        """
        data = {
            "alpha": [],
            "CL": [],
            "CD": [],
            "CM": []
        }
        
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()
                
                # Scan for header line
                header_found = False
                for line in lines:
                    if "alpha" in line.lower() and "CL" in line and "CD" in line:
                        header_found = True
                        continue
                    
                    if header_found:
                        # Parse data lines
                        parts = line.split()
                        if len(parts) >= 3:
                            try:
                                # Standard format:  alpha    CL        CD       CDp       CM     Top_Xcp  Bot_Xcp
                                alpha = float(parts[0])
                                cl = float(parts[1])
                                cd = float(parts[2])
                                # cm = float(parts[4]) if len(parts) > 4 else 0.0
                                
                                data["alpha"].append(alpha)
                                data["CL"].append(cl)
                                data["CD"].append(cd)
                            except ValueError:
                                continue
        except Exception as e:
            print(f"Error parsing polar file {filepath}: {e}")
            
        return data

    @staticmethod
    def generate_input_file(airfoil_file: str, reynolds: float, alpha_start: float, alpha_end: float, step: float, output_polar: str = "polar.txt") -> str:
        """
        Generates the input script string for XFoil.
        """
        # Basic XFoil automation script
        script = f"""
LOAD {airfoil_file}
PANE
OPER
Visc {reynolds}
PACC
{output_polar}

ASEQ {alpha_start} {alpha_end} {step}
        """
        return script
