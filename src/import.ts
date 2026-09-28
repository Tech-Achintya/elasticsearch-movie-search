import { Client } from "@elastic/elasticsearch";
import fs from "fs";
import csv from "csv-parser";

interface Movie {
    title: string;
    description: string;
    genre: string;
    year: string;
    rating: string;
    imdb_url: string;
}

const client = new Client({
    node: "http://localhost:9200"
});

const movies: Movie[] = [];

fs.createReadStream("./data/real_movies_dataset.csv")
    .pipe(csv())
    .on("data", (row: Movie) => {
        movies.push(row);
    })
    .on("end", async () => {

        console.log(`Loaded ${movies.length} movies`);

        const operations = movies.flatMap(movie => [
            {
                index: {
                    _index: "movies"
                }
            },
            {
                title: movie.title,
                description: movie.description,
                genre: movie.genre,
                year: Number(movie.year),
                rating: Number(movie.rating),
                imdb_url: movie.imdb_url,
                suggest: {
                    input: [movie.title]
                }
            }
        ]);

        const response = await client.bulk({
            operations,
            refresh: true
        });

        if (response.errors) {
            console.log("Some documents failed");
        } else {
            console.log("All movies indexed successfully");
        }

        console.log(`Indexed ${movies.length} movies`);
    });