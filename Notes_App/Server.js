import express from "express";
import { MongoClient, ObjectId } from "mongodb";

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const dbName = "Notes";
const url = "mongodb://localhost:27017";

const client = new MongoClient(url);

client.connect().then((connection) => {

    const db = connection.db(dbName);
    const collection = db.collection("Data");

    
    app.get("/", async (req, resp) => {

        const result = await collection.find().toArray();

        resp.render("UI", {
            notes: result
        });
    });

    
    app.post("/add", async (req, resp) => {

        await collection.insertOne({
            note: req.body.note
        });

        resp.redirect("/");
    });

    
    app.post("/delete/:id", async (req, resp) => {

        await collection.deleteOne({
            _id: new ObjectId(req.params.id)
        });

        resp.redirect("/");
    });

    app.get("/edit/:id", async (req, resp) => {

        const result = await collection.findOne({
            _id: new ObjectId(req.params.id)
        });

        resp.render("update", {
            note: result
        });
    });

    
    app.post("/update/:id", async (req, resp) => {

        await collection.updateOne(
            {
                _id: new ObjectId(req.params.id)
            },
            {
                $set: {
                    note: req.body.note
                }
            }
        );

        resp.redirect("/");
    });

});

app.listen(3200, () => {
    console.log("Running on 3200");
});