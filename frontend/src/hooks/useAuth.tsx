import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { User, LoginRequest, RegisterRequest, AuthToken } from "@/types";
import { authService } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const userData = await authService.getProfile();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const resp = await authService.login(credentials); // ApiResponse<{user} & AuthToken>
      const { user: userData, access_token, refresh_token } = resp.data as { user: User } & AuthToken;
  
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser(userData);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const resp = await authService.register(data); // ApiResponse<{user} & AuthToken>
      const { user: userData, access_token, refresh_token } = resp.data as { user: User } & AuthToken;
  
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser(userData);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };
  

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem("refresh_token");
      if (!refreshTokenValue) throw new Error("No refresh token available");
  
      const resp = await authService.refreshToken(refreshTokenValue); // ApiResponse<AuthToken>
      const { access_token, refresh_token } = resp.data as AuthToken;
  
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      throw error;
    }
  };
  

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
