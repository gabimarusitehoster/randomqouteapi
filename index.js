const express = require('express');  
const axios = require('axios');  
const cheerio = require('cheerio');  
const cors = require('cors');  
const puppeteer = require('puppeteer');  
  
const app = express();  
const PORT = process.env.PORT || 3000;  
  
app.use(cors());  
app.use(express.static(__dirname));
  
app.get('/api/animechar', async (req, res) => {  
  const name = req.query.name;  
  if (!name) {  
    return res.status(400).json({  
      status: 'error',  
      message: 'Missing ?name= parameter',  
      creator: 'Gabimaru'  
    });  
  }  
  
  try {  
    // Search for the character  
    const searchResponse = await axios.get(`https://api.jikan.moe/v4/characters`, {  
      params: { q: name }  
    });  
  
    const results = searchResponse.data.data;  
    if (!results || results.length === 0) {  
      return res.status(404).json({  
        status: 'error',  
        message: 'Character not found',  
        creator: 'Gabimaru'  
      });  
    }  
  
    const character = results[0];  
  
    // Fetch character details  
    const detailsResponse = await axios.get(`https://api.jikan.moe/v4/characters/${character.mal_id}/full`);  
    const details = detailsResponse.data.data;  
  
    // Extract anime information  
    const anime = details.anime?.[0]?.anime?.title || 'Unknown';  
  
    res.json({  
      name: details.name,  
      anime: anime,  
      description: details.about,  
      image: details.images.jpg.image_url,  
      source: details.url,  
      status: 'success',  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch character information',  
      error: error.message,  
      creator: 'Gabimaru'  
    });  
  }  
});  

app.get('/chatbot', async (req, res) => {  
  const userMessage = req.query.ask;  
  
  if (!userMessage) {  
    return res.status(400).json({  
      status: 'error',  
      creator: 'Ayodele David (Gabimaru)',  
      error: 'Missing "ask" query parameter.'  
    });  
  }  
  
  try {  
    const response = await axios.get(`https://botfather.cloud/Apis/AI/client.php`, {  
      params: { message: userMessage }  
    });  
  
    const { data } = response;  
  
    if (data.success) {  
      res.json({  
        status: 'success',  
        creator: 'Ayodele David (Gabimaru)',  
        question: userMessage,  
        reply: data.response,  
        answer_time: data.answer_time  
      });  
    } else {  
      res.status(500).json({  
        status: 'error',  
        creator: 'Ayodele David (Gabimaru)',  
        error: 'AI API returned failure',  
        data  
      });  
    }  
  
  } catch (err) {  
    console.error(err);  
    res.status(500).json({  
      status: 'error',  
      creator: 'Ayodele David (Gabimaru)',  
      error: 'Failed to connect to AI API.'  
    });  
  }  
});  
  
app.get('/waifu', async (req, res) => {  
  try {  
    const response = await axios.get('https://waifu.pics/api/sfw/waifu');  
    const imageUrl = response.data.url;  
  
    res.json({  
      status: 'success',  
      category: 'waifu',  
      url: imageUrl,  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch waifu image',  
      creator: 'Gabimaru'  
    });  
  }  
});  
  
app.get('/nsfw', async (req, res) => {  
  try {  
    const response = await axios.get('https://waifu.pics/api/nsfw/waifu');  
    const imageUrl = response.data.url;  
  
    res.json({  
      status: 'success',  
      category: 'nsfw',  
      url: imageUrl,  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch nsfw image',  
      creator: 'Gabimaru'  
    });  
  }  
});  

app.get('/bibleverse', async (req, res) => {  
  const query = req.query.verse;  
  if (!query) {  
    return res.status(400).json({  
      status: 'error',  
      message: 'Please provide a verse, e.g., /bibleverse?verse=John:3+16',  
      creator: 'Gabimaru'  
    });  
  }  
  
  try {  
    const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(query)}&version=KJV`;  
    const { data } = await axios.get(url);  
    const $ = cheerio.load(data);  
  
    const verseText = $('.passage-text .text').text().trim().replace(/\s+/g, ' ');  
  
    if (!verseText) {  
      return res.status(404).json({  
        status: 'error',  
        message: 'Verse not found or invalid reference',  
        creator: 'Gabimaru'  
      });  
    }  
  
    res.json({  
      verse: query.replace(/\+/g, ' '),  
      text: verseText,  
      version: 'KJV',  
      status: 'success',  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch Bible verse',  
      creator: 'Gabimaru'  
    });  
  }  
});  
  
app.get('/quote', async (req, res) => {  
  try {  
    const { data } = await axios.get('https://quotes.toscrape.com/random');  
    const $ = cheerio.load(data);  
    const quote = $('.text').text();  
    const author = $('.author').text();  
  
    res.json({  
      quote,  
      author,  
      status: 'success',  
      creator: 'Gabimaru'  
    });  
  } catch (error) {  
    res.status(500).json({  
      status: 'error',  
      message: 'Failed to fetch quote',  
      creator: 'Gabimaru'  
    });  
  }  
});  
  
// Prevent Render sleep  
setInterval(() => {  
  axios.get('https://ayokunle-restapi.onrender.com').catch(() => {});  
}, 300000); // every 5 mins  
  
app.listen(PORT, () => {  
  console.log(`Server running on port ${PORT}`);  
});
