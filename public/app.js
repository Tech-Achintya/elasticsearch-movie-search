/* ═══════════════════════════════════════════════════════════
   CineSearch — app.js
   Real-time suggestions (Netflix/Amazon-style) + search results
   ═══════════════════════════════════════════════════════════ */

// ── DOM Refs ────────────────────────────────────────────────
const searchInput    = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");
const clearBtn       = document.getElementById("clearBtn");
const resultsEl      = document.getElementById("results");
const genresEl       = document.getElementById("genres");
const genresSection  = document.getElementById("genresSection");
const resultsHeader  = document.getElementById("resultsHeader");
const resultsCount   = document.getElementById("resultsCount");

// ── State ────────────────────────────────────────────────────
let activeIndex      = -1;   // keyboard-highlighted suggestion
let currentSuggestions = []; // last suggestion list
let debounceTimer    = null;
const DEBOUNCE_MS    = 180;  // fast — like Netflix

// ══════════════════════════════════════════════════════════════
//  AUTOCOMPLETE — real-time, debounced, keyboard-navigable
// ══════════════════════════════════════════════════════════════

searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();

    // Show / hide clear button
    clearBtn.classList.toggle("visible", q.length > 0);

    // Reset keyboard state
    activeIndex = -1;

    // Debounce the API call
    clearTimeout(debounceTimer);

    if (!q) {
        closeSuggestions();
        return;
    }

    debounceTimer = setTimeout(() => fetchSuggestions(q), DEBOUNCE_MS);
});

async function fetchSuggestions(q) {
    try {
        const res  = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        currentSuggestions =
            data["movie-suggestions"]?.[0]?.options || [];

        renderSuggestions(q);
    } catch (err) {
        // Likely opened as file:// instead of http://localhost:4000
        if (err instanceof TypeError && err.message.includes("fetch")) {
            suggestionsBox.innerHTML = `<div class="suggestion-no-results">⚠️ Open the app at <strong><a href="http://localhost:4000" style="color:#e50914">http://localhost:4000</a></strong></div>`;
            suggestionsBox.classList.add("open");
        }
        console.error("Suggest error:", err);
    }
}

function renderSuggestions(query) {
    if (!currentSuggestions.length) {
        suggestionsBox.innerHTML = `
            <div class="suggestion-no-results">
                No suggestions for "<strong>${escHtml(query)}</strong>"
            </div>`;
        suggestionsBox.classList.add("open");
        return;
    }

    const header = `<div class="suggestion-header">🎬 Top matches</div>`;

    const items = currentSuggestions.map((s, i) => {
        const text       = escHtml(s.text);
        const highlighted = highlightMatch(text, query);

        return `
        <div class="suggestion-item"
             role="option"
             data-index="${i}"
             onclick="pickSuggestion('${escHtml(s.text).replace(/'/g, "\\'")}')">
            <div class="suggestion-icon">🎥</div>
            <div class="suggestion-text">${highlighted}</div>
            <div class="suggestion-hint">↵ search</div>
        </div>`;
    }).join("");

    suggestionsBox.innerHTML = header + items;
    suggestionsBox.classList.add("open");
}

function closeSuggestions() {
    suggestionsBox.classList.remove("open");
    activeIndex = -1;
}

// ── Keyboard navigation (↑ ↓ Enter Escape) ──────────────────
searchInput.addEventListener("keydown", (e) => {
    const items = suggestionsBox.querySelectorAll(".suggestion-item");

    if (!items.length) {
        if (e.key === "Enter") searchMovies();
        return;
    }

    if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        updateActive(items);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, -1);
        updateActive(items);
    } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
            const text = currentSuggestions[activeIndex]?.text;
            if (text) pickSuggestion(text);
        } else {
            closeSuggestions();
            searchMovies();
        }
    } else if (e.key === "Escape") {
        closeSuggestions();
    }
});

function updateActive(items) {
    items.forEach((el, i) => el.classList.toggle("active", i === activeIndex));
    if (activeIndex >= 0 && items[activeIndex]) {
        // Reflect in input but keep cursor at end
        searchInput.value = currentSuggestions[activeIndex].text;
        clearBtn.classList.add("visible");
    }
}

function pickSuggestion(text) {
    searchInput.value = text;
    clearBtn.classList.add("visible");
    closeSuggestions();
    searchMovies();
}

// ── Close suggestions when clicking outside ──────────────────
document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
        closeSuggestions();
    }
});

// ── Clear button ─────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.classList.remove("visible");
    closeSuggestions();
    searchInput.focus();
    resultsEl.innerHTML = "";
    genresSection.style.display = "none";
    resultsHeader.style.display = "none";
});

// ══════════════════════════════════════════════════════════════
//  SEARCH — full results
// ══════════════════════════════════════════════════════════════

