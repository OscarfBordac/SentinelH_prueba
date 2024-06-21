import 'dotenv/config'
import { createServer } from 'http';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';


const PORT = process.env.PORT || 3000;  
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Please provide both CLIENT_ID and CLIENT_SECRET in the .env file');
  process.exit(1);
}

const getToken = async () => {
  try {
    const response = await fetch('https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'client_credentials',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to fetch token');
    }

    return data.access_token;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error;
  }
};

const server = createServer(async (req, res) => {
  // Allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Allow certain headers to be sent by the client
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/get-statistics' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const token = await getToken();
        const statisticsResponse = await fetch('https://services.sentinel-hub.com/api/v1/statistics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: body,
        });

        const statisticsData = await statisticsResponse.json();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(statisticsData));
      } catch (error) {
        console.error('Error fetching statistics:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch statistics' }));
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
