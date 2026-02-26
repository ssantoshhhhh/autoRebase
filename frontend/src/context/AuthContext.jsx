import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [policeUser, setPoliceUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const savedUser = localStorage.getItem('reva_user');
    const savedPoliceUser = localStorage.getItem('reva_police_user');
    const accessToken = localStorage.getItem('reva_token');
    const policeToken = localStorage.getItem('reva_police_token');

    if (savedUser && accessToken) {
      setUser(JSON.parse(savedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
    if (savedPoliceUser && policeToken) {
      setPoliceUser(JSON.parse(savedPoliceUser));
    }
    setLoading(false);
  }, []);

  const loginCitizen = (userData, token) => {
    setUser(userData);
    localStorage.setItem('reva_user', JSON.stringify(userData));
    localStorage.setItem('reva_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const loginPolice = (officerData, token) => {
    setPoliceUser(officerData);
    localStorage.setItem('reva_police_user', JSON.stringify(officerData));
    localStorage.setItem('reva_police_token', token);
  };

  const logoutCitizen = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {}
    setUser(null);
    localStorage.removeItem('reva_user');
    localStorage.removeItem('reva_token');
    delete api.defaults.headers.common['Authorization'];
  };

  const logoutPolice = async () => {
    try {
      await api.post('/api/police/auth/logout');
    } catch (e) {}
    setPoliceUser(null);
    localStorage.removeItem('reva_police_user');
    localStorage.removeItem('reva_police_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        policeUser,
        loading,
        loginCitizen,
        loginPolice,
        logoutCitizen,
        logoutPolice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
