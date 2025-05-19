const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('API by Gabimaru is live!<p>/quote - Get a random quote </p><p>/bibleverse?verse=John 3:16 - Get a Bible scripture</p><p>/iplookup?ip=8.8.8.8 - Get ip info through an ip address');
});

app.get('/ytsearch', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ status: 'error', message: 'Query is required', creator: 'Gabimaru' });

  try {
    const { data } = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    const $ = cheerio.load(data);
    const script = $('script').filter((i, el) => $(el).html().includes('var ytInitialData')).first().html();
    const jsonData = JSON.parse(script.match(/var ytInitialData = (.*?);\s*<\/script>/s)?.[1] || '{}');

    const results = [];
    const contents = jsonData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    for (const item of contents) {
      const video = item.videoRenderer;
      if (!video) continue;

      results.push({
        title: video.title.runs[0].text,
        url: 'https://www.youtube.com/watch?v=' + video.videoId,
        channel: video.ownerText?.runs[0]?.text || 'Unknown',
        duration: video.lengthText?.simpleText || 'Live/Unknown',
        thumbnail: video.thumbnail?.thumbnails?.pop()?.url || '',
      });
    }

    if (results.length === 0) throw new Error('No results found');

    res.json({ status: 'success', results, creator: 'Gabimaru' });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch YouTube results',
      creator: 'Gabimaru'
    });
  }
});

app.get('/iplookup', async (req, res) => {
  const ip = req.query.ip;
  if (!ip) {
    return res.status(400).json({ status: 'error', message: 'IP address is required', creator: 'Gabimaru' });
  }

  try {
    const { data } = await axios.get(`https://ip-api.com/json/${ip}`);

    if (data.status === 'fail') {
      return res.status(404).json({ status: 'error', message: 'Invalid IP address', creator: 'Gabimaru' });
    }

    res.json({
      ip: data.query,
      country: data.country,
      region: data.regionName,
      city: data.city,
      isp: data.isp,
      timezone: data.timezone,
      lat: data.lat,
      lon: data.lon,
      status: 'success',
      creator: 'Gabimaru'
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch IP info',
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
  axios.get('https://randomqouteapi-1.onrender.com').catch(() => {});
}, 300000); // every 5 mins

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
