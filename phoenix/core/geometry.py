from dataclasses import dataclass
import math

@dataclass
class WingGeo:
    span: float      # b (m)
    chord_root: float # cr (m)
    chord_tip: float  # ct (m)
    sweep: float = 0.0 # degrees at quarter chord
    dihedral: float = 0.0 # degrees
    
    @property
    def area(self) -> float:
        # Trapezoidal approximation
        return 0.5 * (self.chord_root + self.chord_tip) * self.span

    @property
    def aspect_ratio(self) -> float:
        return (self.span ** 2) / self.area
    
    @property
    def mean_aerodynamic_chord(self) -> float:
        # Approximate for straight tapered wing
        taper = self.chord_tip / self.chord_root
        return (2/3) * self.chord_root * ((1 + taper + taper**2) / (1 + taper))

@dataclass
class TailGeo:
    span: float
    chord: float # Average chord
    arm: float   # Distance from Wing AC to Tail AC (leverage arm)
    
    @property
    def area(self) -> float:
        return self.span * self.chord
    
    @property
    def aspect_ratio(self) -> float:
        return (self.span ** 2) / self.area
