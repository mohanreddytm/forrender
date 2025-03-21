const express = require("express");
const cors = require("cors");
require("dotenv").config();

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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

    const result = await pool.query('SELECT * FROM public."user" WHERE email = $1;', [email]);
    const usersId = (result.rows[0].id);


    const payload = {username: email, userId: usersId};
    
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

    const payload = {username: dbUser.email,userId: dbUser.id,};

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
    const result = await pool.query('Select * from public."cart" where user_id = $1 and book_id = $2;', [user_id, book_id]);
    if (result.rowCount > 0) {
      await pool.query(
        'UPDATE public."cart" SET quantity = quantity + 1 WHERE user_id = $1 AND book_id = $2;',
        [user_id, book_id]
      );
    }else{
      await pool.query(
        'INSERT INTO public."cart" (user_id, book_id, title, image, price, quantity) VALUES ($1, $2, $3, $4, $5, $6);',
        [user_id, book_id, title, image, price, quantity]
      );
    }
    
    res.json({ success: true, message: "Item added to cart" });
  } catch (error) {
    console.error("Cart Insert Error:", error);
    res.status(500).send("Error adding item to cart");
  }
});

app.put("/cart/update", async (req, res) => {
  const { user_id, book_id, quantity } = req.body;

  try {
    const result = await pool.query(
      'UPDATE cart SET quantity = $1 WHERE user_id = $2 AND book_id = $3 RETURNING *;',
      [quantity, user_id, book_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Item not found in cart");
    }

    res.json({ message: "Cart updated successfully", updatedItem: result.rows[0] });
  } catch (error) {
    console.error("Cart Update Error:", error);
    res.status(500).send("Error updating cart");
  }
});

app.delete("/cart/delete", async (req, res) => {
  const { user_id, book_id } = req.body;

  try {
    const result = await pool.query(
      'DELETE FROM cart WHERE user_id = $1 AND book_id = $2 RETURNING *;',
      [user_id, book_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Item not found in cart");
    }

    res.json({ message: "Cart item deleted successfully" });
  } catch (error) {
    console.error("Cart Delete Error:", error);
    res.status(500).send("Error deleting item from cart");
  }
});



// ------------------------ Step 3: Server Initialization ------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;