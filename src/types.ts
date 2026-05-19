
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface AdminDocument {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
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
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin' | 'guest';
}
