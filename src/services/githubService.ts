import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * GitHub Service for cross-platform asset storage.
 * Synchronizes uploaded files and avatars to a specified GitHub repository.
 */

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

const getGitHubConfig = async (): Promise<GitHubConfig | null> => {
  // 1. Try Environment Variables
  const envToken = import.meta.env.VITE_GITHUB_TOKEN;
  const envOwner = import.meta.env.VITE_GITHUB_OWNER;
  const envRepo = import.meta.env.VITE_GITHUB_REPO;
  const branch = import.meta.env.VITE_GITHUB_BRANCH || 'main';
  const path = import.meta.env.VITE_GITHUB_PATH || 'assets/uploads';

  if (envToken && envOwner && envRepo) {
    return { token: envToken, owner: envOwner, repo: envRepo, branch, path };
  }

  // 2. Try Firestore (Admin settings)
  try {
    const githubSnap = await getDoc(doc(db, 'settings', 'github'));
    if (githubSnap.exists()) {
      const data = githubSnap.data();
      if (data.token && data.username && data.repo) {
        return {
          token: data.token,
          owner: data.username,
          repo: data.repo,
          branch: data.branch || 'main',
          path: data.path || 'assets/uploads'
        };
      }
    }
  } catch (error) {
    console.error('Error fetching GitHub config from Firestore:', error);
  }

  return null;
};

export async function uploadToGitHub(
  file: File | Blob, 
  fileName: string, 
  customPath?: string
): Promise<string | null> {
  const config = await getGitHubConfig();
  if (!config) {
    console.warn('GitHub Configuration missing (env or Firestore). Skipping GitHub sync.');
    return null;
  }

  try {
    // Check for GitHub REST API file size limit (approx 25MB)
    if (file.size > 25 * 1024 * 1024) {
      console.warn('File size exceeds 25MB. GitHub REST API may reject this upload.');
    }

    // 1. Convert file to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        if (!result) return reject(new Error('Failed to read file'));
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
    const content = await base64Promise;

    const path = customPath || `${config.path}/${Date.now()}_${fileName}`;
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;

    // 2. Push to GitHub
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload asset: ${fileName}`,
        content,
        branch: config.branch,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'GitHub upload failed');
    }

    const data = await response.json();
    
    // Return the Raw URL
    return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${path}`;
  } catch (error) {
    console.error('GitHub Sync Error:', error);
    return null;
  }
}
