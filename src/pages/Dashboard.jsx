import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import api from "../lib/api";

import AddMemberModal from "../components/AddMemberModal";

import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  Badge,
  IconButton,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

import {
  UserPlus,
  Heart,
  Bell,
  Calendar,
  Trash2
} from "lucide-react";

import "./Dashboard.css";

/* ====================================================================
   SAFE HELPERS
==================================================================== */

const safeArray = (res) => {
  try {
    if (!res) return [];
    if (Array.isArray(res)) return res;

    const picks = ["data", "items", "records", "list", "reminders"];
    for (const k of picks) if (Array.isArray(res[k])) return res[k];

    for (const v of Object.values(res)) {
      if (Array.isArray(v)) return v;
    }
  } catch {}
  return [];
};

const safeDate = (d) => {
  if (!d) return null;
  const z = new Date(d);
  return isNaN(z.getTime()) ? null : z;
};

const daysBetween = (d1, d2) => {
  if (!d1 || !d2) return Infinity;
  const a = new Date(d1).setHours(0, 0, 0, 0);
  const b = new Date(d2).setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
};

const inNextDays = (iso, days) => {
  const d = safeDate(iso);
  if (!d) return false;

  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);

  return d >= now && d <= future;
};

/* ====================================================================
   MAIN DASHBOARD
==================================================================== */

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  /** Delete flow states */
  const [confirmDelete, setConfirmDelete] = useState({ open: false, member: null });
  const [deletingId, setDeletingId] = useState(null);
  const prevMembersRef = useRef(null);

  /** AI **/
  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  /* --------------------------------------------------------------
     FETCH DATA
  -------------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const m = await api.get("/members");
        setMembers(safeArray(m));
      } catch {
        setMembers([]);
      }

      try {
        const r = await api.get("/health-records");
        setRecords(safeArray(r));
      } catch {
        setRecords([]);
      }

      try {
        const rem = await api.get("/reminders");
        setReminders(safeArray(rem));
      } catch {
        setReminders([]);
      }

      setTimeout(() => setLoading(false), 500);
    };

    load();
  }, []);

  /* --------------------------------------------------------------
     Add Member
  -------------------------------------------------------------- */
  const addMember = async (form) => {
    try {
      const newM = await api.post("/members", {
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
      });

      setMembers((prev) => [...prev, newM]);
      setShowAddModal(false);
    } catch {
      alert("Error adding member");
    }
  };

  /* --------------------------------------------------------------
     DELETE MEMBER — ONLY FROM FAMILY MEMBERS CARD
  -------------------------------------------------------------- */

  const openConfirmDelete = (member) => {
    setConfirmDelete({ open: true, member });
  };

  const closeConfirmDelete = () => {
    setConfirmDelete({ open: false, member: null });
  };

  const handleConfirmDelete = async () => {
    const member = confirmDelete.member;
    if (!member) return;

    prevMembersRef.current = members.slice();

    setDeletingId(member._id);

    setMembers((prev) => prev.filter((x) => x._id !== member._id));

    closeConfirmDelete();

    try {
      await api.delete(`/members/${member._id}`);
    } catch (err) {
      alert("Delete failed — restored.");
      setMembers(prevMembersRef.current);
    } finally {
      setTimeout(() => setDeletingId(null), 500);
    }
  };

  /* --------------------------------------------------------------
     AI Chat
  -------------------------------------------------------------- */
  const handleAiChat = async (e) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;

    setAiLoading(true);

    try {
      const r = await api.post("/ai/chat", { message: aiMessage });
      setAiResponse(r?.response || "No response");
      setAiMessage("");
    } catch {
      setAiResponse("AI error");
    }

    setAiLoading(false);
  };

  /* --------------------------------------------------------------
     Derived Insights
  -------------------------------------------------------------- */

  const membersWithoutRecords = useMemo(() => {
    const rset = new Set(records.map((r) => r.memberId));
    return members.filter((m) => !rset.has(m._id));
  }, [records, members]);

  const latestRecordByMember = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const id = r.memberId;
      const d = safeDate(r.createdAt) || new Date(0);
      if (!map[id] || new Date(map[id].createdAt) < d) {
        map[id] = r;
      }
    });
    return map;
  }, [records]);

  const needsAttention = useMemo(() => {
    const arr = [];
    const now = new Date();

    members.forEach((m) => {
      const age = Number(m.age);
      const last = latestRecordByMember[m._id];
      const gap = last ? daysBetween(last.createdAt, now) : Infinity;

      if (
        (age >= 60 && gap > 90) ||
        (gap > 180) ||
        (age < 12 && gap > 180)
      ) {
        arr.push({
          member: m,
          reason:
            age >= 60
              ? "Senior — needs regular checks"
              : age < 12
              ? "Child — check vaccines/growth"
              : "No recent records",
          daysSince: isFinite(gap) ? gap : null,
        });
      }
    });

    return arr;
  }, [members, latestRecordByMember]);

  const upcoming = useMemo(
    () =>
      reminders
        .filter((r) => r.datetime && inNextDays(r.datetime, 7))
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime)),
    [reminders]
  );

  const tasksThisWeek = useMemo(() => {
    const arr = [];

    upcoming.forEach((r) => {
      const m = members.find((x) => x._id === r.memberId);
      if (m)
        arr.push({
          id: r._id,
          type: "reminder",
          title: r.title,
          datetime: r.datetime,
          member: m,
        });
    });

    membersWithoutRecords.forEach((m) =>
      arr.push({
        id: `rec-${m._id}`,
        type: "record",
        title: "Add health record",
        member: m,
      })
    );

    needsAttention.forEach((n) =>
      arr.push({
        id: `att-${n.member._id}`,
        type: "attention",
        title: n.reason,
        member: n.member,
      })
    );

    return arr;
  }, [upcoming, membersWithoutRecords, needsAttention]);

  /* -------------------------------------------------------------------
     UI + RENDER
  ------------------------------------------------------------------- */

  const SkeletonList = () => (
    <List>
      {[1, 2, 3, 4].map((i) => (
        <ListItem key={i}>
          <ListItemAvatar>
            <Skeleton variant="circular" width={45} height={45} />
          </ListItemAvatar>
          <ListItemText
            primary={<Skeleton width="60%" />}
            secondary={<Skeleton width="40%" />}
          />
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box sx={{ pb: 8 }}>

      {/* HERO */}
      <Box
        className="hero-parallax"
        sx={{
          width: "100%",
          textAlign: "center",
          py: { xs: 6, md: 8 },
          background: "linear-gradient(135deg, #3b82f6, #10b981)",
          borderBottomLeftRadius: "40px",
          borderBottomRightRadius: "40px",
          color: "white",
          mb: 4,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 800 }}>
          Family Health Tracker
        </Typography>
        <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>
          Monitor your family’s wellness with AI + Ayurveda
        </Typography>
      </Box>

      <Box className="dashboard-container">

        {/* ================= ROW 1 ================= */}
        <Box className="two-col">

          {/* LEFT — Family Health Overview */}
          <Paper className="glass-card">
            <Box className="card-header">
              <Typography className="section-title">
                <Heart size={20} /> Family Health Overview
              </Typography>

              <Box className="header-badges">
                <Chip label={`${members.length} members`} color="primary" />
                <Chip label={`${records.length} records`} />
                <Badge badgeContent={needsAttention.length} color="error">
                  <IconButton size="small" onClick={() => setShowDrawer(true)}>
                    <Bell size={16} />
                  </IconButton>
                </Badge>
              </Box>
            </Box>

            <Divider className="divider" />

            {/* NO DELETE BUTTON HERE */}
            <Typography className="section-mini-title">Who needs attention</Typography>

            {loading ? (
              <SkeletonList />
            ) : needsAttention.length === 0 ? (
              <Typography color="text.secondary">Everyone looks good ✨</Typography>
            ) : (
              <List>
                {needsAttention.map((a) => (
                  <ListItem key={a.member._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `hsl(${a.member.name.charCodeAt(0) * 7},70%,60%)` }}>
                        {a.member.name[0]}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={<strong>{a.member.name}</strong>}
                      secondary={`${a.reason}${a.daysSince ? ` • ${a.daysSince} days ago` : ""}`}
                    />

                    <Button size="small" onClick={() => navigate(`/health/${a.member._id}`)}>
                      Open
                    </Button>
                  </ListItem>
                ))}
              </List>
            )}

            <Divider className="divider" />

            {/* NO DELETE BUTTON HERE */}
            <Typography className="section-mini-title">Members with no records</Typography>

            {loading ? (
              <SkeletonList />
            ) : membersWithoutRecords.length === 0 ? (
              <Typography color="text.secondary">Everyone has at least one record.</Typography>
            ) : (
              <List>
                {membersWithoutRecords.map((m) => (
                  <ListItem key={m._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `hsl(${m.name.charCodeAt(0) * 7},70%,60%)` }}>
                        {m.name[0]}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={<strong>{m.name}</strong>}
                      secondary={`${m.age} years`}
                    />

                    <Button size="small" onClick={() => navigate(`/health/${m._id}`)}>
                      Add Record
                    </Button>
                  </ListItem>
                ))}
              </List>
            )}

          </Paper>

          {/* RIGHT — Tasks */}
          <Paper className="glass-card">
            <Box className="card-header">
              <Typography className="section-title">
                <Calendar size={20} /> This Week — Medical Tasks
              </Typography>

              <Button variant="outlined" onClick={() => navigate("/reminders")}>
                Manage Reminders
              </Button>
            </Box>

            <Divider className="divider" />

            {loading ? (
              <SkeletonList />
            ) : tasksThisWeek.length === 0 ? (
              <Typography color="text.secondary">No tasks this week.</Typography>
            ) : (
              <List>
                {tasksThisWeek.map((t) => (
                  <ListItem key={t.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `hsl(${t.member.name.charCodeAt(0) * 7},70%,60%)` }}>
                        {t.member.name[0]}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={<strong>{t.title}</strong>}
                      secondary={
                        <>
                          {t.member.name}
                          {t.datetime ? ` • ${safeDate(t.datetime).toLocaleString()}` : ""}
                        </>
                      }
                    />

                    <Button
                      size="small"
                      onClick={() =>
                        t.type === "reminder"
                          ? navigate("/reminders")
                          : navigate(`/health/${t.member._id}`)
                      }
                    >
                      Open
                    </Button>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>

        {/* ================= ROW 2 ================= */}
        <Box className="two-col">

          {/* FAMILY MEMBERS — ONLY place with delete */}
          <Paper className="glass-card">
            <Box className="card-header">
              <Typography className="section-title">Family Members</Typography>

              <Button
                variant="contained"
                startIcon={<UserPlus />}
                onClick={() => setShowAddModal(true)}
              >
                Add Member
              </Button>
            </Box>

            <Divider className="divider" />

            {loading ? (
              <SkeletonList />
            ) : (
              <List>
                {members.map((m) => (
                  <ListItem key={m._id} className={deletingId === m._id ? "deleting" : ""}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `hsl(${m.name.charCodeAt(0) * 7},70%,60%)` }}>
                        {m.name[0]}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={<strong>{m.name}</strong>}
                      secondary={`${m.age} years`}
                    />

                    <Button size="small" onClick={() => navigate(`/health/${m._id}`)}>
                      Open
                    </Button>

                    {/* DELETE ONLY HERE */}
                    <IconButton
                      size="small"
                      aria-label="delete"
                      onClick={() => openConfirmDelete(m)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          {/* AI CHAT */}
          <Paper className="glass-card">
            <Typography className="section-title">AI Assistant</Typography>

            <form
              onSubmit={handleAiChat}
              style={{ display: "flex", gap: 12, marginTop: 8 }}
            >
              <TextField
                placeholder="Ask a health question…"
                fullWidth
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
              />

              <Button type="submit" variant="contained">
                {aiLoading ? "…" : "Ask"}
              </Button>
            </form>

            {aiResponse && (
              <Paper sx={{ mt: 2, p: 2, borderLeft: "4px solid #2563EB" }}>
                <Typography sx={{ fontWeight: 700 }}>AI Response</Typography>
                <Typography sx={{ mt: 1 }}>{aiResponse}</Typography>
              </Paper>
            )}
          </Paper>

        </Box>
      </Box>

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSave={addMember}
        />
      )}

      {/* CONFIRM DELETE */}
      <Dialog open={confirmDelete.open} onClose={closeConfirmDelete}>
        <DialogTitle>Delete family member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{confirmDelete.member?.name}</strong>?  
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDelete}>Cancel</Button>
          <Button color="error" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* NOTIFICATION DRAWER — DELETE REMOVED */}
      {showDrawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setShowDrawer(false)} />

          <div className="drawer-panel">
            <div className="drawer-header">
              <h3>Family Health Alerts</h3>
              <button className="drawer-close" onClick={() => setShowDrawer(false)}>×</button>
            </div>

            <div className="drawer-content">
              {needsAttention.length === 0 ? (
                <p className="drawer-empty">🎉 Everyone looks healthy!</p>
              ) : (
                <List>
                  {needsAttention.map((a) => (
                    <ListItem key={a.member._id} className="drawer-item">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: `hsl(${a.member.name.charCodeAt(0) * 7},70%,60%)` }}>
                          {a.member.name[0]}
                        </Avatar>
                      </ListItemAvatar>

                      <ListItemText
                        primary={<strong>{a.member.name}</strong>}
                        secondary={a.reason}
                      />

                      <Button size="small" onClick={() => navigate(`/health/${a.member._id}`)}>
                        Open
                      </Button>

                      {/* NO DELETE HERE */}
                    </ListItem>
                  ))}
                </List>
              )}
            </div>
          </div>
        </>
      )}

    </Box>
  );
};

export default Dashboard;
