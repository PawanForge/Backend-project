import express from "express";
import { MongoClient } from "mongodb";

const app = express();

const dbName = "expense";
const url = "mongodb://localhost:27017";

app.use(express.urlencoded({ extended: true }));

const client = new MongoClient(url);

client.connect().then((connection) => {
    const db = connection.db(dbName);
    const collection = db.collection("Data");

    app.get("/", async (req, resp) => {
        const result = await collection.find().toArray();

        resp.send(result);
    });

    app.listen(3200, () => {
        console.log("Running on port 3200");
    });
});