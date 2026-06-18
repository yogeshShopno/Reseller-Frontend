// components/leads/types.ts
// Shared types used across all leads components

export type ApiUser = {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
};

export type ApiSource = {
  _id: string;
  name: string;
};

export type ApiStatus = {
  _id: string;
  name: string;
};

export type LeadLabel = {
  _id: string;
  name: string;
  color?: string;
};

export type ApiFollowUp = {
  _id?: string;
  date: string;
  time: string;
  note: string;
  staff: ApiUser;
  createdAt?: string;
};

export type ApiLead = {
  _id: string;
  fullName: string;
  contact: string;
  email: string;
  kwRequirement?: string;
  discomName?: string;
  leadrefrance?: string;
  projecttype?: string;
  address?: string;
  locationLink?: string;
  leadStatus?: ApiStatus;
  assignedTo?: ApiUser;
  isActive?: boolean;
  followUps?: ApiFollowUp[];
  attachments?: {
    _id?: string;
    originalName?: string;
    name?: string;
    path: string;
    filename: string;
    size?: number;
  }[];
  isLost?: boolean;
  isWon?: boolean;
  amount?: number;
  lostReason?: string;
  lostDate?: string;
  wonDate?: string;
  amountDate?: string;
  nextFollowupDate?: string;
  nextFollowupTime?: string;
  lastFollowUp?: string;
  activities?: {
    message: string;
    by?: ApiUser;
    date: string;
  }[];
  quotation?: {
    date: string;
    solarModule: string;
    inverter: string;
    options: string[];
    rows: {
      title: string;
      values: string[];
    }[];
  };
};

export type AddLeadForm = {
  fullName: string;
  contact: string;
  email: string;
  kwRequirement?: string;
  discomName?: string;
  leadrefrance?: string;
  projecttype?: string;
  address?: string;
  locationLink?: string;
  leadStatus: string;
  assignedTo: string;
  isActive?: boolean;
  attachments?: File[];
};

export type LeadCountSummary = {
  statusCounts: Record<string, number>;
  totalLeads: number;
  totalLost: number;
  totalWon: number;
};