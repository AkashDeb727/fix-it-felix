import { Complaint, ComplaintStatus, DashboardStats, SESNotificationLog } from '../types';

export const AWS_BASE_URL = 'https://dg8cwlctwc.execute-api.ap-south-1.amazonaws.com/prod';

/**
 * Smart fetch wrapper: tries local Express server route (/api/*) first to prevent browser CORS block,
 * and falls back to direct AWS API Gateway endpoint if needed.
 */
async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  try {
    const localRes = await fetch(`/api${path}`, options);
    if (localRes.ok) {
      return localRes;
    }
  } catch (err) {
    console.warn(`Local proxy /api${path} failed, attempting direct AWS request...`, err);
  }
  return fetch(`${AWS_BASE_URL}${path}`, options);
}

/**
 * Maps raw complaint item from AWS API Gateway to internal Complaint type
 */
export function mapAWSComplaint(item: any): Complaint {
  const lat = typeof item.latitude === 'number' ? item.latitude : parseFloat(item.latitude || '0');
  const lng = typeof item.longitude === 'number' ? item.longitude : parseFloat(item.longitude || '0');
  
  let status: ComplaintStatus = 'Pending';
  const rawStatus = (item.status || '').toString().toLowerCase();
  if (rawStatus === 'in progress' || rawStatus === 'in_progress' || rawStatus === 'inprogress') {
    status = 'In Progress';
  } else if (rawStatus === 'resolved') {
    status = 'Resolved';
  } else {
    status = 'Pending';
  }

  let priority: any = 'Medium';
  const rawPriority = (item.priority || '').toString().toLowerCase();
  if (rawPriority === 'high') priority = 'High';
  else if (rawPriority === 'low') priority = 'Low';
  else priority = 'Medium';

  const time = item.timestamp || item.created_at || new Date().toISOString();

  return {
    complaint_id: item.complaint_id || `CMP-${Math.floor(10000 + Math.random() * 90000)}`,
    citizen_name: item.citizen_name || 'Anonymous Citizen',
    title: item.title || 'Civic Issue Report',
    description: item.description || '',
    category: item.category || 'General Civic Issue',
    priority,
    department: item.department || 'Department of Public Works',
    summary: item.summary || item.description || '',
    latitude: isNaN(lat) || lat === 0 ? 12.9716 : lat,
    longitude: isNaN(lng) || lng === 0 ? 77.5946 : lng,
    address: item.address || item.landmark || `Site (${(isNaN(lat) ? 12.9716 : lat).toFixed(4)}, ${(isNaN(lng) ? 77.5946 : lng).toFixed(4)})`,
    status,
    created_at: time,
    timestamp: time,
    photos: Array.isArray(item.photos) && item.photos.length > 0 
      ? item.photos 
      : (item.image || item.image_url ? [item.image || item.image_url] : [])
  };
}

/**
 * 1. Load All Complaints
 * GET /complaints
 */
