export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved';

export type ComplaintPriority = 'High' | 'Medium' | 'Low';

export type ComplaintCategory =
  | 'Roads & Potholes'
  | 'Sanitation & Waste'
  | 'Public Lighting'
  | 'Water & Sewage'
  | 'Parks & Recreation'
  | 'Traffic & Transport'
  | 'Building & Public Safety'
  | 'General Civic Issue';

export interface Complaint {
  complaint_id: string;
  citizen_name: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  department: string;
  summary: string;
  latitude: number;
  longitude: number;
  address?: string;
  status: ComplaintStatus;
  created_at: string;
  timestamp?: string;
  photos?: string[];
  admin_notes?: string;
  ses_email_sent?: boolean;
  ses_email_recipient?: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  highPriority: number;
  departmentBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SESNotificationLog {
  id: string;
  complaint_id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  status: 'DELIVERED' | 'FAILED';
}

export interface UserLocationInfo {
  lat: number;
  lng: number;
  locationName: string;
  cityName: string;
  streetAddress?: string;
  postalCode?: string;
  isLocating: boolean;
  locationError: boolean;
}

export interface AWSArchitectureInfo {
  s3Bucket: string;
  dynamoTable: string;
  region: string;
  apiGatewayEndpoint: string;
  sesSenderEmail: string;
  lambdaFunctions: {
    name: string;
    purpose: string;
    runtime: string;
    memory: string;
  }[];
}
