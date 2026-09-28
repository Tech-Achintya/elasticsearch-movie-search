import express from "express";
import path from "path";
import { Client } from "@elastic/elasticsearch";

const app = express();

const client = new Client({
    node: process.env.ELASTICSEARCH_URL || "http://localhost:9200"
});

app.use(express.json());

app.use(express.static(
    path.join(__dirname, "../public")
));

app.get("/api/search", async (req, res) => {

    const q = String(req.query.q || "");
    const genre = req.query.genre
        ? String(req.query.genre)
        : null;

    const yearFrom = req.query.yearFrom
        ? Number(req.query.yearFrom)
        : null;

    const yearTo = req.query.yearTo
        ? Number(req.query.yearTo)
        : null;

    const filters: any[] = [];

    if (genre) {
        filters.push({
            term: {
                genre
            }
        });
    }

    if (yearFrom !== null || yearTo !== null) {
        filters.push({
            range: {
                year: {
                    ...(yearFrom !== null ? { gte: yearFrom } : {}),
                    ...(yearTo !== null ? { lte: yearTo } : {})
                }
            }
        });
    }

    const response = await client.search({
        index: "movies",

        query: {
            bool: {
                must: q
                    ? {
                        multi_match: {
                            query: q,
                            fields: [
                                "title^3",
                                "description"
                            ],
                            fuzziness: "AUTO"
                        }
                    }
                    : {
                        match_all: {}
                    },

                filter: filters
            }
        },

        aggs: {
            genres: {
                terms: {
                    field: "genre",
                    size: 20
                }
            }
        },

        highlight: {
            fields: {
                title: {},
                description: {}
            }
        },

        size: 20
    });

    res.json(response);
});

app.post("/api/movies", async (req, res) => {

    const { title, description, genre, year, rating, poster_url } = req.body;

    // Validate all required fields
    if (!title || !description || !genre || !year || !rating) {
        res.status(400).json({
            error: "All fields are required: title, description, genre, year, rating"
        });
        return;
    }

    const doc = {
        title:       String(title).trim(),
        description: String(description).trim(),
        genre:       String(genre).trim(),
        year:        Number(year),
        rating:      Number(rating),
        poster_url:  poster_url ? String(poster_url).trim() : "",
        suggest: {
            input: [String(title).trim()]
        }
    };

    const response = await client.index({
        index:   "movies",
        document: doc,
        refresh: true   // immediately searchable
    });

    res.status(201).json({
        message: "Movie added successfully",
        id:      response._id,
        movie:   doc
    });
});

app.get("/api/suggest", async (req, res) => {

    const prefix = String(req.query.q || "");

    const response = await client.search({
        index: "movies",

        suggest: {
            "movie-suggestions": {
                prefix,
                completion: {
                    field: "suggest",
                    size: 5
                }
            }
        }
    });

    res.json(response.suggest);
});

app.listen(4000, () => {
    console.log("Server running on http://localhost:4000");
});