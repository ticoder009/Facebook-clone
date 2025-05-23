import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./utils/connectiondb.js";
import cors from "cors";
import route from "./router/user.route.js";
let app = express();
let port = process.env.PORT || 5000;
dotenv.config();

// middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());

// database connection
connectDB();

//routes
app.use("/api", route);

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
