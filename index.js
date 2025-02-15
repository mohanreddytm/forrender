const express = require("express");
const cors = require("cors");
require("dotenv").config();

const bcrypt = require("bcrypt");
const { Pool } = require("pg"); // Changed from SQLite to PostgreSQL

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// PostgreSQL connection setup

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Render
});

// ------------------------ Step 1: Database Setup Changes ------------------------
// Removed SQLite-specific initialization
// PostgreSQL connection is handled automatically by the pool

// ------------------------ Step 2: Modified Routes ------------------------
// Get all users
app.get("/users/", async (request, response) => {
  try {
    const result = await pool.query('SELECT * FROM public."user";'); // Quotes for reserved keyword
    console.log(result.rows);
    response.json(result.rows);
  } catch (error) {
    console.error("GET Error:", error);
    response.status(500).send("Server error");
  }
});

// User registration
app.post("/users/", async (request, response) => {
  const { name, email, password } = request.body;
  
  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT * FROM "user" WHERE email = $1;',
      [email]
    );

    if (userCheck.rows.length > 0) {
      return response.status(400).send("User already exists");
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO "user" (name, email, password) VALUES ($1, $2, $3);',
      [name, email, hashedPassword]
    );
    
    response.send("User created successfully");
  } catch (error) {
    console.error("POST Error:", error);
    response.status(500).send("Registration failed");
  }
});

// User login
app.post("/login/", async (request, response) => {
  const { email, password } = request.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM "user" WHERE email = $1;',
      [email]
    );
    
    if (result.rows.length === 0) {
      return response.status(400).send("Invalid user");
    }

    const dbUser = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);
    
    if (!isPasswordValid) {
      return response.status(400).send("Invalid password");
    }
    
    response.send("Login success");
  } catch (error) {
    console.error("Login Error:", error);
    response.status(500).send("Login failed");
  }
});

// ------------------------ Step 3: Server Initialization ------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;