// client/src/pages/remedies.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Leaf,
  Star,
  ChevronDown,
  X,
  Share2,
  Search,
  Loader2,
  Filter,
  ArrowLeftRight,
  Heart
} from "lucide-react";

import "./remedies.css";
import REMEDIES_DATA from "../data/Remedies";
import api from "../lib/api"; 

const PAGE_SIZE = 8;

export default function Remedies() {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("relevance");
  const [page, setPage] = useState(1);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("remedy_favs") || "[]");
    } catch {
      return [];
    }
  });
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => {
    localStorage.setItem("remedy_favs", JSON.stringify(favorites));
  }, [favorites]);

  const allTags = useMemo(() => {
    const s = new Set();
    REMEDIES_DATA.forEach((r) => (r.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let out = REMEDIES_DATA.filter((r) => {
      const inQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.symptoms || "").toLowerCase().includes(q) ||
        (r.ingredients || []).join(" ").toLowerCase().includes(q) ||
        (r.tags || []).join(" ").toLowerCase().includes(q);

      const inTags =
        selectedTags.length === 0 ||
        selectedTags.every((t) => (r.tags || []).includes(t));

      return inQuery && inTags;
    });

    if (sortBy === "rating") out = out.slice().sort((a, b) => b.rating - a.rating);
    if (sortBy === "time") out = out.slice().sort((a, b) => a.timeMins - b.timeMins);

    if (sortBy === "relevance" && q) {
      out = out.slice().sort((a, b) => {
        const score = (item) =>
          (item.name.toLowerCase().includes(q) ? 4 : 0) +
          (item.symptoms.toLowerCase().includes(q) ? 2 : 0) +
          (item.tags.join(" ").toLowerCase().includes(q) ? 1 : 0);
        return score(b) - score(a);
      });
    }

    return out;
  }, [query, selectedTags, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleTag = (t) => {
    setPage(1);
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const toggleFav = (id) => {
    setFavorites((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );
  };

  const doShare = async (r) => {
    const text = `${r.name}\n${r.symptoms}\nIngredients: ${(r.ingredients || [])
      .slice(0, 5)
      .join(", ")}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: r.name, text });
      } else {
        await navigator.clipboard.writeText(`${r.name}\n\n${text}`);
        alert("Copied remedy to clipboard");
      }
    } catch {}
  };

  const askAi = async (seedText) => {
    if (!seedText) return;
    setAiBusy(true);
    setAiSuggestions([]);

    try {
      const res = await api.post("/ai/chat", {
        message: `Suggest 5 ayurvedic remedies for: ${seedText}`,
      });

      const text = res.response || "";
      const suggestions = text
        .replace(/\*/g, "")
        .split(/\n|,|;|-|:/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
        .slice(0, 6);

      setAiSuggestions(
        suggestions.length
          ? suggestions
          : ["Tulsi Kadha", "Ginger Tea", "Turmeric Milk"]
      );
    } catch {
      setAiSuggestions(["Tulsi Kadha", "Ginger Tea", "Turmeric Milk"]);
    } finally {
      setAiBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpenRecipe(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="rem-wrap">
      {/* HEADER */}
      <div className="rem-top">
        <div className="rem-brand">
          <div className="rem-logo">
            <Leaf size={34} />
          </div>
          <div>
            <h1>Remedies — Ultra Pro</h1>
            <p className="muted">
              Search, filter, save and follow step-by-step Ayurvedic recipes
            </p>
          </div>
        </div>

        <div className="rem-controls">
          <div className="searchbox">
            <Search size={16} />
            <input
              placeholder="Search remedy, symptom or ingredient..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button className="ai-btn" onClick={() => askAi(query)}>
            {aiBusy ? <Loader2 className="spin" /> : "AI Suggest"}
          </button>
        </div>
      </div>

      {/* TAGS & SORT */}
      <div className="rem-filters">
        <div className="tag-row">
          {allTags.map((t) => (
            <button
              key={t}
              className={`tag ${selectedTags.includes(t) ? "active" : ""}`}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="sort-row">
          <label>Sort:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="relevance">Relevance</option>
            <option value="rating">Top Rated</option>
            <option value="time">Shortest Time</option>
          </select>
        </div>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="ai-suggestions">
          <strong>AI Suggestions:</strong>
          <div className="ai-chips">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(s);
                  setPage(1);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GRID */}
      <main className="rem-grid">
        {pageItems.length === 0 ? (
          <div className="empty">No remedies found.</div>
        ) : (
          pageItems.map((r) => (
            <article className="rem-card" key={r.id || r.name}>
              <div
                className="rem-hero"
                style={{
                  background: `linear-gradient(135deg, ${
                    r.colorFrom || "#79d38d"
                  }, ${r.colorTo || "#4CAF50"})`,
                }}
              >
                <div className="rem-badge">
                  <Star size={14} /> {r.rating}
                </div>

                <button
                  className={`fav ${favorites.includes(r.id) ? "on" : ""}`}
                  onClick={() => toggleFav(r.id)}
                >
                  <Heart size={18} />
                </button>
              </div>

              <div className="rem-body">
                <h3>{r.name}</h3>
                <small>
                  {r.timeMins} mins · {r.difficulty || "Easy"}
                </small>

                <p className="rem-sym">{r.symptoms}</p>

                <div className="rem-actions">
                  <button className="btn primary" onClick={() => setOpenRecipe(r)}>
                    View Recipe <ChevronDown size={14} />
                  </button>

                  <button className="btn ghost" onClick={() => doShare(r)}>
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </main>

      {/* PAGINATION */}
      <div className="pager">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          Prev
        </button>

        <div className="pages">
          Page {page} of {pageCount}
        </div>

        <button
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={page === pageCount}
        >
          Next
        </button>
      </div>

      {/* MODAL */}
      {openRecipe && (
        <div className="modal-backdrop" onClick={() => setOpenRecipe(null)}>
          <div className="modal-pro" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpenRecipe(null)}>
              <X size={20} />
            </button>

            <div
              className="modal-pro-header"
              style={{
                background: `linear-gradient(135deg, ${openRecipe.colorFrom}, ${openRecipe.colorTo})`,
              }}
            >
              <h2>{openRecipe.name}</h2>
              <div className="modal-stats">
                <span>
                  <Star size={16} /> {openRecipe.rating}
                </span>
                <span>⏱ {openRecipe.timeMins} mins</span>
                <span>{openRecipe.difficulty}</span>
              </div>
            </div>

            <div className="modal-pro-content">
              <div className="modal-left">
                <h3>Ingredients</h3>
                <ul className="pretty-list">
                  {openRecipe.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>

                <h3>Steps</h3>
                <ol className="pretty-list">
                  {openRecipe.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>

              <aside className="modal-right">
                <h3>Why it works</h3>
                <p>{openRecipe.ayurveda}</p>

                <div className="modal-actions">
                  <button
                    className={`save-btn ${
                      favorites.includes(openRecipe.id) ? "saved" : ""
                    }`}
                    onClick={() => toggleFav(openRecipe.id)}
                  >
                    <Heart size={18} />
                    {favorites.includes(openRecipe.id) ? "Saved" : "Save"}
                  </button>

                  <button className="share-btn" onClick={() => doShare(openRecipe)}>
                    <Share2 size={18} /> Share
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
