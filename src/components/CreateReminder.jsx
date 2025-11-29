import React, { useState, useEffect } from "react";
import axios from "axios";

const CreateReminder = ({ refresh }) => {
  const token = localStorage.getItem("token");

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("medicine");
  const [memberId, setMemberId] = useState("");
  const [members, setMembers] = useState([]);

  const [frequency, setFrequency] = useState("once");
  const [time, setTime] = useState("09:00");
  const [nextRunAt, setNextRunAt] = useState("");

  // Fetch family members for dropdown
  useEffect(() => {
    const fetchMembers = async () => {
      const res = await axios.get("/api/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(res.data);
    };
    fetchMembers();
  }, []);

  const submit = async () => {
    if (!title) return alert("Title required");
    if (!nextRunAt) return alert("Select next run date & time");
    if (!memberId) return alert("Select a family member");

    await axios.post(
      "/api/reminders",
      {
        title,
        description: desc,
        category,
        memberId,
        frequency,
        options: { time },
        nextRunAt,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    refresh();

    // Reset fields
    setTitle("");
    setDesc("");
    setCategory("medicine");
    setMemberId("");
    setFrequency("once");
    setNextRunAt("");
  };

  return (
    <div
      style={{
        padding: 20,
        background: "white",
        borderRadius: 15,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ marginBottom: 15 }}>➕ Create New Reminder</h2>

      {/* Title */}
      <input
        type="text"
        placeholder="Title (e.g., Vaccination Dose 2)"
        style={inputStyle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* Description */}
      <textarea
        placeholder="Description (optional)"
        style={{ ...inputStyle, height: 70 }}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />

      {/* Category */}
      <label style={labelStyle}>Reminder Type</label>
      <select
        style={inputStyle}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="medicine">Medicine</option>
        <option value="vaccination">Vaccination</option>
        <option value="checkup">Checkup</option>
        <option value="custom">Custom</option>
      </select>

      {/* Member selector */}
      <label style={labelStyle}>Family Member</label>
      <select
        style={inputStyle}
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
      >
        <option value="">Select Member</option>
        {members.map((m) => (
          <option key={m._id} value={m._id}>
            {m.name} ({m.relation})
          </option>
        ))}
      </select>

      {/* Frequency */}
      <label style={labelStyle}>Frequency</label>
      <select
        style={inputStyle}
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
      >
        <option value="once">One Time</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>

      {/* Time of day */}
      <label style={labelStyle}>Time</label>
      <input
        type="time"
        style={inputStyle}
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />

      {/* Date & Time */}
      <label style={labelStyle}>Next Run Date</label>
      <input
        type="datetime-local"
        style={inputStyle}
        value={nextRunAt}
        onChange={(e) => setNextRunAt(e.target.value)}
      />

      {/* Submit Button */}
      <button style={btnStyle} onClick={submit}>
        Create Reminder 🚀
      </button>
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "4px",
  display: "block",
  color: "#475569",
};

const btnStyle = {
  width: "100%",
  padding: "12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  marginTop: 10,
  cursor: "pointer",
};

export default CreateReminder;
