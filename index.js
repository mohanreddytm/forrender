const express = require("express");
const cors = require("cors");
require("dotenv").config();

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, 
});

app.get("/users/", async (request, response) => {
  try {
    const result = await pool.query('SELECT * FROM public."user";'); 
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

    const payload = {username: email};
    
    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN", { expiresIn: "30d" });
    response.json({ jwtToken });
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

    const payload = {username: dbUser.email};

    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN", { expiresIn: "30d" });
    response.json({ jwtToken });
    
  } catch (error) {
    console.error("Login Error:", error);
    response.status(500).send("Login failed");
  }
});

app.get("/cart/:userId", async (request, response) => {
  const { userId } = request.params;
  try {
    const result = await pool.query('SELECT * FROM public."cart" WHERE user_id = $1;', [userId]);
    console.log(result.rows);
    response.json(result.rows);
  } catch (error) {
    console.error("GET Error:", error);
    response.status(500).send("Server error");
  }
});


app.post("/cart", async (req, res) => {
  const { user_id, book_id, title, image, price, quantity } = req.body;
  try {
    await pool.query(
      'INSERT INTO cart (user_id, book_id, title, image, price, quantity) VALUES ($1, $2, $3, $4, $5, $6);',
      [user_id, book_id, title, image, price, quantity]
    );
    res.send("Item added to cart");
  } catch (error) {
    console.error("Cart Insert Error:", error);
    res.status(500).send("Error adding item to cart");
  }
});


// ------------------------ Step 3: Server Initialization ------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;