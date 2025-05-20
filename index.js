const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('API by Gabimaru is live!<p>/quote - Get a random quote </p><p>/bibleverse?verse=John 3:16 - Get a Bible scripture</p><p>/iplookup?ip=8.8.8.8 - Get ip info through an ip address');
});

app.get('/ssweb', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?url parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: puppeteer.executablePath()
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const screenshot = await page.screenshot({ type: 'png' });

    await browser.close();

    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to capture screenshot',
      error: error.message,
      creator: 'Gabimaru'
    });
  }
});

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

app.get('/api/ssweb', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ?url= parameter',
      creator: 'Gabimaru'
    });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 0 });

    const screenshot = await page.screenshot({ type: 'png', fullPage: true });

    await browser.close();

    res.set('Content-Type', 'image/png');
    return res.send(screenshot);
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to capture screenshot',
      error: error.message,
      creator: 'Gabimaru'
    });
  }
});

app.get('/api/ytdl', async (req, res) => {
  const videoUrl = req.query.link;
  if (!videoUrl) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide a YouTube video URL as ?link=...',
      creator: 'Gabimaru'
    });
  }

  try {
    // First step: get video ID from URL
    const videoIdMatch = videoUrl.match(/(?:v=|youtu\.be\/)([^&]+)/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL');
    const videoId = videoIdMatch[1];

    // Scrape y2mate page to get download links
    const y2mateUrl = `https://www.y2mate.com/mates/en68/analyze/ajax`;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://www.y2mate.com/en68'
    };

    // Step 1: Get video info
    const params1 = new URLSearchParams();
    params1.append('url', videoUrl);
    params1.append('q_auto', '0');
    params1.append('ajax', '1');

    const infoResponse = await axios.post(y2mateUrl, params1.toString(), { headers });
    const $ = cheerio.load(infoResponse.data.result);

    // Extract video title & thumbnail
    const title = $('div.caption.text-left > b').first().text() || 'Unknown Title';
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // Extract available formats & download links from the HTML
    // Parse audio and video formats from table rows
    let videoLink = null;
    let audioLink = null;

    // Video formats in the first table
    $('table tbody tr').each((i, el) => {
      const format = $(el).find('td:nth-child(1)').text().trim().toLowerCase();
      const quality = $(el).find('td:nth-child(2)').text().trim();
      const linkTag = $(el).find('td:nth-child(4) > a');
      const link = linkTag.attr('href') || null;

      if (!link) return;

      if (format.includes('mp4') && !videoLink && quality.includes('720p')) {
        videoLink = link;
      }

      if (format.includes('mp3') && !audioLink) {
        audioLink = link;
      }
    });

    // Fallback: if no 720p video found, pick any mp4 link
    if (!videoLink) {
      $('table tbody tr').each((i, el) => {
        const format = $(el).find('td:nth-child(1)').text().trim().toLowerCase();
        const linkTag = $(el).find('td:nth-child(4) > a');
        const link = linkTag.attr('href') || null;
        if (format.includes('mp4') && link) {
          videoLink = link;
          return false; // break loop
        }
      });
    }

    if (!videoLink && !audioLink) throw new Error('Download links not found');

    return res.json({
      status: 'success',
      title,
      thumbnail,
      video: videoLink || 'No video link found',
      audio: audioLink || 'No audio link found',
      creator: 'Gabimaru'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch video information',
      creator: 'Gabimaru'
    });
  }
});

app.get('/chatbot', async (req, res) => {
  const question = req.query.ask;
  if (!question) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing question parameter. Use ?ask=your-question',
      creator: 'Gabimaru'
    });
  }

  try {
    const { data } = await axios.get(`https://you.com/search?q=${encodeURIComponent(question)}&fromSearchBar=true&chatMode=assistant`);
    const $ = cheerio.load(data);
    const scriptTag = $('script#__NEXT_DATA__').html();

    const parsed = JSON.parse(scriptTag);
    const reply = parsed?.props?.pageProps?.chat?.segments?.[1]?.text || 'No response received';

    res.json({
      status: 'success',
      question,
      reply,
      creator: 'Gabimaru'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch response',
      creator: 'Gabimaru'
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
