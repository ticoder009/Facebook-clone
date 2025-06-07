import post from "../model/post.schema.js";
import user from "../model/user.schema.js";
import cloudinary from "../utils/cloudinary.js";
import getFileUri from "../utils/fileURI.js";

let postCreate = async (req, res) => {
  try {
    let userId = req.userId;
    let { caption } = req.body;
    let file = req.file; // Now expecting "media" as field name

    if (!file || !caption) {
      return res.status(400).json({
        status: false,
        message: "Media file and caption are required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized - Please login first",
      });
    }

    let findUser = await user.findById(userId);
    if (!findUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    let fileUri = getFileUri(file);
    let cloudResponse;

    if (file.mimetype.startsWith("video")) {
      cloudResponse = await cloudinary.uploader.upload_large(fileUri, {
        resource_type: "video",
        folder: "post/video",
      });
    } else {
      cloudResponse = await cloudinary.uploader.upload(fileUri, {
        resource_type: "image",
        folder: "post/image",
      });
    }

    let newPost = await post.create({
      media_url: cloudResponse.secure_url,
      caption,
      media_type: file.mimetype.split("/")[0],
      author: userId,
      cloudinary_id: cloudResponse.public_id, // Store Cloudinary ID for future reference
    });

    await user.findByIdAndUpdate(userId, {
      $push: { posts: newPost._id },
    });

    res.status(201).json({
      status: true,
      message: "Post created successfully",
      data: newPost,
    });
  } catch (error) {
    console.error("Post creation error:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
// let like & dislike post
let likeDislike = async (req, res) => {
  try {
    let userId = req.userId;
    let postId = req.params.id;

    if (!userId || !postId) {
      return res.status(400).json({
        status: false,
        message: "user id or post id is required",
      });
    }

    let [author, post_Id] = await Promise.all([
      user.findById(userId),
      post.findById(postId),
    ]);

    if (!author || !post_Id) {
      return res.status(404).json({
        status: false,
        message: "user or post not found",
      });
    }

    let isLike = await post_Id.likes.includes(userId);
    if (isLike) {
      // dislike
      await post.updateOne({ $pull: { likes: userId } });
      await author.save();
      return res.status(200).json({
        status: true,
        message: "post disliked",
      });
    } else {
      // like
      await post.updateOne({ $push: { likes: userId } });
      await author.save();
      return res.status(200).json({
        status: true,
        message: "post liked",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "internal sever error",
      error: error.message,
    });
  }
};

let getAllPosts = async (req, res) => {
  try {
    let userId = req.userId;

    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "User ID is required",
      });
    }

    let findUser = await user.findById(userId).populate("posts");
    if (!findUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Posts fetched successfully",
      posts: findUser.posts,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Bookmark a post
let bookmarkPost = async (req, res) => {
  try {
    let userId = req.userId;
    let postId = req.params.id;

    if (!userId || !postId) {
      return res.status(400).json({
        status: false,
        message: "User ID and Post ID are required",
      });
    }

    let [findUser, findPost] = await Promise.all([
      user.findById(userId),
      post.findById(postId),
    ]);

    if (!findUser || !findPost) {
      return res.status(404).json({
        status: false,
        message: "User or Post not found",
      });
    }

    let isBookmarked = findUser.bookmarks.includes(postId);

    if (isBookmarked) {
      // Remove bookmark
      await user.updateOne({ _id: userId }, { $pull: { bookmarks: postId } });
      return res.status(200).json({
        status: true,
        message: "Post removed from bookmarks",
      });
    } else {
      // Add bookmark
      await user.updateOne({ _id: userId }, { $push: { bookmarks: postId } });
      return res.status(200).json({
        status: true,
        message: "Post added to bookmarks",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Post a comment
let postComment = async (req, res) => {
  try {
    let userId = req.userId;
    let postId = req.params.id;
    let { comment } = req.body;

    if (!userId || !postId || !comment) {
      return res.status(400).json({
        status: false,
        message: "User ID, Post ID, and Comment are required",
      });
    }

    let [findUser, findPost] = await Promise.all([
      user.findById(userId),
      post.findById(postId),
    ]);

    if (!findUser || !findPost) {
      return res.status(404).json({
        status: false,
        message: "User or Post not found",
      });
    }

    let newComment = await comment.create({
      comment,
      post: postId,
      author: userId,
    });

    await post.updateOne(
      { _id: postId },
      { $push: { comments: newComment._id } }
    );

    res.status(201).json({
      status: true,
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete a post
let deletePost = async (req, res) => {
  try {
    let userId = req.userId;
    let postId = req.params.id;

    if (!userId || !postId) {
      return res.status(400).json({
        status: false,
        message: "User ID and Post ID are required",
      });
    }

    let findPost = await post.findById(postId);
    if (!findPost) {
      return res.status(404).json({
        status: false,
        message: "Post not found",
      });
    }

    // Check if the user is the author of the post
    if (findPost.author.toString() !== userId) {
      return res.status(403).json({
        status: false,
        message: "You can only delete your own posts",
      });
    }

    // Delete post from user's posts array
    await user.updateOne({ _id: userId }, { $pull: { posts: postId } });

    // Delete the post itself
    await post.deleteOne({ _id: postId });

    res.status(200).json({
      status: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update a post
let updatePost = async (req, res) => {
  try {
    let userId = req.userId;
    let postId = req.params.id;
    let { caption } = req.body;

    if (!userId || !postId || !caption) {
      return res.status(400).json({
        status: false,
        message: "User ID, Post ID, and Caption are required",
      });
    }

    let findPost = await post.findById(postId);
    if (!findPost) {
      return res.status(404).json({
        status: false,
        message: "Post not found",
      });
    }

    // Check if the user is the author of the post
    if (findPost.author.toString() !== userId) {
      return res.status(403).json({
        status: false,
        message: "You can only update your own posts",
      });
    }

    // Update the post
    let updatedPost = await post.findByIdAndUpdate(
      postId,
      { caption },
      { new: true }
    );

    res.status(200).json({
      status: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export {
  postCreate,
  likeDislike,
  getAllPosts,
  bookmarkPost,
  postComment,
  deletePost,
  updatePost,
};
