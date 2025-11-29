import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { subscribePush } from "../hooks/usePush";

import {
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Box,
  Typography,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Paper,
  useTheme,
} from "@mui/material";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

import {
  LayoutDashboard,
  Activity,
  Leaf,
  Sparkles,
  LogOut,
  Heart,
  Bell,
} from "lucide-react";

import { useThemeMode } from "../theme/ThemeProvider";

const Navigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const theme = useTheme();

  const { mode, toggleTheme } = useThemeMode();

  const [anchorEl, setAnchorEl] = React.useState(null);

  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: theme.palette.background.paper,
        borderBottom: `1px solid ${
          mode === "light" ? "#e5e7eb" : "rgba(255,255,255,0.12)"
        }`,
        backdropFilter: "blur(12px)",
      }}
    >
      <Toolbar
        sx={{
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 0.5,
        }}
      >
        {/* LEFT - LOGO */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.3 }}>
          <Paper
            elevation={3}
            sx={{
              p: 1,
              bgcolor: "primary.main",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Heart size={20} color="white" />
          </Paper>

          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "primary.main", lineHeight: "1.1" }}
            >
              SwasthaParivar
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: mode === "light" ? "gray.600" : "gray.300" }}
            >
              Ayurvedic Wellness
            </Typography>
          </Box>
        </Box>

        {/* CENTER - NAV LINKS */}
        <Box sx={{ display: "flex", gap: 1 }}>
          {[
            { path: "/", label: "Home", icon: <LayoutDashboard size={18} /> },
            { path: "/health", label: "Health", icon: <Activity size={18} /> },
            { path: "/remedies", label: "Remedies", icon: <Leaf size={18} /> },
            { path: "/ai-chat", label: "AI Chat", icon: <Sparkles size={18} /> },
            {
              path: "/reminders",
              label: "Reminders",
              icon: <Bell size={18} />,
            },
          ].map((nav) => (
            <Button
              key={nav.path}
              component={Link}
              to={nav.path}
              startIcon={nav.icon}
              sx={{
                textTransform: "none",
                color: isActive(nav.path)
                  ? "primary.main"
                  : theme.palette.text.secondary,
                fontWeight: isActive(nav.path) ? 600 : 500,
                bgcolor: isActive(nav.path)
                  ? mode === "light"
                    ? "rgba(37, 99, 235, 0.08)"
                    : "rgba(255,255,255,0.1)"
                  : "transparent",
                borderRadius: 2,
                px: 2,
                transition: "0.2s",
              }}
            >
              {nav.label}
            </Button>
          ))}
        </Box>

        {/* RIGHT SIDE */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* 🌙 Theme Toggle Button */}
          <IconButton
            onClick={toggleTheme}
            sx={{
              bgcolor:
                mode === "light"
                  ? "rgba(0,0,0,0.06)"
                  : "rgba(255,255,255,0.15)",
              borderRadius: 2,
              p: "6px",
            }}
          >
            {mode === "light" ? (
              <DarkModeIcon sx={{ color: "#333" }} />
            ) : (
              <LightModeIcon sx={{ color: "white" }} />
            )}
          </IconButton>

          {/* Push Notification Button */}
          <Button
            variant="contained"
            size="small"
            startIcon={<Bell size={16} />}
            onClick={subscribePush}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              boxShadow: "none",
            }}
          >
            Enable Notifications
          </Button>

          {/* USER DROPDOWN */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.7,
              cursor: "pointer",
            }}
            onClick={openMenu}
          >
            <Avatar
              sx={{
                bgcolor: "secondary.main",
                width: 34,
                height: 34,
                fontWeight: 700,
              }}
            >
              {user?.fullName?.charAt(0) || "U"}
            </Avatar>

            <Typography sx={{ fontWeight: 600 }}>
              {user?.fullName}
            </Typography>
          </Box>

          {/* MENU */}
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
            <MenuItem disabled>{user?.email}</MenuItem>
            <Divider />
            <MenuItem
              sx={{ color: "error.main" }}
              onClick={() => {
                closeMenu();
                logout();
              }}
            >
              <LogOut size={18} style={{ marginRight: 8 }} /> Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
