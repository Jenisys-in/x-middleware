const express = require("express");
const { getTweetDetails, checkTweetType, uploadMedia, retweet, createPost, quoteTweet } = require("../services/xService");
const axios = require("axios");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Files will be stored in 'uploads/' directory
const { authenticateRequest, getOAuthHeader } = require("../config/auth"); 

// ✅ Fix: Ensure BASE_URL is properly imported
const BASE_URL = process.env.BASE_URL;
const BEARER_TOKEN = process.env.BEARER_TOKEN;

// ✅ **Sanitize Text Function**
const sanitizeText = (text) => text.replace(/[\n\t\r]/g, " ").trim();

// ✅ New Ping Endpoint to Keep the App Active
// ✅ Ping Endpoint
router.get("/ping", (req, res) => {
    console.log("✅ Ping request received - Keeping app active!");
    res.status(200).json({ message: "App is awake and running!" });
});


// ✅ Route to Process a Tweet (Repost)
router.post("/process-tweet/:id", async (req, res) => {
    const tweetId = req.params.id;

    try {
        if (await checkTweetType(tweetId)) {
            return res.status(400).json({ message: "Tweet is not eligible for reposting." });
        }

        await repostTweet(tweetId);
        res.json({ message: "Tweet processed successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to process tweet", details: error.message });
    }
});

// ✅ **Quote Tweet Route**

router.post("/quote-tweet/:id", authenticateRequest, async (req, res) => {
    try {
        let { comment } = req.body;
        comment = comment.replace(/[\n\t\r]/g, " ").trim(); // ✅ Sanitize input

        const url = `${BASE_URL}/tweets`;
        const headers = getOAuthHeader(url, "POST"); // ✅ Fix: Use getOAuthHeader()

        const response = await axios.post(
            url,
            { text: `${comment} https://twitter.com/user/status/${req.params.id}` },
            { headers }
        );

        res.json({ message: "Quote Tweet Posted Successfully!", data: response.data });
    } catch (error) {
        console.error("❌ Quote Tweet Error:", error.response?.data || error.message);
        res.status(400).json({ error: "Invalid quote tweet format." });
    }
});



// ✅ Route to Create a Post with Media


router.post("/create-post-with-media", upload.single("media"), async (req, res) => {
    try {
        const { text } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: "No media file uploaded" });
        }

        const mediaPath = req.file.path; // Get uploaded file path
        const post = await createPost(text, mediaPath);
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "Failed to create post with media", details: error.message });
    }
});

// ✅ Image Upload Route
router.post("/upload-media", async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ error: "No image URL provided" });
    }

    try {
        const uploadResponse = await uploadMedia(imageUrl);
        res.json(uploadResponse);
    } catch (error) {
        res.status(500).json({ error: "Image upload failed", details: error.message });
    }
});





// ✅ Route to Repost a Tweet
router.post("/process-tweet/:id", async (req, res) => {
    const tweetId = req.params.id;

    try {
        if (await checkTweetType(tweetId)) {
            return res.status(400).json({ message: "Tweet is not eligible for reposting." });
        }

        await repostTweet(tweetId);

        res.json({ message: "Tweet processed successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to process tweet", details: error.message });
    }
});

// ✅ **Retweet Endpoint**
router.post("/retweet/:id", authenticateRequest, async (req, res) => {
    const tweetId = req.params.id;
    const result = await retweet(tweetId);
    res.json(result);
});


// ✅ Route to Create a New Post
router.post("/create-post", async (req, res) => {
    const { text, imageUrl } = req.body;

    try {
        const response = await createPost(text, imageUrl);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "Failed to create post", details: error.message });
    }
});

module.exports = router;