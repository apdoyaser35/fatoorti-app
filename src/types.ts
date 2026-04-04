export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  uid: string;
  username: string;
  role: UserRole;
  branch_id?: string;
  phone_number?: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  number: string;
  image_url?: string;
}

export interface DeliveryCompany {
  id: string;
  name: string;
  image_url?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  branch_id: string;
  employee_id: string;
  delivery_company_id?: string;
  image_urls?: string[];
  attachments?: string[];
  notes?: string;
  phone_number?: string;
  createdAt: string;
  createdAtLocal?: string;
}
