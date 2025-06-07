import mongoose from "mongoose";

let postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      required: true,
    },
    media_url: {
      type: String,
      required: true,
    },
    media_type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",  // Changed to match your user model name
      },
    ],
    comments: [  // Changed from 'comment' to 'comments' for consistency
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

let Post = mongoose.model("Post", postSchema);  // Using PascalCase for model name
export default Post;