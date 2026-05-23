
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
  async uploadFile(config: GitHubConfig, file: File, path: string, message?: string, onProgress?: (progress: number) => void): Promise<{ url: string; sha: string; path: string }> {
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

    if (onProgress) onProgress(10); // Reader completed

    // Clean repo name from possible full URL
    let rawRepo = config.repo.trim();
    if (rawRepo.includes('github.com/')) {
      const parts = rawRepo.split('github.com/')[1].split('/');
      if (parts.length >= 2) {
        config.owner = parts[0];
        rawRepo = parts[1];
      }
    }

    const cleanRepo = rawRepo.split('/').pop()?.trim() || rawRepo;
    const effectiveOwner = (rawRepo.includes('/') && !rawRepo.startsWith('http') ? rawRepo.split('/')[0] : config.owner).trim();
    const cleanToken = config.token.trim();
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    if (file.size > 25 * 1024 * 1024) {
      throw new Error(`Tệp quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Giới hạn upload lên GitHub API là 25MB. Vui lòng nén file hoặc dùng repository khác.`);
    }

    // Encode path segments to handle spaces and special characters properly
    const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    const url = `https://api.github.com/repos/${effectiveOwner}/${cleanRepo}/contents/${encodedPath}`;
    
    try {
      const response = await axios.put(
        url,
        {
          message: message || `Upload document: ${file.name}`,
          content: content,
          branch: (config.branch || 'main').trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              // Scaled to fit 10% to 95% range
              onProgress(10 + (percentCompleted * 0.85));
            }
          }
        }
      );

      if (onProgress) onProgress(100);

      return {
        url: response.data.content.download_url,
        sha: response.data.content.sha,
        path: response.data.content.path,
      };
    } catch (error: any) {
      console.error('GitHub Upload Error Detail:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: url
      });

      if (error.response?.status === 404) {
        throw new Error(`GitHub Not Found (404): Kiểm tra lại Repository "${cleanRepo}", Owner "${effectiveOwner}", hoặc Nhánh "${config.branch || 'main'}" có tồn tại không?`);
      }
      
      if (error.response?.status === 413) {
        throw new Error('Lỗi 413: Tệp quá lớn để gửi qua GitHub API. Vui lòng kiểm tra lại kích thước tệp.');
      }

      // Try to extract the most descriptive error message
      const githubMessage = error.response?.data?.message;
      const axiosMessage = error.message;
      
      let finalMessage = 'Failed to upload to GitHub';
      if (githubMessage) {
        finalMessage = `GitHub Error: ${githubMessage}`;
      } else if (axiosMessage) {
        finalMessage = `Network/Server Error: ${axiosMessage}`;
      }

      throw new Error(finalMessage);
    }
  },

  async deleteFile(config: GitHubConfig, path: string, sha: string): Promise<void> {
    let rawRepo = config.repo.trim();
    if (rawRepo.includes('github.com/')) {
      const parts = rawRepo.split('github.com/')[1].split('/');
      if (parts.length >= 2) {
        config.owner = parts[0];
        rawRepo = parts[1];
      }
    }

    const cleanRepo = rawRepo.split('/').pop()?.trim() || rawRepo;
    const effectiveOwner = (rawRepo.includes('/') && !rawRepo.startsWith('http') ? rawRepo.split('/')[0] : config.owner).trim();
    const cleanToken = config.token.trim();
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const url = `https://api.github.com/repos/${effectiveOwner}/${cleanRepo}/contents/${encodedPath}`;
    
    try {
      await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: `Delete document: ${path}`,
          sha: sha,
          branch: (config.branch || 'main').trim(),
        },
      });
    } catch (error: any) {
      console.error('GitHub Delete Error:', error.response?.data || error.message);
      if (error.response?.status !== 404) {
        const githubMessage = error.response?.data?.message;
        throw new Error(githubMessage || error.message || 'Failed to delete from GitHub');
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
