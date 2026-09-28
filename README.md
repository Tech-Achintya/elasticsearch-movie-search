# 🎬 CineSearch — Movie Search Engine

> **A hands-on Elasticsearch learning project** — I built a full-stack movie search engine from scratch to deeply understand how Elasticsearch works, covering everything from inverted indexes to custom analyzers to real-time autocomplete.

---

## 🧠 Why I Built This

Rather than just reading documentation, I wanted to *build* something real with Elasticsearch. I took a dataset of **1,000 real movies** and built a complete search experience — the kind you see on Netflix or Amazon — to understand how production search actually works under the hood.

---

## ⚡ Live Features

- 🔍 **Real-time autocomplete** — Netflix-style suggestions as you type (Completion Suggester)
- 🎯 **Full-text search** across title and description with field boosting (`title^3`)
- 🔀 **Fuzzy search** — finds results even with typos (`fuzziness: AUTO`)
- 🏷️ **Genre filters** — exact keyword matching + aggregation-powered facets
- 📅 **Year range filtering** — range queries on integer fields
- ✨ **Highlighted matches** — matched terms highlighted in results
- ➕ **Add movies** — index new documents live via a form, immediately searchable
- 📊 **Relevance scores** — see BM25 `_score` visualized for each result

---

## 🏗️ Architecture

```
CSV Dataset (1,000 movies)
        ↓
  Bulk Indexing API
        ↓
  Elasticsearch :9200
        ↓
  Express + Node.js + TypeScript
        ↓
  REST Search/Suggest/Add API
        ↓
  HTML / CSS / JS Frontend
```

**Infrastructure:** Elasticsearch + Kibana running via Docker Compose

---

## 📚 Elasticsearch Concepts I Learned

This project wasn't just about writing code — it was a structured deep-dive into how Elasticsearch actually works.

### 🏛️ Core Architecture
- What an **index**, **document**, and **field** are and how they map to database equivalents
- How **mappings** define field types and why they matter for search behaviour
- The difference between **Elasticsearch** (search engine, port 9200) and **Kibana** (UI/DevTools, port 5601)
- Why **reindexing is required** when changing analyzers or field mappings

### 🔡 How Text Search Actually Works
- **Inverted index** — how Elasticsearch builds a lookup table from terms to documents for O(1) lookups
- **Index-time analysis pipeline**: text goes through tokenizer → token filters → stored as terms
- Built a **custom analyzer** with:
  - `standard` tokenizer (splits on whitespace/punctuation)
  - `lowercase` filter
  - `english` stop word removal (removes "the", "a", "is", etc.)
  - `english` stemmer (reduces "running" → "run", "movies" → "movie")

### 📊 Relevance & Scoring
- **BM25 scoring algorithm** — how `_score` is calculated based on term frequency, inverse document frequency, and field length normalization
- Why boosting `title^3` makes title matches rank higher than description matches
- How field length affects score (short title match scores higher than same match in a long description)

### 🔍 Query DSL
```json
// Everything I practiced building by hand:
match               // Full-text search on a single field
multi_match         // Search across multiple fields with boost
bool                // Combine queries with must / filter / should
must                // Scored — affects relevance
filter              // Unscored — for exact matches (faster, cached)
term                // Exact keyword match (genre)
range               // Year between X and Y
fuzziness: "AUTO"   // Typo-tolerant search
```

### 🔎 Aggregations
- **Terms aggregation** — count documents grouped by `genre` keyword field
- Used aggregation results to build the genre facet sidebar (like e-commerce filters)
- Understood why aggregations need `keyword` fields (not analyzed `text`)

### ✍️ Highlighting
- Configured `highlight` on `title` and `description` fields
- Elasticsearch wraps matched terms in `<em>` tags — frontend renders them with red highlights

### 💡 Completion Suggester (Autocomplete)
- Mapped a `suggest` field with `type: completion`
- Populated it with the movie title at index time
- Queried with `prefix` to get instant suggestions sorted by `_score`
- Why completion suggester is faster than `match_phrase_prefix` (in-memory FST data structure)

### 📦 Bulk Indexing
- Used the **Bulk API** to index 1,000 movies in a single HTTP request instead of 1,000 individual requests
- Understood the ndjson format: alternating action + document lines

### 🔌 Node.js Integration
- Connected to Elasticsearch using the official `@elastic/elasticsearch` Node.js client
- Built an Express REST API that translates HTTP query params → Elasticsearch DSL queries
- Handled filters conditionally (only add a `filter` clause if the param is present)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Search Engine | Elasticsearch 9.x |
| Visualization | Kibana 9.x |
| Infrastructure | Docker + Docker Compose |
| Backend | Node.js + Express + TypeScript |
| Frontend | Vanilla HTML / CSS / JS |
| Dataset | 1,000 movies CSV |

---

## 🚀 Running Locally

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 18+

### 1. Start Elasticsearch + Kibana

```bash
docker compose up -d
```

Wait ~30 seconds for Elasticsearch to be healthy, then verify:

```bash
curl http://localhost:9200
# Should return cluster info JSON
```

Kibana available at → **http://localhost:5601**

### 2. Install dependencies

```bash
npm install
```

### 3. Index the movie dataset

```bash
npx tsx src/import.ts
```

