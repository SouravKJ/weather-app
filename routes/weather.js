const express = require("express");
const axios = require("axios");
const Weather = require("../models/weatherSchema");

const router = express.Router();
const API_KEY = process.env.API_KEY;

// Fetch Weather Data
router.get("/weather/:city", async (req, res) => {
    const city = req.params.city.trim().toLowerCase(); // Convert to lowercase

    try {
        let weatherData = await Weather.findOne({ city });

        if (weatherData) {
            if (Date.now() - weatherData.lastUpdated < 1800000) {
                return res.json(weatherData); // Return if data is fresh
            } else {
                // Fetch new weather data
                const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
                const response = await axios.get(apiUrl);
                const data = response.data;

                // Update the existing record
                weatherData.temperature = data.main.temp;
                weatherData.humidity = data.main.humidity;
                weatherData.pressure = data.main.pressure;
                weatherData.windSpeed = data.wind.speed;
                weatherData.condition = data.weather[0].main;
                weatherData.icon = data.weather[0].icon;
                weatherData.lastUpdated = Date.now();

                await weatherData.save();
                return res.json(weatherData);
            }
        }

        // If the city does not exist, fetch new data and save it
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        const newWeather = new Weather({
            city: data.name.toLowerCase(), // Store in lowercase
            temperature: data.main.temp,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: data.wind.speed,
            condition: data.weather[0].main,
            icon: data.weather[0].icon,
            lastUpdated: Date.now(),
        });

        await newWeather.save();
        res.status(200).json({status:"success",newWeather});

    } catch (error) {
        console.error("Error fetching weather data:", error);
        res.status(500).json({ status: "failed", message: "Error fetching weather data" });
    }
});




module.exports = router;
