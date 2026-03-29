import math
from typing import Tuple, Dict, List
from phoenix.core.aircraft import Aircraft
from phoenix.core.environment import Atmosphere

class Simulator6DOF:
    def __init__(self, aircraft: Aircraft):
        self.aircraft = aircraft
        # State: [u, v, w, p, q, r, phi, theta, psi, x, y, z]
        self.state = [0.0] * 12
        
    def reset(self, initial_state: List[float] = None):
        if initial_state is not None:
            self.state = list(initial_state)
        else:
            self.state = [0.0] * 12

    def get_derivative(self, state, controls, time):
        # 1. Extract state
        u, v, w = state[0:3]
        p, q, r = state[3:6]
        phi, theta, psi = state[6:9]
        pos = state[9:12]
        
        # 2. Get Atmosphere
        density = Atmosphere.get_density(pos[2])
        
        # 3. Get Aerodynamic Forces and Moments (Body Frame)
        v_body = (u, v, w)
        omega = (p, q, r)
        f_aero, m_aero = self.aircraft.get_aerodynamic_forces_and_moments(
            v_body, omega, controls, density
        )
        
        # 4. Get Thrust (Body Frame)
        thrust_mag = self.aircraft.get_thrust(density, u)
        f_thrust = (thrust_mag, 0.0, 0.0) 
        
        # 5. Gravity (World -> Body)
        # Assuming Z-Up world, G=(0, 0, -9.81)
        # For simplicity, rotating G manually:
        m = self.aircraft.total_mass
        g = 9.81
        s_phi, c_phi = math.sin(phi), math.cos(phi)
        s_the, c_the = math.sin(theta), math.cos(theta)
        
        fg_body = [
            -m * g * s_the,
            m * g * c_the * s_phi,
            -m * g * c_the * c_phi
        ]
        
        # 6. Total Forces and Moments
        fx = f_aero[0] + f_thrust[0] + fg_body[0]
        fy = f_aero[1] + f_thrust[1] + fg_body[1]
        fz = f_aero[2] + f_thrust[2] + fg_body[2]
        mx, my, mz = m_aero
        
        # 7. Equations of Motion
        # Linear
        du = fx / m - (q * w - r * v)
        dv = fy / m - (r * u - p * w)
        dw = fz / m - (p * v - q * u)
        
        # Angular
        ixx, iyy, izz = self.aircraft.get_inertia_tensor()
        dp = (mx - (izz - iyy) * q * r) / ixx
        dq = (my - (ixx - izz) * r * p) / iyy
        dr = (mz - (iyy - ixx) * p * q) / izz
        
        # Kinematics
        dphi = p + (q * s_phi + r * c_phi) * math.tan(theta)
        dtheta = q * c_phi - r * s_phi
        dpsi = (q * s_phi + r * c_phi) / c_the if abs(c_the) > 1e-6 else 0.0
        
        # World Rates
        dx = u * c_the + (v * s_phi + w * c_phi) * s_the
        dy = v * c_phi - w * s_phi
        dz = -u * s_the + (v * s_phi + w * c_phi) * c_the
        
        return [du, dv, dw, dp, dq, dr, dphi, dtheta, dpsi, dx, dy, dz]

    def step(self, controls: Dict[str, float], dt: float):
        """RK4 manual integration"""
        def add_vec(v1, v2, factor=1.0):
            return [x + y * factor for x, y in zip(v1, v2)]
            
        k1 = self.get_derivative(self.state, controls, 0.0)
        
        s2 = add_vec(self.state, k1, 0.5 * dt)
        k2 = self.get_derivative(s2, controls, 0.5 * dt)
        
        s3 = add_vec(self.state, k2, 0.5 * dt)
        k3 = self.get_derivative(s3, controls, 0.5 * dt)
        
        s4 = add_vec(self.state, k3, dt)
        k4 = self.get_derivative(s4, controls, dt)
        
        # sum = dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        for i in range(12):
            self.state[i] += (dt / 6.0) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i])
            
        # Altitude floor
        if self.state[11] < 0:
            self.state[11] = 0
            self.state[2] = max(0.0, self.state[2])
