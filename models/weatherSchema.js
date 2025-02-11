const mongoose = require("mongoose");

const weatherSchema = new mongoose.Schema({
    city: { type: String, unique: true, required: true, lowercase: true }, // Ensure city is stored in lowercase
    temperature: { type: Number, required: true },
    humidity: Number,
    pressure: Number,
    windSpeed: Number,
    condition: String,
    icon: String,
    lastUpdated: { type: Date, default: Date.now }
});


module.exports = mongoose.model("Weather", weatherSchema);
console.log("Weather model created successfully");