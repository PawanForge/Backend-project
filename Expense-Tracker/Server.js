import express from "express";
import { MongoClient } from "mongodb";

const app = express();

const dbName = "expense";
const url = "mongodb://localhost:27017";

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const client = new MongoClient(url);

client.connect().then((connection) => {

    const db = connection.db(dbName);
    const collection = db.collection("Data");

    // Home page
    app.get("/", async (req, res) => {

        const result = await collection.find().toArray();

        res.render("Display", {
            transactions: result,
            totalIncome: 0,
            totalExpense: 0,
            balance: 0
        });
    });

    // Add transaction
    app.post("/add", async (req, res) => {

        await collection.insertOne(req.body);

        res.redirect("/");
    });

    app.listen(3200, () => {
        console.log("Running on http://localhost:3200");
    });

});
