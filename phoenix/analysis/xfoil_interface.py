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
    @staticmethod
    def run_xfoil(airfoil_name: str, coords: List[Tuple[float, float]], reynolds: float, 
                  alpha_start: float = -5, alpha_end: float = 15, step: float = 1.0,
                  xfoil_path: str = "xfoil.exe", work_dir: str = ".") -> Optional[Dict[str, List[float]]]:
        """
        Executes XFoil to generate a polar for the given coordinates and Reynolds number.
        Returns the parsed polar data or None if execution failed.
        """
        if not coords:
            print("Error: No coordinates provided for XFoil analysis.")
            return None

        # 1. Write Coordinate File
        coord_file = os.path.join(work_dir, f"{airfoil_name}.dat")
        try:
            with open(coord_file, 'w') as f:
                f.write(f"{airfoil_name}\n")
                for x, y in coords:
                    f.write(f" {x:.6f}  {y:.6f}\n")
        except IOError as e:
            print(f"Error writing coordinate file: {e}")
            return None

        # 2. Generate Input Script
        polar_file = os.path.join(work_dir, f"{airfoil_name}_polar.txt")
        # Remove existing polar file to ensure we read a fresh one
        if os.path.exists(polar_file):
            try:
                os.remove(polar_file)
            except OSError:
                pass

        script_content = f"""
LOAD {coord_file}
PANE
OPER
Visc {reynolds}
PACC
{polar_file}

ASEQ {alpha_start} {alpha_end} {step}
quit
"""
        script_file = os.path.join(work_dir, "xfoil_input.txt")
        try:
            with open(script_file, 'w') as f:
                f.write(script_content)
        except IOError as e:
            print(f"Error writing script file: {e}")
            return None

        # 3. Run XFoil
        # Check if xfoil exists? We rely on subprocess error if not found in PATH
        print(f"Running XFoil for {airfoil_name} at Re={reynolds}...")
        try:
            # Redirect stdin from script file
            with open(script_file, 'r') as input_f:
                # We can also pipe stdout to hide the massive text spam from XFoil
                subprocess.run(xfoil_path, stdin=input_f, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        except (FileNotFoundError, subprocess.CalledProcessError):
            print("Error: Could not execute 'xfoil.exe'. Ensure it is installed and in your PATH.")
            print("You can download XFoil from https://web.mit.edu/drela/Public/web/xfoil/")
            return None

        # 4. Parse Output
        if not os.path.exists(polar_file):
            print("Error: XFoil did not generate a polar file. It might have failed to converge.")
            return None
            
        return XFoilWrapper.parse_polar_file(polar_file)
