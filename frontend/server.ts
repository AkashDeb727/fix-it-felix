import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Complaint, ComplaintCategory, ComplaintPriority, DashboardStats, SESNotificationLog, AWSArchitectureInfo } from './src/types.js';
import { initialSeedComplaints } from './src/data/seedComplaints.js';

const __dirname = path.resolve();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '10mb' }));

// In-Memory DynamoDB Simulation Storage
let complaintsDatabase: Complaint[] = [...initialSeedComplaints];
let sesLogs: SESNotificationLog[] = initialSeedComplaints.map(c => ({
  id: `SES-MSG-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
  complaint_id: c.complaint_id,
  to: 'owner@civicmaintenancesf.gov',
  subject: `[AWS SES Alert] New ${c.priority} Priority Complaint Submitted: ${c.complaint_id}`,
  body: `Notification for Complaint ID: ${c.complaint_id}\nTitle: ${c.title}\nCategory: ${c.category}\nPriority: ${c.priority}\nAssigned Dept: ${c.department}\nLocation: (${c.latitude}, ${c.longitude})\nSubmitted: ${c.created_at}`,
  timestamp: c.created_at,
  status: 'DELIVERED'
}));

// Initialize Gemini Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is missing in environment variables.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Fallback AI Analysis when Gemini key is not present or API call fails
function generateFallbackAIAnalysis(title: string, description: string): {
  category: ComplaintCategory;
  priority: ComplaintPriority;
  department: string;
  summary: string;
} {
  const text = `${title} ${description}`.toLowerCase();
  let category: ComplaintCategory = 'General Civic Issue';
  let department = 'Department of Public Works';
  let priority: ComplaintPriority = 'Medium';

  if (text.includes('pothole') || text.includes('road') || text.includes('asphalt') || text.includes('street')) {
    category = 'Roads & Potholes';
    department = 'Department of Public Works';
    priority = text.includes('severe') || text.includes('deep') || text.includes('accident') ? 'High' : 'Medium';
  } else if (text.includes('water') || text.includes('leak') || text.includes('burst') || text.includes('sewage') || text.includes('pipe')) {
    category = 'Water & Sewage';
    department = 'Water Resources & Sewage Bureau';
    priority = 'High';
  } else if (text.includes('lamp') || text.includes('light') || text.includes('dark') || text.includes('electricity')) {
    category = 'Public Lighting';
    department = 'Electrical & Lighting Services';
    priority = text.includes('entire block') || text.includes('dark') ? 'High' : 'Medium';
  } else if (text.includes('trash') || text.includes('garbage') || text.includes('dump') || text.includes('waste') || text.includes('overflow')) {
    category = 'Sanitation & Waste';
    department = 'Department of Sanitation';
    priority = 'Medium';
  } else if (text.includes('park') || text.includes('tree') || text.includes('swing') || text.includes('bench') || text.includes('playground')) {
    category = 'Parks & Recreation';
    department = 'Parks & Recreation Dept';
    priority = text.includes('broken') || text.includes('hazard') ? 'Medium' : 'Low';
  } else if (text.includes('traffic') || text.includes('signal') || text.includes('bus') || text.includes('lane') || text.includes('sign')) {
    category = 'Traffic & Transport';
    department = 'Municipal Transportation Bureau';
    priority = text.includes('flashing') || text.includes('jam') ? 'High' : 'Medium';
  } else if (text.includes('building') || text.includes('scaffolding') || text.includes('hazard') || text.includes('safety')) {
    category = 'Building & Public Safety';
    department = 'Department of Building Inspection';
    priority = 'High';
  }

  const shortSummary = description.length > 120 ? `${description.slice(0, 117)}...` : description;

  return {
    category,
    priority,
    department,
    summary: `AI Automated Analysis: ${shortSummary}`
  };
}

// Reverse Geocoding Helper for Friendly Location Names
function getFriendlyAddress(lat: number, lng: number): string {
  if (Math.abs(lat - 37.7858) < 0.05 && Math.abs(lng - (-122.4065)) < 0.05) {
    return `Downtown Metro Sector (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
  return `Civic District Coordinate (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

// -----------------------------------------------------------------------------
// AWS API Gateway Base URL Proxy
// -----------------------------------------------------------------------------
const AWS_PROD_URL = 'https://dg8cwlctwc.execute-api.ap-south-1.amazonaws.com/prod';

// POST /api/submit - Proxy to AWS /submit
app.post('/api/submit', async (req, res) => {
  try {
    const response = await fetch(`${AWS_PROD_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error submitting complaint via AWS Gateway:', error);
    res.status(500).json({ error: 'Failed to process citizen complaint submission via AWS Gateway.' });
  }
});

// GET /api/complaints - Proxy to AWS /complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const response = await fetch(`${AWS_PROD_URL}/complaints`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error fetching complaints from AWS Gateway:', error);
    res.status(500).json({ error: 'Failed to fetch complaints from AWS Gateway.' });
  }
});

