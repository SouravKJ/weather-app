const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET; // Change this in production

// Register User
router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findOne({email})
    if(user){
        return res.status(400).json({message: "Email already exists"})
    }else{
    try {
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.json({ message: "User registered successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Registration failed" });
    }
}
});

// Login User
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, email: user.email });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});


module.exports = router;