This bulk-indexes all 1,000 movies into the `movies` index.

### 4. Start the server

```bash
npx tsx src/server.ts
```

### 5. Open the app

👉 **http://localhost:4000**

> ⚠️ Don't open `index.html` directly — open via the server URL so API calls work.

---

## 🗂️ Project Structure

```
movie-search-engine/
├── docker-compose.yml       # Elasticsearch + Kibana setup
├── data/
│   └── real_movies_dataset.csv
├── src/
│   ├── import.ts            # Bulk indexing script
│   └── server.ts            # Express API (search, suggest, add)
└── public/
    ├── index.html           # Frontend UI
    ├── style.css            # Dark theme, animations
    └── app.js               # Search + autocomplete + add movie logic
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/search?q=inception&genre=Action&yearFrom=2000&yearTo=2020` | Full-text search with filters |
| `GET` | `/api/suggest?q=inc` | Autocomplete suggestions |
| `POST` | `/api/movies` | Index a new movie document |

### POST `/api/movies` body

```json
{
  "title":       "Inception",
  "description": "A thief who steals corporate secrets through dream-sharing technology.",
  "genre":       "Action",
  "year":        2010,
  "rating":      8.8,
  "poster_url":  "https://..."
}
```

---

## 📋 Elasticsearch Field Mapping

| Field | ES Type | Purpose |
|---|---|---|
| `title` | `text` | Full-text search + boosting (`title^3`) |
| `description` | `text` | Full-text search |
| `genre` | `keyword` | Exact filters + terms aggregation |
| `year` | `integer` | Range filtering |
| `rating` | `float` | Sorting / filtering |
| `poster_url` | `keyword` | Display only |
| `suggest` | `completion` | Autocomplete suggester |

---

## 🧪 Kibana Dev Tools Queries I Practiced

```json
// Check cluster health
GET /

// View index mapping
GET movies/_mapping

// Count documents
GET movies/_count

// Analyze how text gets tokenized
POST movies/_analyze
{
  "analyzer": "english",
  "text": "The Dark Knight rises"
}

// Full bool query with filters, aggregations, highlight
POST movies/_search
{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "query": "space adventure",
          "fields": ["title^3", "description"],
          "fuzziness": "AUTO"
        }
      },
      "filter": [
        { "term": { "genre": "Action" } },
        { "range": { "year": { "gte": 2000, "lte": 2020 } } }
      ]
    }
  },
  "aggs": {
    "genres": { "terms": { "field": "genre", "size": 20 } }
  },
  "highlight": {
    "fields": { "title": {}, "description": {} }
  }
}
```

---

## 🌩️ Next Steps (Cloud Deployment)

This project is ready to be connected to **Elastic Cloud** by updating the client config:

```typescript
const client = new Client({
  cloud: { id: process.env.ELASTIC_CLOUD_ID },
  auth: {
    username: process.env.ELASTIC_USERNAME,
    password: process.env.ELASTIC_PASSWORD
  }
});
```

---

## 🎓 Key Takeaways

1. **Elasticsearch is not a database** — it's optimized for search, not transactions
2. **Mappings are critical** — wrong field type (text vs keyword) breaks filters and aggregations
3. **Analyzers run at index time AND query time** — both sides must use the same analyzer
4. **`filter` is faster than `must`** — filters are cached and don't affect scoring
5. **Completion suggester is blazing fast** — uses a Finite State Transducer (FST) kept in memory
6. **BM25 scoring** means result order isn't random — it's mathematically computed relevance

---

## 🚦 Get Started

Want to run this project yourself? Here's everything you need in one place.

### What you need

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — to run Elasticsearch + Kibana
- [Node.js 18+](https://nodejs.org/) — to run the backend server

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/movie-search-engine.git
cd movie-search-engine

# 2. Start Elasticsearch + Kibana
docker compose up -d

# 3. Wait ~30s then verify Elasticsearch is up
curl http://localhost:9200
# You should see cluster info JSON

# 4. Install Node dependencies
npm install

# 5. Index the 1,000 movies into Elasticsearch
npx tsx src/import.ts
# Output: "All movies indexed successfully"

# 6. Start the Express server
npx tsx src/server.ts
# Output: "Server running on http://localhost:4000"
```

### Open the app

👉 **[http://localhost:4000](http://localhost:4000)**

> ⚠️ Always open via `http://localhost:4000` — not by double-clicking `index.html`.
> The frontend uses relative API calls (`/api/search`) that only work through the server.

### Explore with Kibana

Once running, open **[http://localhost:5601](http://localhost:5601)** → go to **Dev Tools** → paste any query from the [Kibana Dev Tools section](#-kibana-dev-tools-queries-i-practiced) above and run it.

### Troubleshooting

| Problem | Fix |
|---|---|
| `curl localhost:9200` times out | Docker isn't running, or ES is still starting — wait 30s and retry |
| `import.ts` fails | Check ES is healthy first with the curl above |
| Page loads but search fails | Make sure you're on `http://localhost:4000`, not a `file://` path |
| Port 4000 already in use | Kill the old process: `npx kill-port 4000` |

---

*Built while learning Elasticsearch from scratch — every feature maps to a concept I implemented and understood, not just read about.*
