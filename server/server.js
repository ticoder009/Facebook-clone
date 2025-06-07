import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./utils/connectiondb.js";
import cors from "cors";
import userRoute from "./router/user.route.js";
import postRoute from "./router/post.route.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Database connection
connectDB();

// Routes
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: false, 
    message: "Something broke!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});