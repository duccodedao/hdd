
import axios from 'axios';
import { GitHubConfig } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function getGitHubConfig(): Promise<GitHubConfig | null> {
  try {
    const docRef = doc(db, 'settings', 'github');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as GitHubConfig;
    }
  } catch (error) {
    console.error('Error fetching GitHub config:', error);
  }
  return null;
}

export const githubService = {
  async uploadFile(config: GitHubConfig, file: File, path: string, message?: string): Promise<{ url: string; sha: string; path: string }> {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:xxx/xxx;base64,
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(file);
    const content = await base64Promise;

    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    
    try {
      const response = await axios.put(
        url,
        {
          message: message || `Upload document: ${file.name}`,
          content: content,
        },
        {
          headers: {
            Authorization: `token ${config.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      return {
        url: response.data.content.download_url,
        sha: response.data.content.sha,
        path: response.data.content.path,
      };
    } catch (error: any) {
      console.error('GitHub Upload Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to upload to GitHub');
    }
  },

  async deleteFile(config: GitHubConfig, path: string, sha: string): Promise<void> {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    
    try {
      await axios.delete(url, {
        headers: {
          Authorization: `token ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: `Delete document: ${path}`,
          sha: sha,
        },
      });
    } catch (error: any) {
      console.error('GitHub Delete Error:', error.response?.data || error.message);
      if (error.response?.status !== 404) {
        throw new Error(error.response?.data?.message || 'Failed to delete from GitHub');
      }
    }
  }
};

// Backward compatibility helper used in Profile.tsx
export const uploadToGitHub = async (file: File, message: string, path: string): Promise<string | null> => {
  const config = await getGitHubConfig();
  if (!config) {
    console.warn('GitHub Config not found in Firestore. Skipping sync.');
    return null;
  }
  try {
    const result = await githubService.uploadFile(config, file, path, message);
    return result.url;
  } catch (error) {
    console.error('Manual GitHub upload failed:', error);
    return null;
  }
};
