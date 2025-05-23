import express from "express";
let route = express.Router();
import {
  checkAuthentication,
  getUser,
  login,
  logout,
  register,
  verifyOTP,
} from "../controller/user.controller.js";
import { body } from "express-validator";
import auth from "../middleware/auth.js";

let validation = [
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters long"),
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is not valid"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

route.post("/register", validation, register);
route.post("/verify-otp", verifyOTP);
route.post("/login", login);
route.get("/logout", logout);
route.get("/checkAuthentication", auth, checkAuthentication);
route.get("/getUser", auth, getUser);

export default route;
