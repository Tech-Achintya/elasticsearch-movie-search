const { Client } = require("@elastic/elasticsearch");
const fs = require("fs");
const csv = require("csv-parser");

// Connect to Elasticsearch
const client = new Client({
    node: "http://localhost:9200"
});

const movies = [];

// Read CSV
fs.createReadStream("./data/movies_dataset.csv")
    .pipe(csv())
    .on("data", (row) => {
        movies.push(row);
    })
    .on("end", async () => {

        console.log(`Read ${movies.length} movies from CSV`);

        // Prepare Elasticsearch bulk operations
        const operations = [];

        for (const movie of movies) {

            // Tell Elasticsearch what operation to perform
            operations.push({
                index: {
                    _index: "movies"
                }
            });

            // The actual document
            operations.push({
                title: movie.title,
                description: movie.description,
                genre: movie.genre,
                year: Number(movie.year),
                rating: Number(movie.rating)
            });
        }

        try {

            // Send all documents to Elasticsearch
            const response = await client.bulk({
                operations: operations,
                refresh: true
            });

            if (response.errors) {
                console.log("Some documents failed to index.");
            } else {
                console.log("All movies indexed successfully!");
            }

            console.log(`Indexed ${movies.length} movies`);

        } catch (error) {
            console.error("Error indexing movies:");
            console.error(error);
        }
    });