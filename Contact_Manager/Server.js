import express from "express"
import { MongoClient, ObjectId } from "mongodb";
import { redirect } from "react-router";
const app=express();
const dbName="Contacts"
const url="mongodb://localhost:27017"

app.set("view engine","ejs");
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))

const client=new MongoClient(url);
client.connect().then((connection)=>{
    const db=connection.db(dbName);
    const collection=db.collection("Contact_List")

    
app.get("/",async(req,resp)=>{
    const result=await collection.find().toArray();
    resp.render("Contact",
        {
             contacts:result

        }
    );
});
app.post("/contacts",async(req,resp)=>{
    await collection.insertOne(req.body);
    resp.redirect("/")

});
app.post("/contacts/delete/:id",async(req,resp)=>{
    await collection.deleteOne({
        _id: new ObjectId(req.params.id)
    })
    resp.redirect("/")
});

app.get("/contacts/edit/:id",async(req,resp)=>{
    const result=await collection.findOne({
        _id:new ObjectId(req.params.id)
    })
    resp.render("Contact_update",{
      contact:  result
    });
})

app.post("/contacts/edit/:id",async(req,resp)=>{
    const {firstName,contactNumber, professional}=req.body
    await collection.updateOne({
        _id : new ObjectId(req.params.id)
    },
{
    $set:{
        firstName: req.body.firstName,
        contactNumber: req.body.contactNumber,
        professional: req.body.professional
    }
})
resp.redirect("/")
})

app.get("/search", async (req, resp) => {

    const { name } = req.query;

    const result = await collection.find({
        firstName: name
    }).toArray();

    resp.render("Contact", {
        contacts: result
    });

});



});
app.listen(3200,()=>{
    console.log("Server Running On 3200");
})