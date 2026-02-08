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

    @staticmethod
    def get_density(altitude: float) -> float:
        """
        Calculate air density (rho) at a given altitude (meters) using ISA model.
        Valid for Troposphere (< 11km).
        """
        if altitude > 11000:
            # Simplified handling for Stratosphere (constant Temp)
            # Not strictly implementing full stratosphere model for MVP 
            # unless needed, but clamping T helps avoid crash.
            T = Atmosphere.T0 - Atmosphere.L * 11000
            # Pressure calculation changes above 11km, but let's stick to Troposphere model 
            # or return a warning/approx for now.
            # Real implementation would switch formula.
            # Using Troposphere formula widely for GA altitudes.
            pass

        T = Atmosphere.T0 - Atmosphere.L * altitude
        if T <= 0: T = 0.001 # Safety
        
        pressure = Atmosphere.P0 * (1 - (Atmosphere.L * altitude) / Atmosphere.T0) ** (Atmosphere.g / (Atmosphere.R * Atmosphere.L))
        density = pressure / (Atmosphere.R * T)
        
        return density

    @staticmethod
    def get_temperature(altitude: float) -> float:
        return Atmosphere.T0 - Atmosphere.L * altitude
