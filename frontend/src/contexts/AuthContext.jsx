import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  // Pull the full profile (weight, height, age, etc.) from the server
  const fetchFullUser = async (base) => {
    try {
      const me = await api.get('/auth/me');
      const full = { ...base, ...me.data };
      await AsyncStorage.setItem('user', JSON.stringify(full));
      return full;
    } catch (err) {
      return base;
    }
  };

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
          await AsyncStorage.removeItem('token');
        } else {
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            const cached = JSON.parse(storedUser);
            setUser(cached);
            // refresh in the background so the profile is never stale
            fetchFullUser(cached).then(setUser);
          } else {
            const res = await api.get('/auth/me');
            setUser(res.data);
            await AsyncStorage.setItem('user', JSON.stringify(res.data));
          }
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    await AsyncStorage.setItem('token', res.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(res.data));
    const full = await fetchFullUser(res.data);
    setUser(full);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('token', res.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(res.data));
    const full = await fetchFullUser(res.data);
    setUser(full);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser(prev => {
      const updated = { ...prev, ...updatedData };
      AsyncStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);