// Reminders.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReminderCard from "../components/ReminderCard";
import CreateReminder from "../components/CreateReminder";
import toast from "react-hot-toast";

const GROUPS = {
  TODAY: "Today",
  THIS_WEEK: "This Week",
  LATER: "Later",
};

const categories = ["all", "medicine", "vaccination", "checkup", "custom"];

/* ------------------ SAFE GROUP LOGIC (Final Stable Version) ------------------ */
function groupByTimeline(reminders = []) {
  if (!Array.isArray(reminders)) reminders = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - startOfToday.getDay()));

  const groups = {
    [GROUPS.TODAY]: [],
    [GROUPS.THIS_WEEK]: [],
    [GROUPS.LATER]: [],
  };

  reminders.forEach((r) => {
    if (!r?.nextRunAt) return;

    const next = new Date(r.nextRunAt);

    if (next >= startOfToday && next <= endOfToday) {
      groups[GROUPS.TODAY].push(r);
    } else if (next > endOfToday && next <= endOfWeek) {
      groups[GROUPS.THIS_WEEK].push(r);
    } else {
      groups[GROUPS.LATER].push(r);
    }
  });

  return groups;
}

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const remindersRef = useRef([]);

  /* -------------------- FETCH REMINDERS -------------------- */
  useEffect(() => {
    fetchReminders();
    const timer = setInterval(() => setReminders((r) => [...r]), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/reminders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReminders(res.data.reminders || []);
      remindersRef.current = res.data.reminders || [];
    } catch (err) {
      console.error("fetchReminders error:", err);
    }
    setLoading(false);
  };

  /* ----------------------- DELETE ----------------------- */
  const handleDelete = async (id) => {
    const prev = remindersRef.current;
    const item = prev.find((r) => r._id === id);

    if (!item) return;

    // remove immediately (optimistic)
    setReminders((r) => r.filter((x) => x._id !== id));

    const toastId = toast(
      (t) => (
        <div style={{ display: "flex", gap: 10 }}>
          <span>Deleted “{item.title}”</span>
          <button
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={() => {
              toast.dismiss(t.id);
              setReminders((r) => [item, ...r]); // restore
            }}
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000 }
    );

    // After timeout, permanently delete if not restored
    setTimeout(async () => {
      const stillDeleted = !remindersRef.current.some((x) => x._id === id);
      if (!stillDeleted) return;

      try {
        const token = localStorage.getItem("token");
        await axios.delete(`/api/reminders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("delete error:", err);
        toast.error("Delete failed — restoring");
        setReminders(prev);
      }
    }, 5200);
  };

  /* ----------------------- EDIT ----------------------- */
  const handleEdit = (reminder) => {
    setEditing(reminder);
    setShowCreate(true);
  };

  const handleCreatedOrUpdated = () => {
    setEditing(null);
    setShowCreate(false);
    fetchReminders();
  };

  /* ----------------------- FILTERING ----------------------- */
  const filtered = useMemo(() => {
    const byCat = reminders.filter((r) => {
      if (categoryFilter === "all") return true;
      return r.category?.toLowerCase() === categoryFilter.toLowerCase();
    });

    if (tab === "upcoming") {
      return byCat.filter((r) => new Date(r.nextRunAt) >= new Date());
    }

    return byCat;
  }, [reminders, categoryFilter, tab]);

  const groups = useMemo(() => groupByTimeline(filtered), [filtered]);

  /* ========================================================= */

  return (
    <div style={{ padding: 28, minHeight: "calc(100vh - 80px)" }}>
      {/* HEADER */}
      <h1 style={{ fontSize: 28 }}>🕒 Health Reminders</h1>
      <p style={{ color: "#64748b", marginTop: -5 }}>
        Track medicines, vaccinations & checkups easily.
      </p>

      {/* TABS + CATEGORY FILTER */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => {
            setTab("upcoming");
            setShowCreate(false);
            setEditing(null);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            background: tab === "upcoming" ? "#2563eb" : "#eef2ff",
            color: tab === "upcoming" ? "white" : "#0f172a",
            border: "none",
            fontWeight: 700,
          }}
        >
          Upcoming
        </button>

        <button
          onClick={() => {
            setTab("all");
            setShowCreate(false);
            setEditing(null);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            background: tab === "all" ? "#2563eb" : "#eef2ff",
            color: tab === "all" ? "white" : "#0f172a",
            border: "none",
            fontWeight: 700,
          }}
        >
          All Reminders
        </button>

        <button
          onClick={() => {
            setShowCreate(true);
            setEditing(null);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            background: "#10b981",
            color: "white",
            border: "none",
            fontWeight: 700,
            marginLeft: 8,
          }}
        >
          + Create
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              style={{
                padding: "6px 12px",
                borderRadius: 18,
                border: categoryFilter === c ? "2px solid #2563eb" : "1px solid #e6eef6",
                background: categoryFilter === c ? "#eff6ff" : "white",
                fontWeight: categoryFilter === c ? 700 : 600,
              }}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* FORM */}
      {showCreate && (
        <CreateReminder
          existing={editing}
          refresh={handleCreatedOrUpdated}
          cancel={() => {
            setEditing(null);
            setShowCreate(false);
          }}
        />
      )}

      {/* EMPTY */}
      {!loading && filtered.length === 0 && !showCreate && (
        <div style={{ textAlign: "center", marginTop: 50 }}>
          <div style={{ fontSize: 80, opacity: 0.06 }}>📭</div>
          <h3>No reminders found</h3>
        </div>
      )}

      {/* TIMELINE LIST */}
      {!loading && !showCreate && filtered.length > 0 && (
        <div style={{ display: "grid", gap: 18 }}>
          {groups[GROUPS.TODAY] &&
            groups[GROUPS.TODAY].length > 0 && (
              <section>
                <h4>Today</h4>
                {groups[GROUPS.TODAY].map((r) => (
                  <ReminderCard key={r._id} reminder={r} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
              </section>
            )}

          {groups[GROUPS.THIS_WEEK] &&
            groups[GROUPS.THIS_WEEK].length > 0 && (
              <section>
                <h4>This Week</h4>
                {groups[GROUPS.THIS_WEEK].map((r) => (
                  <ReminderCard key={r._id} reminder={r} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
              </section>
            )}

          {groups[GROUPS.LATER] &&
            groups[GROUPS.LATER].length > 0 && (
              <section>
                <h4>Later</h4>
                {groups[GROUPS.LATER].map((r) => (
                  <ReminderCard key={r._id} reminder={r} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
              </section>
            )}
        </div>
      )}

      {/* FLOATING BUTTON */}
      <motion.button
        onClick={() => {
          setShowCreate(true);
          setEditing(null);
        }}
        whileTap={{ scale: 0.9 }}
        style={{
          position: "fixed",
          right: 28,
          bottom: 28,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#2563eb,#10b981)",
          color: "white",
          border: "none",
          fontSize: 32,
          cursor: "pointer",
        }}
      >
        +
      </motion.button>
    </div>
  );
};

export default Reminders;
