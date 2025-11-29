import React, { useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { Heart, ShieldCheck, Users, Sparkles, Mail, Lock } from "lucide-react";
import "../Auth.css";


const Auth = () => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
      } else {
        await signup(formData);
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo & Title */}
        <div className="auth-logo">💙</div>
        <h1 className="auth-title">Family Health Tracker</h1>
        <p className="auth-subtitle">Your wellness, powered by AI + Ayurveda</p>

        {/* Feature Icons */}
        <div className="features">
          <div className="feature-item">
            <Sparkles size={24} />
            <span>AI Powered</span>
          </div>
          <div className="feature-item">
            <ShieldCheck size={24} />
            <span>Secure</span>
          </div>
          <div className="feature-item">
            <Users size={24} />
            <span>Family</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`tab-btn ${isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button
            className={`tab-btn ${!isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                name="fullName"
                type="text"
                required
                className="input-field"
                onChange={handleChange}
                value={formData.fullName}
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              name="email"
              type="email"
              required
              className="input-field"
              onChange={handleChange}
              value={formData.email}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              name="password"
              type="password"
              required
              className="input-field"
              onChange={handleChange}
              value={formData.password}
            />
            <div className="forgot-text">
              {isLogin && <span>Forgot password?</span>}
            </div>
          </div>

          <button className="auth-btn" disabled={loading}>
            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="divider">OR CONTINUE WITH</div>

        {/* Social Buttons */}
        <div className="social-buttons">
          <div className="social-btn">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" width="20" />
            Google
          </div>

          <div className="social-btn">
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width="20" />
            Apple
          </div>
        </div>

        <p className="policy-text">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>

      </div>
    </div>
  );
};

export default Auth;
