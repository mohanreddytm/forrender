const express = require("express");
const cors = require("cors");

const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;


const path = require("path");

const dbPath = path.join(__dirname, "normal.db");
const sqlite3 = require("sqlite3");
const {open} = require("sqlite");

let db;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });    
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
}

initializeDbAndServer();

app.get("/users/", async (request, response) => {
  const getMessageQuery = `
    SELECT * FROM user;
  `;
  const messageArray = await db.all(getMessageQuery);
  response.send(messageArray);
});

app.post("/users/", async (request, response) => {
  const {name, email, password} = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT * FROM user WHERE email = '${email}';
  `;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO user (name, email, password)
      VALUES ('${name}', '${email}', '${hashedPassword}');
    `;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const {email, password} = request.body;
  const selectUserQuery = `
    SELECT * FROM user WHERE email = '${email}';
  `;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;