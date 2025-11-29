import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const data = await api.post("/auth/login", credentials);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate("/");
    } catch (error) {
      console.error("Login failed", error);
      throw error; 
    }
  };

  const signup = async (userData) => {
    try {
      const data = await api.post("/auth/signup", userData);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate("/");
    } catch (error) {
      console.error("Signup failed", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};