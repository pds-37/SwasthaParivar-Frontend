import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

import Navigation from "./components/Navigation";
import { AuthProvider, useAuth } from "./components/AuthProvider";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import HealthMonitor from "./pages/HealthMonitor";
import Remedies from "./pages/Remedies";
import AIChat from "./pages/AIChat";
import Reminders from "./pages/Reminders";

// 🌙 NEW THEME PROVIDER
import { AppThemeProvider } from "./theme/ThemeProvider";

// Protected Layout
const Layout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Navigation />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
};

// ------------------------------------------------------
// 🔥 MAIN APP COMPONENT (NOW WITH DARK/LIGHT THEME)
// ------------------------------------------------------
const App = () => {
  const token = localStorage.getItem("token");
  const [familyData, setFamilyData] = useState([]);

  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const res = await axios.get("/api/members", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFamilyData(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    if (token) fetchFamily();
  }, [token]);

  return (
    <AppThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth */}
            <Route path="/auth" element={<Auth />} />

            {/* Dashboard */}
            <Route
              path="/"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />

            {/* Health monitor */}
            <Route
              path="/health"
              element={
                <Layout>
                  <HealthMonitor />
                </Layout>
              }
            />

            <Route
              path="/health/:id"
              element={
                <Layout>
                  <HealthMonitor />
                </Layout>
              }
            />

            {/* Remedies */}
            <Route
              path="/remedies"
              element={
                <Layout>
                  <Remedies />
                </Layout>
              }
            />

            {/* AI Chat */}
            <Route
              path="/ai-chat"
              element={
                <Layout>
                  <AIChat token={token} userFamily={familyData} />
                </Layout>
              }
            />

            {/* Reminders */}
            <Route
              path="/reminders"
              element={
                <Layout>
                  <Reminders />
                </Layout>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </AppThemeProvider>
  );
};

export default App;