// GET /api/dashboard - Proxy to AWS /dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const response = await fetch(`${AWS_PROD_URL}/dashboard`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error fetching dashboard stats from AWS Gateway:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats from AWS Gateway.' });
  }
});

// PUT /api/status - Proxy to AWS /status
app.put('/api/status', async (req, res) => {
  try {
    const { complaint_id, status } = req.body;
    const response = await fetch(`${AWS_PROD_URL}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaint_id, status })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error updating status via AWS Gateway:', error);
    res.status(500).json({ error: 'Failed to update status via AWS Gateway.' });
  }
});

// POST /api/chat - Ask Fix-It Felix AI Chatbot Proxy
app.post('/api/chat', async (req, res) => {
  try {
    const question = req.body.question || req.body.message || '';
    const qLower = question.toLowerCase();

    // Fetch current database complaints for accurate counting and listing
    let complaintsList: any[] = [];
    try {
      const compRes = await fetch(`${AWS_PROD_URL}/complaints`);
      if (compRes.ok) {
        complaintsList = await compRes.json();
      }
    } catch (e) {
      console.warn('Failed to fetch complaints for chatbot:', e);
    }

    // Try AWS AI Chatbot endpoint
    let awsAnswer = '';
    try {
      const response = await fetch(`${AWS_PROD_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      if (response.ok) {
        const data = await response.json();
        awsAnswer = data.answer || '';
      }
    } catch (e) {
      console.warn('AWS chat endpoint fallback:', e);
    }

    // 1. Query for Pending Issues
    if (qLower.includes('pending')) {
      const pendingItems = complaintsList.filter(
        (c: any) => (c.status || '').toString().toLowerCase() === 'pending'
      );
      const count = pendingItems.length;

      let answer = `There are currently **${count}** pending issue(s) in the system:\n\n`;
      if (pendingItems.length > 0) {
        pendingItems.forEach((item: any, idx: number) => {
          const loc = item.address || item.street_address || `${item.latitude}, ${item.longitude}`;
          answer += `${idx + 1}. **${item.title || 'Civic Incident'}**\n`;
          answer += `   - **Citizen:** ${item.citizen_name || 'Anonymous'}\n`;
          answer += `   - **Department:** ${item.department || 'Public Works'}\n`;
          answer += `   - **Priority:** ${item.priority || 'Medium'}\n`;
          answer += `   - **Address:** ${loc}\n`;
          if (item.description || item.summary) {
            answer += `   - **Details:** ${item.description || item.summary}\n`;
          }
          answer += `\n`;
        });
      } else {
        answer += `All reported complaints have been addressed or resolved!`;
      }
      return res.json({ question, answer: answer.trim() });
    }

    // 2. Query for Resolved Issues
    if (qLower.includes('resolved')) {
      const resolvedItems = complaintsList.filter(
        (c: any) => (c.status || '').toString().toLowerCase() === 'resolved'
      );
      const count = resolvedItems.length;

      let answer = `There are currently **${count}** resolved issue(s):\n\n`;
      if (resolvedItems.length > 0) {
        resolvedItems.forEach((item: any, idx: number) => {
          const loc = item.address || item.street_address || `${item.latitude}, ${item.longitude}`;
          answer += `${idx + 1}. **${item.title || 'Resolved Issue'}**\n`;
          answer += `   - **Department:** ${item.department || 'Public Works'}\n`;
          answer += `   - **Address:** ${loc}\n\n`;
        });
      } else {
        answer += `No issues are currently marked as resolved.`;
      }
      return res.json({ question, answer: answer.trim() });
    }

    // 3. Query for High Priority / Urgent Issues
    if (qLower.includes('high priority') || qLower.includes('high-priority') || qLower.includes('urgent')) {
      const highItems = complaintsList.filter(
        (c: any) => (c.priority || '').toString().toLowerCase() === 'high'
      );
      const count = highItems.length;

      let answer = `There are currently **${count}** high-priority issue(s):\n\n`;
      if (highItems.length > 0) {
        highItems.forEach((item: any, idx: number) => {
          const loc = item.address || item.street_address || `${item.latitude}, ${item.longitude}`;
          answer += `${idx + 1}. **${item.title || 'High Priority Issue'}** (Status: ${item.status || 'Pending'})\n`;
          answer += `   - **Citizen:** ${item.citizen_name || 'Anonymous'}\n`;
          answer += `   - **Department:** ${item.department || 'Public Works'}\n`;
          answer += `   - **Address:** ${loc}\n\n`;
        });
      } else {
        answer += `No high-priority issues recorded at the moment.`;
      }
      return res.json({ question, answer: answer.trim() });
    }

    // Default: Return AWS Chatbot answer or built-in summary
    if (awsAnswer) {
      return res.json({ question, answer: awsAnswer });
    }

    const totalCount = complaintsList.length;
    res.json({
      question,
      answer: `Fix-It Felix database currently tracks **${totalCount}** total civic issue(s). Ask me about pending issues, resolved complaints, or high priority items for detailed listings!`
    });
  } catch (err) {
    console.error('Chatbot endpoint failure:', err);
    res.status(500).json({ error: 'Failed to process AI chatbot query via AWS Gateway.' });
  }
});

// GET /api/ses/logs - Retrieve simulated Amazon SES email notification logs
app.get('/api/ses/logs', (req, res) => {
  res.json({ logs: sesLogs });
});

// POST /api/seed/reset - Reset database to initial seed
app.post('/api/seed/reset', (req, res) => {
  complaintsDatabase = [...initialSeedComplaints];
  res.json({ success: true, count: complaintsDatabase.length });
});

// GET /api/aws/architecture - Retrieve AWS Infrastructure metadata
app.get('/api/aws/architecture', (req, res) => {
  const info: AWSArchitectureInfo = {
    s3Bucket: 'ai-civic-frontend-hosting-s3-bucket',
    dynamoTable: 'Complaints (PartitionKey: complaint_id)',
    region: 'us-east-1',
    apiGatewayEndpoint: 'https://7x91k0z8a.execute-api.us-east-1.amazonaws.com/prod',
    sesSenderEmail: 'owner@civicmaintenancesf.gov',
    lambdaFunctions: [
      { name: 'submitComplaint', purpose: 'Receives citizen payload, triggers Gemini AI analysis, writes to DynamoDB & triggers SES notification.', runtime: 'python3.11', memory: '512MB' },
      { name: 'getComplaints', purpose: 'Scans/queries DynamoDB Complaints table with filter parameters.', runtime: 'python3.11', memory: '256MB' },
      { name: 'dashboardStats', purpose: 'Calculates real-time municipal status metrics & department breakdowns.', runtime: 'python3.11', memory: '256MB' },
      { name: 'updateStatus', purpose: 'Updates item status and admin logs in DynamoDB.', runtime: 'python3.11', memory: '256MB' },
      { name: 'chatbotQuery', purpose: 'Queries complaints database context and prompts Gemini AI for admin chat analytics.', runtime: 'python3.11', memory: '512MB' }
    ]
  };
  res.json({ architecture: info });
});

// -----------------------------------------------------------------------------
// Vite Server Integration
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
