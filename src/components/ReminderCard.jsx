// ReminderCard.jsx
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Trash2, Clock, User, Repeat } from "lucide-react";

/**
 * ReminderCard (premium)
 * Props:
 *  - reminder: { _id, title, memberName, category, nextRunAt, recurring?: { type: 'daily'|'weekly'|'monthly' }, meta?: {...} }
 *  - onDelete(id)
 *  - onEdit(reminder)
 *
 * Behavior:
 *  - Drag horizontally to dismiss (swipe-to-delete). If dragged left > threshold -> call onDelete.
 *  - Progress circle shows how much time is left (0..100).
 *  - Color heatmap on left shows urgency.
 */

const categoryColors = {
  medicine: "#3b82f6",
  vaccination: "#10b981",
  checkup: "#8b5cf6",
  custom: "#f59e0b",
};

const computeDaysLeft = (nextDate) => {
  const now = new Date();
  const diff = new Date(nextDate) - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const computeProgress = (nextDate) => {
  // progress between now and nextDate relative to a sensible window
  const now = new Date();
  const nd = new Date(nextDate);
  const totalWindow = Math.max(1, (nd - now) / (1000 * 60 * 60 * 24)); // days
  // For visualization we clamp totalWindow to 30 days max, and compute percent of time remaining within 30-day window
  const clampWindow = Math.min(Math.max(totalWindow, 0), 30);
  // If nextDate is > 30 days, we show small progress; if within 0..30, fill according to position
  const daysLeft = Math.max(0, Math.ceil((nd - now) / (1000 * 60 * 60 * 24)));
  const percent = Math.max(0, Math.min(100, Math.round(((30 - clampWindow) / 30) * 100)));
  // Better: percent = (1 - daysLeft/30)*100 when daysLeft <=30, else small percent
  const p = daysLeft <= 30 ? Math.round((1 - daysLeft / 30) * 100) : 10;
  return p;
};

const heatColor = (daysLeft) => {
  // green -> yellow -> orange -> red
  if (daysLeft <= 0) return "#ef4444"; // red
  if (daysLeft <= 3) return "#fb923c"; // orange
  if (daysLeft <= 7) return "#f59e0b"; // amber
  if (daysLeft <= 14) return "#facc15"; // yellow
  return "#10b981"; // green
};

const ProgressCircle = ({ percent, size = 48 }) => {
  const circumference = 2 * Math.PI * 18; // r=18
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="18" stroke="#e6eef6" strokeWidth="5" fill="none" />
      <circle
        cx="24"
        cy="24"
        r="18"
        strokeLinecap="round"
        stroke="#2563eb"
        strokeWidth="5"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        transform="rotate(-90 24 24)"
        fill="none"
      />
      <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#0f172a">
        {percent}%
      </text>
    </svg>
  );
};

const ReminderCard = ({ reminder, onDelete, onEdit }) => {
  const nextDue = new Date(reminder.nextRunAt);
  const daysLeft = computeDaysLeft(nextDue);
  const progress = computeProgress(nextDue);
  const color = heatColor(daysLeft);
  const catColor = categoryColors[reminder.category] || "#94a3b8";

  const recurringLabel = reminder.recurring?.type ? reminder.recurring.type.toUpperCase() : null;

  // handle drag end threshold
  const handleDragEnd = (event, info) => {
    const threshold = -120; // if dragged left beyond -120 px, delete
    if (info.point.x <= threshold || info.offset.x <= threshold) {
      onDelete && onDelete(reminder._id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50, scale: 0.98, transition: { duration: 0.2 } }}
      whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(16,24,40,0.06)" }}
      drag="x"
      dragConstraints={{ left: -999, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        background: "white",
        borderRadius: 14,
        padding: 18,
        borderLeft: `6px solid ${color}`,
        boxShadow: "0 6px 18px rgba(2,6,23,0.03)",
        position: "relative",
      }}
    >
      {/* left indicator / heat dot */}
      <div style={{ width: 8, height: 8, borderRadius: 8, background: color, marginLeft: -12, marginTop: 6 }} />

      {/* Progress */}
      <div style={{ width: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ProgressCircle percent={progress} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>{reminder.title}</h3>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569" }}>
                <User size={14} /> <span style={{ fontSize: 13 }}>{reminder.memberName}</span>
              </div>

              <div style={{ padding: "4px 8px", background: catColor, color: "white", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                {reminder.category?.toUpperCase() || "CUSTOM"}
              </div>

              {recurringLabel && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#374151", marginLeft: 6 }}>
                  <Repeat size={14} />
                  <span style={{ fontSize: 12, color: "#475569" }}>{recurringLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => onEdit && onEdit(reminder)}
              aria-label="edit"
              style={{
                background: "#eff6ff",
                border: "none",
                padding: 8,
                borderRadius: 10,
                cursor: "pointer",
                color: "#2563eb"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#2563eb" />
                <path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#2563eb" />
              </svg>
            </button>

            <button
              onClick={() => onDelete && onDelete(reminder._id)}
              aria-label="delete"
              style={{
                background: "#fff1f2",
                border: "none",
                padding: 8,
                borderRadius: 10,
                cursor: "pointer",
                color: "#ef4444"
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 12, alignItems: "center", color: "#475569" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={14} /> <strong>Next Due:</strong>
            <span style={{ marginLeft: 6 }}>{nextDue.toLocaleString()}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={14} />
            <span>{daysLeft <= 0 ? "Due today" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}</span>
          </div>
        </div>

        {/* optional note */}
        {reminder.note && (
          <div style={{ marginTop: 12, color: "#334155", background: "#f8fafc", padding: 10, borderRadius: 8 }}>
            {reminder.note}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ReminderCard;
