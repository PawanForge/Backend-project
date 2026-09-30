import express from "express";
import { Collection, MongoClient, ObjectId } from "mongodb";

const app = express();

const dbName = "expense";
const url = "mongodb://localhost:27017";

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const client = new MongoClient(url);

client.connect().then((connection) => {

    const db = connection.db(dbName);
    const collection = db.collection("Data");


    // GET - Display transactions
    app.get("/", async (req, res) => {

        const result = await collection.find().toArray();

        let totalIncome = 0;
        let totalExpense = 0;

        result.forEach(transaction => {

            if (transaction.type === "income") {
                totalIncome += Number(transaction.amount);
            }

            if (transaction.type === "expense") {
                totalExpense += Number(transaction.amount);
            }

        });

        const balance = totalIncome - totalExpense;

        res.render("Display", {
            transactions: result,
            totalIncome,
            totalExpense,
            balance
        });
    });


    // ADD transaction
    app.post("/transactions", async (req, res) => {

        const {
            title,
            amount,
            type,
            category,
            date,
            description
        } = req.body;

        await collection.insertOne({
            title,
            amount: Number(amount),
            type,
            category,
            date,
            description
        });

        res.redirect("/");
    });

    app.get("/transactions/edit/:id", async (req, resp) => {
        const result = await collection.findOne({
            _id: new ObjectId(req.params.id)
        })
        resp.render("update", {
            transaction: result,
        })
    })

    // EDIT transaction
    app.post("/transactions/update/:id", async (req, res) => {

        const {
            title,
            amount,
            type,
            category,
            date,
            description
        } = req.body;

        await collection.updateOne(
            {
                _id: new ObjectId(req.params.id)
            },
            {
                $set: {
                    title,
                    amount: Number(amount),
                    type,
                    category,
                    date,
                    description
                }
            }
        );
        res.redirect("/")
    });


    // DELETE transaction
    app.post("/transactions/delete/:id", async (req, res) => {

        await collection.deleteOne({
            _id: new ObjectId(req.params.id)
        });
        res.redirect("/")
    });


    // SERVER
    app.listen(3200, () => {
        console.log("Running on http://localhost:3200");
    });

});