async function searchMovies() {
    const q        = searchInput.value.trim();
    const genre    = document.getElementById("genre").value;
    const yearFrom = document.getElementById("yearFrom").value;
    const yearTo   = document.getElementById("yearTo").value;

    const params = new URLSearchParams();
    if (q)        params.set("q", q);
    if (genre)    params.set("genre", genre);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo)   params.set("yearTo", yearTo);

    // Show loading skeletons
    renderSkeletons();

    try {
        const res  = await fetch(`/api/search?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const hits = data.hits?.hits || [];
        const total = data.hits?.total?.value ?? hits.length;

        renderResults(hits, total);
        renderGenreFacets(data.aggregations?.genres?.buckets || []);
    } catch (err) {
        const isNetworkErr = err instanceof TypeError && err.message.includes("fetch");
        resultsEl.innerHTML = `<div class="empty-state">
            <span class="emoji">⚠️</span>
            <p>${isNetworkErr
                ? 'Open the app at <a href="http://localhost:4000" style="color:#e50914">http://localhost:4000</a> — do not open index.html directly.'
                : 'Search failed. Check that Elasticsearch is running on port 9200.'
            }</p>
        </div>`;
        console.error("Search error:", err);
    }
}

// ── Render movie cards ───────────────────────────────────────
function renderResults(hits, total) {
    // Update header
    resultsHeader.style.display = "flex";
    resultsCount.innerHTML = `Showing <strong>${hits.length}</strong> of <strong>${total}</strong> results`;

    if (!hits.length) {
        resultsEl.innerHTML = `<div class="empty-state">
            <span class="emoji">🎭</span>
            <p>No movies found. Try a different search.</p>
        </div>`;
        genresSection.style.display = "none";
        return;
    }

    // Compute max score for relevance bars
    const maxScore = Math.max(...hits.map(h => h._score || 1), 1);

    resultsEl.innerHTML = hits.map((hit, idx) => {
        const movie  = hit._source;
        const score  = hit._score || 0;
        const pct    = Math.min(100, Math.round((score / maxScore) * 100));

        const titleHtml = hit.highlight?.title?.[0]
            ? hit.highlight.title[0]
            : escHtml(movie.title);

        const descHtml = hit.highlight?.description?.[0]
            ? hit.highlight.description[0]
            : escHtml(movie.description || "");

        return `
        <article class="movie" style="animation-delay:${idx * 40}ms">
            <h2>${titleHtml}</h2>
            <div class="movie-meta">
                <span class="meta-badge meta-genre">${escHtml(movie.genre || "")}</span>
                <span class="meta-badge meta-year">${movie.year || ""}</span>
                <span class="meta-badge meta-rating">⭐ ${movie.rating || ""}</span>
            </div>
            <div class="movie-desc">${descHtml}</div>
            <div class="relevance-bar">
                <span class="relevance-label">Relevance</span>
                <div class="relevance-track">
                    <div class="relevance-fill" style="width:${pct}%"></div>
                </div>
                <span class="relevance-label">${score.toFixed(1)}</span>
            </div>
        </article>`;
    }).join("");
}

// ── Genre facet pills ────────────────────────────────────────
function renderGenreFacets(buckets) {
    if (!buckets.length) {
        genresSection.style.display = "none";
        return;
    }

    genresSection.style.display = "block";
    genresEl.innerHTML = buckets.map(b => `
        <span class="genre-pill" onclick="filterByGenre('${escHtml(b.key)}')">
            ${escHtml(b.key)}<span class="count">${b.doc_count}</span>
        </span>`
    ).join("");
}

function filterByGenre(genre) {
    document.getElementById("genre").value = genre;
    searchMovies();
}

// ── Populate genre dropdown from aggregations ────────────────
async function loadGenres() {
    try {
        const res  = await fetch("/api/search");
        const data = await res.json();
        const buckets = data.aggregations?.genres?.buckets || [];
        const select  = document.getElementById("genre");

        buckets.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.key;
            opt.textContent = `${b.key} (${b.doc_count})`;
            select.appendChild(opt);
        });
    } catch (e) {
        // silently ignore — genres optional
    }
}

// ── Skeleton loader ──────────────────────────────────────────
function renderSkeletons(count = 6) {
    resultsHeader.style.display = "none";
    resultsEl.innerHTML = Array.from({ length: count }).map(() => `
        <div class="movie">
            <div class="skeleton" style="height:22px;width:70%;margin-bottom:12px"></div>
            <div class="skeleton" style="height:14px;width:40%;margin-bottom:12px"></div>
            <div class="skeleton" style="height:14px;width:100%;margin-bottom:6px"></div>
            <div class="skeleton" style="height:14px;width:90%"></div>
        </div>`
    ).join("");
}

// ── Helpers ──────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function highlightMatch(text, query) {
    // Bold the matching prefix/substring in the suggestion
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        text.slice(0, idx) +
        `<mark>${text.slice(idx, idx + query.length)}</mark>` +
        text.slice(idx + query.length)
    );
}

// ── Init ─────────────────────────────────────────────────────
loadGenres();

// ══════════════════════════════════════════════════════════════
//  ADD MOVIE MODAL
// ══════════════════════════════════════════════════════════════

function openAddModal() {
    document.getElementById("addModal").classList.add("open");
    document.getElementById("modalBackdrop").classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("m-title").focus(), 100);
}

function closeAddModal() {
    document.getElementById("addModal").classList.remove("open");
    document.getElementById("modalBackdrop").classList.remove("open");
    document.body.style.overflow = "";
    clearFormErrors();
}

// Close on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAddModal();
});

// ── Client-side validation ───────────────────────────────────
function validateMovieForm(data) {
    const errors = [];
    clearFormErrors();

    const required = {
        "m-title":       data.title,
        "m-description": data.description,
        "m-genre":       data.genre,
        "m-year":        data.year,
        "m-rating":      data.rating,
    };

    let hasEmpty = false;
    for (const [id, val] of Object.entries(required)) {
        if (!val || String(val).trim() === "") {
            document.getElementById(id).classList.add("invalid");
            hasEmpty = true;
        }
    }
    if (hasEmpty) errors.push("Please fill in all required fields (marked with *).");

    if (data.year && (Number(data.year) < 1888 || Number(data.year) > 2100)) {
        document.getElementById("m-year").classList.add("invalid");
        errors.push("Year must be between 1888 and 2100.");
    }
    if (data.rating && (Number(data.rating) < 0 || Number(data.rating) > 10)) {
        document.getElementById("m-rating").classList.add("invalid");
        errors.push("Rating must be between 0 and 10.");
    }

    return errors;
}

function clearFormErrors() {
    ["m-title","m-description","m-genre","m-year","m-rating","m-poster"]
        .forEach(id => document.getElementById(id)?.classList.remove("invalid"));
    const errEl = document.getElementById("formError");
    errEl.textContent = "";
    errEl.classList.remove("visible");
}

function showFormError(msg) {
    const errEl = document.getElementById("formError");
    errEl.textContent = msg;
    errEl.classList.add("visible");
}

// ── Submit handler ───────────────────────────────────────────
async function submitMovie(e) {
    e.preventDefault();

    const data = {
        title:       document.getElementById("m-title").value.trim(),
        description: document.getElementById("m-description").value.trim(),
        genre:       document.getElementById("m-genre").value.trim(),
        year:        document.getElementById("m-year").value,
        rating:      document.getElementById("m-rating").value,
        poster_url:  document.getElementById("m-poster").value.trim(),
    };

    const errors = validateMovieForm(data);
    if (errors.length) { showFormError(errors[0]); return; }

    const submitBtn   = document.getElementById("submitBtn");
    const submitLabel = document.getElementById("submitLabel");
    submitBtn.disabled  = true;
    submitLabel.textContent = "Adding…";

    try {
        const res = await fetch("/api/movies", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                ...data,
                year:   Number(data.year),
                rating: Number(data.rating),
            }),
        });

        const result = await res.json();

        if (!res.ok) {
            showFormError(result.error || "Failed to add movie. Please try again.");
            return;
        }

        closeAddModal();
        document.getElementById("addMovieForm").reset();
        showToast(`✅ "${data.title}" added to the index!`);
        await refreshGenreDropdown();
        if (searchInput.value.trim()) searchMovies();

    } catch (err) {
        showFormError("Network error — is the server running on port 4000?");
        console.error("Add movie error:", err);
    } finally {
        submitBtn.disabled = false;
        submitLabel.textContent = "Add Movie";
    }
}

// ── Success toast ────────────────────────────────────────────
function showToast(message) {
    document.querySelectorAll(".toast").forEach(t => t.remove());
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("show")));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ── Refresh genre dropdown + datalist after add ──────────────
async function refreshGenreDropdown() {
    try {
        const res  = await fetch("/api/search");
        const data = await res.json();
        const buckets = data.aggregations?.genres?.buckets || [];
        const select  = document.getElementById("genre");
        const current = select.value;

        select.innerHTML = '<option value="">All Genres</option>';
        buckets.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.key;
            opt.textContent = `${b.key} (${b.doc_count})`;
            select.appendChild(opt);
        });
        select.value = current;

        const dl = document.getElementById("genre-datalist");
        if (dl) dl.innerHTML = buckets.map(b => `<option value="${escHtml(b.key)}">`).join("");
    } catch (_) { /* non-critical */ }
}