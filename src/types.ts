
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  username?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: any;
}

export type DocumentLevel = 'tuyen_tren' | 'tuyen_tinh' | 'cdc_so_y_te' | 'tuyen_co_so';

export interface AdminDocument {
  id: string;
  name: string;
  originalName?: string;
  categoryId: string;
  categoryName: string;
  documentNumber?: string; // Số ký hiệu
  issuingUnit?: string; // Đơn vị ban hành
  issuanceDate?: string; // Ngày ban hành
  level?: DocumentLevel;
  parentId?: string; // Văn bản mẹ
  relatedDocIds?: string[]; // Văn bản liên quan
  replacesId?: string; // Văn bản bị thay thế
  replacedById?: string; // Văn bản thay thế mới
  note: string;
  githubUrl: string;
  githubSha: string;
  githubPath: string;
  views: number;
  downloads: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
  hidden?: boolean;
  isDeleted?: boolean;
  deletedAt?: any;
  isVip?: boolean;
  vipCode?: string;
  price?: number;
  salePrice?: number;
}

export interface Invoice {
  id: string;
  userId: string;
  userEmail: string;
  items: {
    id: string;
    name: string;
    type: 'document' | 'utility';
    price: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  paymentMethod: 'bank_transfer' | 'manual';
  paymentDetails?: {
    sepayTransactionId?: string;
    referenceCode: string;
  };
  createdAt: any;
  paidAt?: any;
}

export interface PaymentSettings {
  sepayApiKey?: string;
  sepayWebhookSecret?: string;
  bankInfo?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bin: string;
  };
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin' | 'guest';
}
