const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('Quote Scraper API by Gabimaru is live!');
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
  axios.get('https://randomqouteapi-1.onrender.com').catch(() => {});
}, 300000); // every 5 mins

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
