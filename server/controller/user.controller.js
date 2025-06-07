import { validationResult } from "express-validator";
import user from "../model/user.schema.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import { sendOTP, sendWelcomeEmail } from "../email/sendemail.js";

// Register
let register = async (req, res) => {
  let { username, name, email, password } = req.body;
  try {
    let error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({
        status: false,
        message: error.array(),
      });
    }

    let existingUser = await user.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: "User already exists",
      });
    }

    let otp = Math.floor(1000 + Math.random() * 9000).toString();
    let otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    let hashedpassword = await bcrypt.hash(password, 12);

    let newUser = new user({
      username,
      name,
      email,
      password: hashedpassword,
      emailVerificationToken: otp,
      emailVerifyTokenExpires: otpExpiry,
      IsVerify: false,
    });

    let createdUser = await newUser.save();

    // ✅ Send OTP email here
    await sendOTP(email, otp);

    res.status(201).json({
      status: true,
      message: `User registered successfully. Please verify with OTP.`,
      userId: createdUser._id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Verify OTP
let verifyOTP = async (req, res) => {
  let { userId, otp } = req.body;
  try {
    let userToVerify = await user.findById(userId);

    if (!userToVerify) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (userToVerify.emailVerificationToken !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    if (userToVerify.emailVerifyTokenExpires < new Date()) {
      return res.status(400).json({
        status: false,
        message: "OTP has expired",
      });
    }

    // ✅ Mark user as verified
    userToVerify.IsVerify = true;
    userToVerify.emailVerificationToken = undefined;
    userToVerify.emailVerifyTokenExpires = undefined;
    await userToVerify.save();

    // ✅ Send welcome email
    await sendWelcomeEmail(userToVerify.email, userToVerify.username);

    generateToken(res, userToVerify._id);

    res.status(200).json({
      status: true,
      message: `Welcome ${userToVerify.username}`,
      user: {
        _id: userToVerify._id,
        username: userToVerify.username,
        email: userToVerify.email,
        name: userToVerify.name,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// login

let login = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "required fields are missing",
      });
    }

    // findUser in database
    let findUser = await user.findOne({ email });
    if (!findUser) {
      return res.status(400).json({
        status: false,
        message: "user not found",
      });
    }

    let checkPassword = await bcrypt.compare(password, findUser.password);
    if (!checkPassword) {
      return res.status(400).json({
        status: false,
        message: "invalid credentials",
      });
    }

    generateToken(res, findUser._id);

    res.status(200).json({
      status: true,
      message: `welcome ${findUser.username}`,
      findUser: {
        ...findUser._doc,
        password: "**********",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "internal server error",
    });
  }
};

// logout

let logout = (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      status: true,
      message: "logout successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "internal server error",
    });
  }
};

// checkAuthentication
let checkAuthentication = async (req, res) => {
  let userId = req.userId;

  if (!userId) {
    return res.status(400).json({
      status: false,
      message: "please continue to login",
    });
  }

  let findUser = await user.findById(userId);

  if (!findUser) {
    return res.status(400).json({
      status: false,
      message: "user not found",
    });
  }

  return res.status(200).json({
    status: true,
    message: "thanks for verification",
  });
};

// get user
let getUser = async (req, res) => {
  try {
    let userId = req.userId;
    if (!userId) {
      return res.status(404).json({
        status: false,
        message: "userId is required",
      });
    }

    let findUser = await user.findById(userId).select("-password");
    if (!findUser) {
      return res.status(404).json({
        status: false,
        message: "user not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "user found successfully",
      finalUser: findUser,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "internal server error",
    });
  }
};

//sugested user
let suggestedUser = async (req, res) => {
  try {
    let userId = req.userId;
    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }

    let findUser = await user
      .find({ _id: { $ne: userId } })
      .select("-password")
      .limit(5)
      .lean();
    if (findUser.length > 0) {
      res.status(200).json({
        status: true,
        message: "find suggested user successfully",
        suggestedUser: findUser,
      });
    } else {
      res.status(400).json({
        status: false,
        message: "user not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "internal server error",
      error,
    });
  }
};

// get user by specific Id
let getUserById = async (req, res) => {
  try {
    let { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "userId is required",
      });
    }

    let fineUser = await user.findById(userId).select("-password");
    if (!fineUser) {
      return res.status(404).json({
        status: false,
        message: "user not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "find user successfully",
      user: fineUser,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "internal server error",
      error,
    });
  }
};

// follow and unfollow
let followAndUnfollow = async (req, res) => {
  try {
    let userMe = req.userId;
    let userYou = req.params.id;

    if (!userMe || !userYou) {
      return res.status(404).json({
        status: false,
        message: "userId is required",
      });
    }

    let [me, you] = await Promise.all([
      user.findById(userMe),
      user.findById(userYou),
    ]);

    if (!me || !you) {
      return res.status(404).json({
        status: false,
        message: "user not found",
      });
    }

    let isFollowing = me.following.includes(userYou);

    await Promise.all([
      user.updateOne(
        { _id: userMe },
        { [isFollowing ? "$pull" : "$push"]: { following: userYou } }
      ),
      user.updateOne(
        { _id: userYou },
        { [isFollowing ? "$pull" : "$push"]: { followers: userMe } }
      ),
    ]);

    return res.status(200).json({
      status: true,
      message: isFollowing
        ? "User unfollowed successfully"
        : "User followed successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "internal server error",
      error: error.message,
    });
  }
};



export { register, verifyOTP, login, logout, checkAuthentication, getUser, suggestedUser, getUserById, followAndUnfollow };