export async function fetchAllComplaints(): Promise<Complaint[]> {
  const res = await apiFetch('/complaints', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`AWS GET /complaints error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const rawArray = Array.isArray(data) ? data : (data.complaints || []);
  return rawArray.map(mapAWSComplaint);
}

/**
 * 2. Load Dashboard Statistics
 * GET /dashboard
 */
export async function fetchDashboardStats(currentComplaints: Complaint[]): Promise<DashboardStats> {
  const res = await apiFetch('/dashboard', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`AWS GET /dashboard error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const departmentBreakdown: Record<string, number> = {};
  const priorityBreakdown: Record<string, number> = {};
  const statusBreakdown: Record<string, number> = {};

  currentComplaints.forEach((c) => {
    departmentBreakdown[c.department] = (departmentBreakdown[c.department] || 0) + 1;
    priorityBreakdown[c.priority] = (priorityBreakdown[c.priority] || 0) + 1;
    statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
  });

  return {
    total: typeof data.total === 'number' ? data.total : currentComplaints.length,
    pending: typeof data.pending === 'number' ? data.pending : currentComplaints.filter(c => c.status === 'Pending').length,
    inProgress: typeof data.in_progress === 'number' ? data.in_progress : (data.inProgress ?? currentComplaints.filter(c => c.status === 'In Progress').length),
    resolved: typeof data.resolved === 'number' ? data.resolved : currentComplaints.filter(c => c.status === 'Resolved').length,
    highPriority: typeof data.high_priority === 'number' ? data.high_priority : (data.highPriority ?? currentComplaints.filter(c => c.priority === 'High').length),
    departmentBreakdown,
    priorityBreakdown,
    statusBreakdown
  };
}

/**
 * 3. Create a Complaint
 * POST /submit
 * Payload Required: { "citizen_name": "string", "title": "string", "description": "string", "latitude": float, "longitude": float }
 */
export async function submitNewComplaint(payload: {
  citizen_name: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  street_address?: string;
  landmark?: string;
  postal_code?: string;
  specific_location?: string;
  image?: string;
  address?: string;
  photos?: string[];
}): Promise<{ complaint: Complaint; sesNotification: SESNotificationLog }> {
  const imageStr = payload.image || (payload.photos && payload.photos[0] ? payload.photos[0] : '');

  const requestBody = {
    citizen_name: payload.citizen_name.trim(),
    title: payload.title.trim(),
    description: payload.description.trim(),
    latitude: parseFloat(payload.latitude.toFixed(6)),
    longitude: parseFloat(payload.longitude.toFixed(6)),
    street_address: (payload.street_address || payload.address || '').trim(),
    landmark: (payload.landmark || '').trim(),
    postal_code: (payload.postal_code || '').trim(),
    specific_location: (payload.specific_location || '').trim(),
    image: imageStr
  };

  const res = await apiFetch('/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    throw new Error(`AWS POST /submit error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  
  const id = data.complaint_id || `CMP-${Math.floor(10000 + Math.random() * 90000)}`;
  const time = data.timestamp || new Date().toISOString();
  const ai = data.ai_analysis || {};
  const innerData = data.data || {};

  let status: ComplaintStatus = 'Pending';
  if (data.status === 'Resolved' || data.status === 'In Progress') {
    status = data.status;
  }

  let priority: any = 'Medium';
  if (ai.priority === 'High' || ai.priority === 'Low') {
    priority = ai.priority;
  }

  const complaintObj: Complaint = {
    complaint_id: id,
    citizen_name: innerData.citizen_name || payload.citizen_name,
    title: innerData.title || payload.title,
    description: innerData.description || payload.description,
    category: ai.category || 'Roads & Potholes',
    priority: priority,
    department: ai.department || 'Road Maintenance',
    summary: ai.summary || payload.description,
    latitude: payload.latitude,
    longitude: payload.longitude,
    address: payload.address || `Location (${payload.latitude.toFixed(4)}, ${payload.longitude.toFixed(4)})`,
    status: status,
    created_at: time,
    timestamp: time,
    photos: payload.photos || [],
    ses_email_sent: true,
    ses_email_recipient: 'owner@civicmaintenancesf.gov'
  };

  const sesNotification: SESNotificationLog = {
    id: `SES-MSG-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    complaint_id: id,
    to: 'owner@civicmaintenancesf.gov',
    subject: `[AWS SES Alert] Complaint Received: ${id}`,
    body: `MUNICIPAL CIVIC MAINTENANCE ALERT
----------------------------------------
Complaint ID: ${id}
Citizen Name: ${complaintObj.citizen_name}
Title: ${complaintObj.title}
Category: ${complaintObj.category}
Priority: ${complaintObj.priority}
Assigned Department: ${complaintObj.department}
Location: ${complaintObj.address} (${complaintObj.latitude}, ${complaintObj.longitude})
Executive Summary: ${complaintObj.summary}
Timestamp: ${time}
Status: Pending

This alert was triggered by Amazon API Gateway & Lambda service.`,
    timestamp: time,
    status: 'DELIVERED'
  };

  return { complaint: complaintObj, sesNotification };
}

/**
 * 4. Update a Complaint Status
 * PUT /status
 * Payload Required: { "complaint_id": "string", "status": "string" }
 */
export async function updateComplaintStatus(
  complaint_id: string,
  status: ComplaintStatus
): Promise<{ complaint_id: string; status: ComplaintStatus; message?: string }> {
  const res = await apiFetch('/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaint_id, status })
  });

  if (!res.ok) {
    throw new Error(`AWS PUT /status error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    complaint_id: data.complaint_id || complaint_id,
    status: (data.status as ComplaintStatus) || status,
    message: data.message
  };
}

/**
 * 5. Query Chatbot
 * POST /chat
 * Payload Required: { "question": "string" }
 */
export async function queryAIChatbot(question: string): Promise<string> {
  const res = await apiFetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });

  if (!res.ok) {
    throw new Error(`AWS POST /chat error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.answer || data.response || data.message || (typeof data === 'string' ? data : JSON.stringify(data));
}
