const axios = require("axios");
const { getOAuthHeader } = require("../config/auth");
const { BASE_URL, UPLOAD_URL, USER_ID } = require("../config/constants");
require("dotenv").config();

// ✅ Function to Get Tweet Details
const getTweetDetails = async (tweetId) => {
    const url = `https://api.x.com/2/tweets/${tweetId}`;
    const headers = getOAuthHeader(url, "GET");

    let attempts = 0;
    const maxRetries = 5;
    let delay = 5000;

    while (attempts < maxRetries) {
        try {
            const response = await axios.get(url, { headers });
            console.log("✅ Tweet Details Fetched Successfully!");
            return response.data;
        } catch (error) {
            if (error.response?.status === 429) {
                console.log(`⏳ Rate limit reached. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
                attempts++;
            } else {
                console.error("❌ Error Fetching Tweet:", error.response?.data || error.message);
                throw error;
            }
        }
    }

    throw new Error("❌ Too many failed requests. Try again later.");
};




// ✅ Function to Repost a Tweet
const repostTweet = async (tweetId) => {
    const url = `${BASE_URL}/users/${USER_ID}/retweets`;
    const headers = getOAuthHeader(url, "POST");

    try {
        // ✅ Check if tweet is already retweeted
        const tweetDetails = await getTweetDetails(tweetId);
        if (tweetDetails.data.retweeted) {
            console.log("⚠️ Tweet has already been retweeted. Skipping repost.");
            return { message: "Tweet has already been retweeted. Skipping repost." };
        }

        const response = await axios.post(url, { tweet_id: tweetId }, { headers });
        console.log("✅ Tweet Reposted Successfully!");
        return response.data;
    } catch (error) {
        console.error("❌ Error Reposting Tweet:", error.response?.data || error.message);
        throw error;
    }
};


// ✅ Function to Create a New Post
const createPost = async (text, mediaPath = null) => {
    const url = `${BASE_URL}/tweets`;
    const headers = getOAuthHeader(url, "POST");

    let postData = { text };

    if (mediaPath) {
        console.log("📷 Uploading Media...");
        const mediaId = await uploadMedia(mediaPath);
        if (!mediaId) {
            throw new Error("❌ Media upload failed. No media ID received.");
        }

        postData.media = { media_ids: [mediaId] }; // ✅ Ensure correct format
    }

    try {
        const response = await axios.post(url, postData, { headers });
        console.log("✅ Post Created Successfully!");
        return response.data;
    } catch (error) {
        console.error("❌ Error Creating Post:", error.response?.data || error.message);
        throw error;
    }
};


const quoteTweet = async (tweetId, comment) => {
    const url = `https://api.x.com/2/tweets`;
    const headers = getOAuthHeader(url, "POST");

    let attempts = 0;
    const maxRetries = 5;
    let delay = 5000;

    // ✅ Check if the tweet exists before quoting
    const exists = await getTweetDetails(tweetId);
    if (!exists) {
        throw new Error("Tweet does not exist, cannot quote tweet.");
    }

    while (attempts < maxRetries) {
        try {
            const postData = {
                text: comment,
                quote_tweet_id: tweetId 
            };

            const response = await axios.post(url, postData, { headers });
            console.log("✅ Quote Tweet Posted Successfully!");
            return response.data;
        } catch (error) {
            if (error.response?.status === 429) {
                console.log(`⏳ Rate limit reached. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
                attempts++;
            } else {
                console.error("❌ Error Posting Quote Tweet:", error.response?.data || error.message);
                throw error;
            }
        }
    }

    throw new Error("❌ Too many failed requests. Try again later.");
};



// ✅ Function to Check Tweet Type (Avoids Reposts/Quotes)
const checkTweetType = async (tweetId) => {
    const url = `${BASE_URL}/tweets/${tweetId}`;
    const headers = getOAuthHeader(url, "GET");

    let attempts = 0;
    const maxRetries = 5;
    let delay = 5000;

    while (attempts < maxRetries) {
        try {
            const response = await axios.get(url, { headers });
            if (!response.data || !response.data.data) {
                console.log("❌ Tweet Not Found - Skipping Repost");
                return true;
            }

            const postData = response.data.data;
            console.log("✅ Tweet Data Received:", postData);

            if (postData.referenced_tweets) {
                const isRepost = postData.referenced_tweets.some(
                    (tweet) => tweet.type === "retweeted" || tweet.type === "quoted"
                );
                if (isRepost) {
                    console.log("❌ Tweet is a Retweet or Quote Tweet - Skipping Repost");
                    return true;
                }
            }

            return false;
        } catch (error) {
            if (error.response?.status === 429) {
                console.log(`⏳ Rate limit reached. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
                attempts++;
            } else {
                console.error("❌ Error checking tweet type:", error.response?.data || error.message);
                return true; // Fail-safe: Avoid reposting unknown tweet types
            }
        }
    }

    throw new Error("❌ Too many failed requests. Try again later.");
};

// ✅ Function to Upload Media
const fs = require("fs");
const FormData = require("form-data");

const uploadMedia = async (mediaPath) => {
    const url = `https://upload.x.com/1.1/media/upload.json`; // ✅ Ensure this is the correct endpoint
    const headers = getOAuthHeader(url, "POST");

    try {
        const formData = new FormData();
        formData.append("media", fs.createReadStream(mediaPath));

        const response = await axios.post(url, formData, {
            headers: { 
                ...headers, 
                ...formData.getHeaders() // Required for multipart form data
            }
        });

        console.log("✅ Media Uploaded Successfully!");

        // ✅ Ensure we return media_id_string (not media_id)
        const mediaId = response.data.media_id_string;
        if (!mediaId) {
            throw new Error("❌ No media_id returned from upload response.");
        }

        return mediaId; // ✅ Return media_id_string
    } catch (error) {
        console.error("❌ Error Uploading Media:", error.response?.data || error.message);
        throw error;
    }
};


module.exports = { getTweetDetails, quoteTweet, checkTweetType, uploadMedia, repostTweet, createPost };
