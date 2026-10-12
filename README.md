# 💰 Expense Tracker

A simple **Expense Tracker Web Application** built using Node.js, Express.js, MongoDB, and EJS. This project helps manage expense records and demonstrates backend development concepts such as database connectivity, server-side rendering, and CRUD operations.

## 🚀 Features

- **Expense Management:** Manage expense records in one place.
- **MongoDB Integration:** Store and retrieve expense data from MongoDB.
- **Express.js Server:** Handle incoming requests and application routes.
- **Dynamic Pages:** Render web pages using EJS templates.
- **CRUD Operations:** Implement Create, Read, Update, and Delete functionality as the project develops.
- **Frontend Styling:** Use HTML and CSS to create the user interface.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime for the backend |
| Express.js | Handles routes and HTTP requests |
| MongoDB | Stores expense data |
| EJS | Renders dynamic HTML pages |
| HTML & CSS | Structure and style the interface |
| Nodemon | Restarts the server during development |

## 📂 Project Structure

```text
Backend-project/
└── Expense-Tracker/
    ├── Server.js
    ├── package.json
    ├── package-lock.json
    ├── public/
    │   └── style.css
    └── views/
        └── index.ejs
```

*Note: This is an example structure. Adjust the filenames and folders to match your actual repository.*

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/PawanForge/Backend-project.git
```

### 2. Navigate to the project folder

```bash
cd Backend-project/Expense-Tracker
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start MongoDB

Make sure your local MongoDB server is running.

The application currently uses a local MongoDB connection. If your configuration changes, update the connection string in the server code.

### 5. Run the application

```bash
npm start
```

If the start script is configured with Nodemon, the server will restart automatically when you make changes.

### 6. Open in your browser

Visit:

```text
http://localhost:3200
```

Make sure the port matches the one configured in your server file.

## 🗄️ Database Configuration

The application uses MongoDB to store expense-related data.

- **Database:** `expense`
- **Collection:** `Data`

These names should match the database configuration in your application.

## 📚 Learning Objectives

This project helps practise:

- Creating a server using Node.js and Express.js.
- Connecting a backend application to MongoDB.
- Handling GET and POST requests.
- Understanding middleware such as `express.urlencoded()` and `express.json()`.
- Rendering dynamic pages with EJS.
- Performing database CRUD operations.
- Organizing backend code and static assets.

## 🔮 Future Improvements

- Add user registration and login.
- Add expense categories and dates.
- Calculate total expenses and remaining balance.
- Add search and filtering.
- Improve form validation and error handling.
- Add charts and monthly expense summaries.
- Deploy the application online.

## 👨‍💻 Author

**PawanForge**

GitHub: [@PawanForge](https://github.com/PawanForge)

---

⭐ If you find this project useful, consider giving the repository a star.

