# Contact Manager — Simple Roadmap

## 1. Start the Express Server

```js
const app = express();
```

This creates your Express application.

```js
app.listen(3200, () => {
    console.log("Server Running On 3200");
});
```

This starts the server on port `3200`.

---

## 2. Middleware

```js
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
```

### `express.urlencoded()`

It allows Express to receive data from HTML forms.

For example:

```html
<input name="firstName">
```

After submitting:

```js
req.body.firstName
```

will contain the value.

### `express.static("public")`

It makes your CSS and other static files available to the browser.

---

# 3. Connect to MongoDB

```js
const client = new MongoClient(url);

client.connect().then((connection) => {

    const db = connection.db(dbName);

    const collection = db.collection("Contact_List");
```

Think of it like this:

```text
MongoDB
   ↓
Database: Contacts
   ↓
Collection: Contact_List
```

Your contacts are stored inside `Contact_List`.

---

# 4. READ — Show All Contacts

```js
app.get("/", async (req, resp) => {

    const result = await collection.find().toArray();

    resp.render("Contact", {
        contacts: result
    });

});
```

### Flow

```text
Browser visits /
       ↓
collection.find()
       ↓
Get all contacts from MongoDB
       ↓
result
       ↓
Contact.ejs
       ↓
Display contacts
```

### Remember

```js
find()
```

means you want **multiple documents**.

---

# 5. CREATE — Add a Contact

```js
app.post("/contacts", async (req, resp) => {

    await collection.insertOne(req.body);

    resp.redirect("/");

});
```

### Flow

```text
HTML Form
    ↓
POST /contacts
    ↓
req.body
    ↓
insertOne()
    ↓
MongoDB
    ↓
redirect("/")
    ↓
Show all contacts again
```

For example, your form can produce:

```js
req.body
```

like:

```js
{
    firstName: "Rahul",
    contactNumber: "9876543210",
    professional: "IT"
}
```

Then:

```js
insertOne(req.body)
```

stores it in MongoDB.

---

# 6. DELETE — Delete a Contact

```js
app.post("/contacts/delete/:id", async (req, resp) => {

    await collection.deleteOne({
        _id: new ObjectId(req.params.id)
    });

    resp.redirect("/");

});
```

Here:

```text
:id
```

comes from the URL.

For example:

```text
/contacts/delete/65abc123
```

Then:

```js
req.params.id
```

gets:

```text
65abc123
```

### Flow

```text
Delete button
     ↓
POST /contacts/delete/:id
     ↓
req.params.id
     ↓
deleteOne()
     ↓
MongoDB
     ↓
redirect("/")
```

---

# 7. UPDATE — Open the Edit Page

This route:

```js
app.get("/contacts/edit/:id", async (req, resp) => {

    const result = await collection.findOne({
        _id: new ObjectId(req.params.id)
    });

    resp.render("Contact_update", {
        contact: result
    });

});
```

does **not actually update** the contact.

Its job is:

> Find the existing contact and show its data inside the update form.

### Flow

```text
Click Edit
    ↓
/contacts/edit/:id
    ↓
Find contact from MongoDB
    ↓
result
    ↓
Contact_update.ejs
    ↓
Show existing values in form
```

---

# 8. UPDATE — Actually Update the Contact

```js
app.post("/contacts/edit/:id", async (req, resp) => {

    await collection.updateOne(
        {
            _id: new ObjectId(req.params.id)
        },
        {
            $set: {
                firstName: req.body.firstName,
                contactNumber: req.body.contactNumber,
                professional: req.body.professional
            }
        }
    );

    resp.redirect("/");
});
```

### Flow

```text
Click Update Contact
        ↓
POST /contacts/edit/:id
        ↓
ID → req.params.id
        ↓
New form data → req.body
        ↓
updateOne()
        ↓
MongoDB
        ↓
redirect("/")
```

---

# 9. SEARCH — Your New Feature

Your current search route is:

```js
app.get("/search", async (req, resp) => {

    const { name } = req.query;

    const result = await collection.find({
        firstName: name
    }).toArray();

    resp.render("Contact", {
        contacts: result
    });

});
```

The important part is:

```js
const { name } = req.query;
```

Because your search form uses:

```html
<form action="/search" method="GET">
```

If the user searches:

```text
Rahul
```

the browser sends:

```text
/search?name=Rahul
```

So:

```js
req.query.name
```

becomes:

```text
Rahul
```

Then MongoDB searches:

```js
{
    firstName: name
}
```

---

# 🧠 The Most Important Concept

Remember these three:

### `req.body`

Data coming from a **form body**.

```js
req.body.firstName
```

Example:

```text
POST /contacts
```

---

### `req.params`

Data coming from the **URL parameter**.

```js
req.params.id
```

Example:

```text
/contacts/edit/123
```

---

### `req.query`

Data coming from the **query string**.

```js
req.query.name
```

Example:

```text
/search?name=Rahul
```

---

# CRUD Cheat Sheet

| Operation | HTTP | MongoDB       | Your Route             |
| --------- | ---- | ------------- | ---------------------- |
| Create    | POST | `insertOne()` | `/contacts`            |
| Read      | GET  | `find()`      | `/`                    |
| Read One  | GET  | `findOne()`   | `/contacts/edit/:id`   |
| Update    | POST | `updateOne()` | `/contacts/edit/:id`   |
| Delete    | POST | `deleteOne()` | `/contacts/delete/:id` |
| Search    | GET  | `find()`      | `/search`              |

---

# `render()` vs `redirect()`

This is especially important because you had confusion here.

### `render()`

```js
resp.render("Contact_update", {
    contact: result
});
```

Means:

> **Show this EJS page right now.**

You normally use it when you need to send data to an EJS page.

---

### `redirect()`

```js
resp.redirect("/");
```

Means:

> **Tell the browser to make another request to `/`.**

You normally use it after successfully adding, updating, or deleting something.

---

# Your Whole Project in One Picture

```text
                    BROWSER
                       │
                       ▼
                  HTML / EJS
                       │
          ┌────────────┼─────────────┐
          │            │             │
         ADD          EDIT         SEARCH
          │            │             │
         POST          │            GET
          │            │             │
          ▼            ▼             ▼
      req.body     req.params     req.query
          │            │             │
          └────────────┼─────────────┘
                       ▼
                    EXPRESS
                       │
                       ▼
                    MONGODB
                       │
          ┌────────────┼─────────────┐
          │            │             │
      insertOne()   updateOne()    find()
          │            │             │
          └────────────┼─────────────┘
                       ▼
                     result
                       │
                       ▼
                    EJS PAGE
                       │
                       ▼
                    BROWSER
```

## The easiest way to understand any Express project

Whenever you see a route, ask yourself **4 questions**:

```text
1. What URL?
       ↓
2. GET or POST?
       ↓
3. Where is the data coming from?
   body / params / query
       ↓
4. What MongoDB operation happens?
   find / insertOne / updateOne / deleteOne
```

If you can answer these four questions for every route, you will understand the whole project.
