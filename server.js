require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const cron = require("node-cron");

const authRoutes = require("./routes/auth");
const weatherRoutes = require("./routes/weather");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", weatherRoutes);

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected..."))
.catch(err => console.error("MongoDB Connection Error:", err));

// ✅ Define User Schema
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    lastCity: { type: String }
});

// Check if model already exists before defining it again
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// ✅ Define Weather Schema
const WeatherSchema = new mongoose.Schema({
    city: { type: String, required: true },
    temp: { type: Number, required: true },
    humidity: { type: Number, required: true },
    wind: { type: Number, required: true },
    lastUpdated: { type: Date, default: Date.now }
});
const Weather = mongoose.models.Weather || mongoose.model("Weather", WeatherSchema);

// ✅ Save last searched city
app.post("/api/saveCity", async (req, res) => {
    const { email, city } = req.body;
    try {
        await User.findOneAndUpdate(
            { email }, 
            { lastCity: city }, 
            { upsert: true, new: true }
        );
        res.json({ message: "Last searched city updated!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save city" });
    }
});

// ✅ Get last searched city
app.get("/api/getCity/:email", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        res.json({ lastCity: user ? user.lastCity : null });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch city" });
    }
});

// ✅ Auto-update weather data every 30 minutes
cron.schedule("*/30 * * * *", async () => {
    console.log("Updating weather data...");

    const users = await User.find();
    
    await Promise.all(users.map(async (user) => {
        if (!user.lastCity) return;

        try {
            const API_KEY = process.env.API_KEY; // Ensure you have API_KEY in .env
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${user.lastCity}&units=metric&appid=${API_KEY}`);

            const { temp, humidity } = response.data.main;
            const wind = response.data.wind.speed;

            await Weather.findOneAndUpdate(
                { city: user.lastCity },
                { temp, humidity, wind, lastUpdated: new Date() },
                { upsert: true, new: true }
            );

            console.log(`✅ Updated weather for ${user.lastCity}: ${temp}°C`);
        } catch (error) {
            console.error(`❌ Failed to update weather for ${user.lastCity}:`, error.message);
        }
    }));
});

// ✅ Weather API route
app.get("/api/weather/:city", async (req, res) => {
    const { city } = req.params;
    
    try {
        let weather = await Weather.findOne({ city });

        if (!weather || (Date.now() - weather.lastUpdated) > 30 * 60 * 1000) {
            const API_KEY = process.env.API_KEY;
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`);
            
            const { temp, humidity } = response.data.main;
            const wind = response.data.wind.speed;

            weather = await Weather.findOneAndUpdate(
                { city },
                { temp, humidity, wind, lastUpdated: new Date() },
                { upsert: true, new: true }
            );
        }

        res.json(weather);
    } catch (error) {
        res.status(500).json({ message: "Error fetching weather data" });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
