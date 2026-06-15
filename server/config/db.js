const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("About to connect to MongoDB...");
    console.log("URI loaded:", !!process.env.MONGODB_URI);

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected:", conn.connection.host);
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  }
};

module.exports = connectDB;