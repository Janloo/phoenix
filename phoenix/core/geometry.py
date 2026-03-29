from dataclasses import dataclass
import math

@dataclass
class WingGeo:
    span: float      # b (m)
    chord_root: float # cr (m)
    chord_tip: float  # ct (m)
    mass: float = 0.0 # kg
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
    def mean_aerodynamic_cord(self) -> float:
        # Approximate for straight tapered wing
        taper = self.chord_tip / self.chord_root
        return (2/3) * self.chord_root * ((1 + taper + taper**2) / (1 + taper))

    def get_stations(self, num_stations: int = 10) -> List[Tuple[float, float, float]]:
        """
        Returns a list of (y, chord, area) for spanwise stations.
        y is the distance from the centerline (positive = right wing).
        """
        stations = []
        # Calculate for one wing and then mirror? 
        # For BET we usually iterate over the whole span.
        dy = self.span / num_stations
        y_start = -self.span / 2
        
        for i in range(num_stations):
            y_mid = y_start + (i + 0.5) * dy
            # Linearly interpolate chord
            # distance from center = abs(y_mid)
            dist_norm = abs(y_mid) / (self.span / 2)
            chord = self.chord_root + dist_norm * (self.chord_tip - self.chord_root)
            area = chord * dy
            stations.append((y_mid, chord, area))
            
        return stations

@dataclass
class TailGeo:
    span: float
    chord: float # Average chord
    arm: float   # Distance from Wing AC to Tail AC (leverage arm)
    mass: float = 0.0 # kg
    
    @property
    def area(self) -> float:
        return self.span * self.chord
    
    @property
    def aspect_ratio(self) -> float:
        return (self.span ** 2) / self.area
