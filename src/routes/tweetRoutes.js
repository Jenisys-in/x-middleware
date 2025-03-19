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

// ✅ Route for Quote Tweet (Restored v1.01 behavior)
router.post("/quote-tweet/:id", authenticateRequest, async (req, res) => {
    try {
        const { comment } = req.body;
        if (!comment) {
            return res.status(400).json({ error: "Comment is required for quote tweet" });
        }

        // ✅ Calls the v1.01 `quoteTweet` function
        const result = await quoteTweet(req.params.id, comment);

        res.json({ message: "Quote Tweet Posted Successfully!", data: result });
    } catch (error) {
        res.status(500).json({ error: "Failed to post quote tweet", details: error.message });
    }
});





// ✅ Route to Create a Post with Media


router.post("/create-post-with-media", authenticateRequest, async (req, res) => {
    const { text, media_id } = req.body;

    if (!text) {
        return res.status(400).json({ error: "Tweet text is required" });
    }

    if (!media_id) {
        return res.status(400).json({ error: "Media ID is required" });
    }

    try {
        const response = await axios.post(
            `${BASE_URL}/tweets`,
            { text, media: { media_ids: [media_id] } },
            { headers: getOAuthHeader(`${BASE_URL}/tweets`, "POST") }
        );

        res.json({ message: "Tweet with media posted successfully!", tweet_id: response.data.data.id });
    } catch (error) {
        console.error("❌ Post Tweet with Media Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to post tweet with media.", details: error.response?.data || error.message });
    }
});

// Ensure all legacy endpoints enforce authentication
router.post("/legacy-create-post", authenticateRequest, async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: "Tweet text is required" });
    }

    try {
        const response = await axios.post(
            `${BASE_URL}/tweets`,
            { text },
            { headers: getOAuthHeader(`${BASE_URL}/tweets`, "POST") }
        );

        res.json({ message: "Tweet Posted Successfully!", tweet_id: response.data.data.id });
    } catch (error) {
        console.error("❌ Post Tweet Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to post tweet.", details: error.response?.data || error.message });
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


router.post("/create-post", authenticateRequest, async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: "Tweet text is required" });
    }

    try {
        const response = await axios.post(
            `${BASE_URL}/tweets`,
            { text },
            { headers: getOAuthHeader(`${BASE_URL}/tweets`, "POST") }
        );

        res.json({ message: "Tweet Posted Successfully!", tweet_id: response.data.data.id });
    } catch (error) {
        console.error("❌ Post Tweet Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to post tweet.", details: error.response?.data || error.message });
    }
});


module.exports = router;