import math

class Atmosphere:
    # Constants for ISA (International Standard Atmosphere)
    g = 9.80665 # m/s^2
    R = 287.0   # J/(kg*K)
    
    # Sea level values
    T0 = 288.15 # K (15 C)
    P0 = 101325.0 # Pa
    rho0 = 1.225 # kg/m^3
    
    # Lapse rate (Troposphere)
    L = 0.0065 # K/m

    # --- ISA Layer Boundaries ---
    # Layer boundaries: (base_alt_m, base_temp_K, base_pressure_Pa, lapse_rate_K/m)
    # Covers 0-86 km per ICAO Doc 7488 / ISO 2533
    _LAYERS = [
        # (h_base, T_base,   P_base,      L_layer)
        (0.0,     288.15,  101325.00,  -0.0065),   # Troposphere      0–11 km
        (11000.0, 216.65,   22632.10,   0.0000),   # Lower Stratosph.11–20 km
        (20000.0, 216.65,    5474.89,   0.0010),   # Middle Stratosph.20–32 km
        (32000.0, 228.65,     868.02,   0.0028),   # Upper Stratosph. 32–47 km
        (47000.0, 270.65,     110.91,   0.0000),   # Stratopause      47–51 km
        (51000.0, 270.65,      66.94,  -0.0028),   # Lower Mesosphere 51–71 km
        (71000.0, 214.65,       3.96,  -0.0020),   # Upper Mesosphere 71–86 km
    ]

    @staticmethod
    def _isa_layer(altitude: float):
        """Return (T, P) for a given altitude using the full ISA layer model."""
        h = max(0.0, altitude)
        layers = Atmosphere._LAYERS
        # Find the applicable layer
        layer_idx = 0
        for i in range(len(layers) - 1):
            if h >= layers[i + 1][0]:
                layer_idx = i + 1
            else:
                break
        h_b, T_b, P_b, L_b = layers[layer_idx]
        delta_h = h - h_b
        if abs(L_b) < 1e-12:  # Isothermal layer
            T = T_b
            P = P_b * math.exp(-Atmosphere.g * delta_h / (Atmosphere.R * T_b))
        else:                  # Gradient layer
            T = T_b + L_b * delta_h
            T = max(T, 0.001)  # safety clamp
            P = P_b * (T / T_b) ** (-Atmosphere.g / (Atmosphere.R * L_b))
        return T, P

    @staticmethod
    def get_density(altitude: float) -> float:
        """
        Calculate air density (rho) at a given altitude (meters) using the
        full ISA model (ICAO Doc 7488 / ISO 2533).  Valid up to 86 km.
        """
        T, P = Atmosphere._isa_layer(altitude)
        return P / (Atmosphere.R * T)

    @staticmethod
    def get_temperature(altitude: float) -> float:
        """Return ISA temperature (K) at the given altitude (m)."""
        T, _ = Atmosphere._isa_layer(altitude)
        return T
