
import express from "express";
import { MongoClient, ObjectId } from "mongodb";

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const dbName = "To-Do-List";
const url = "mongodb://localhost:27017";

const client = new MongoClient(url);

client.connect().then((connection) => {

    const db = connection.db(dbName);

    // Show Todo List
    app.get("/", async (req, res) => {

        const collection = db.collection("list");

        const result = await collection.find({}).toArray();

        res.render("Display", {
            todos: result
        });

    });

    
    app.post("/add", async (req, res) => {

        const collection = db.collection("list");

        await collection.insertOne({
            content: req.body.content
        });

        res.redirect("/");

    });
        app.post("/delete/:id", async (req, res) => {

        const collection = db.collection("list");

        await collection.deleteOne({
            _id: new ObjectId(req.params.id)
        });

        res.redirect("/");

    });
app.get("/update/:id", async (req, res) => {

    const collection = db.collection("list");

    const result = await collection.findOne({
        _id: new ObjectId(req.params.id)
    });

    res.render("updated", {
        todo: result
    });
    app.post("/update/:id",async(req,resp)=>{
        const {content} =req.body;
        const collection=db.collection("list")
        await collection.updateOne({
            _id:new ObjectId(req.params.id)
        },
        {
            $set:{
                content:req.body.content
            }
        }
    );
    resp.redirect("/")
    })

});

});

app.listen(550, () => {
    console.log("Server running on http://localhost:550");
});
