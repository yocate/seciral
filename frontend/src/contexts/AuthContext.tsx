import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  display_name: string;
  department: string;
  career: string;
  characteristics: string;
  big5_openness?: number;
  big5_conscientiousness?: number;
  big5_extraversion?: number;
  big5_agreeableness?: number;
  big5_neuroticism?: number;
  strategic_persona?: string;
  mbti_type?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('sip_auth_token');
    const storedUser = localStorage.getItem('sip_auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoaded(true);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('sip_auth_token', newToken);
    localStorage.setItem('sip_auth_user', JSON.stringify(newUser));
    // For backward compatibility with older components still using localStorage
    localStorage.setItem('sip_author', newUser.display_name);
    localStorage.setItem('sip_department', newUser.department);
    localStorage.setItem('sip_career', newUser.career);
    localStorage.setItem('sip_characteristics', newUser.characteristics);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sip_auth_token');
    localStorage.removeItem('sip_auth_user');
    // For backward compatibility
    localStorage.removeItem('sip_author');
    localStorage.removeItem('sip_department');
    localStorage.removeItem('sip_career');
    localStorage.removeItem('sip_characteristics');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('sip_auth_user', JSON.stringify(updatedUser));
    // For backward compatibility
    localStorage.setItem('sip_author', updatedUser.display_name);
    localStorage.setItem('sip_department', updatedUser.department);
    localStorage.setItem('sip_career', updatedUser.career);
    localStorage.setItem('sip_characteristics', updatedUser.characteristics);
  };

  if (!isLoaded) return null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
