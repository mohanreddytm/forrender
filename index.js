const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

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
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
}

initializeDbAndServer();

app.get("/api/message/", async (request, response) => {
  const getMessageQuery = `
    SELECT * FROM user;
  `;
  const messageArray = await db.all(getMessageQuery);
  response.send(messageArray);
});

module.exports = app;