const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:12001/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: 'consumer' | 'provider';
  }) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    const response = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async me() {
    return this.request('/me');
  }

  // Project endpoints
  async getProjects(params?: {
    search?: string;
    category?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const query = searchParams.toString();
    return this.request(`/projects${query ? `?${query}` : ''}`);
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: {
    title: string;
    description: string;
    category: string;
    skills: string[];
    budget: number;
    deadline?: string;
    images?: string[];
  }) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: Partial<{
    title: string;
    description: string;
    category: string;
    skills: string[];
    budget: number;
    status: string;
    deadline: string;
    images: string[];
  }>) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Bid endpoints
  async getProjectBids(projectId: string) {
    return this.request(`/projects/${projectId}/bids`);
  }

  async createBid(projectId: string, data: {
    amount: number;
    proposal: string;
    delivery_time: number;
  }) {
    return this.request(`/projects/${projectId}/bids`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBid(bidId: string, data: {
    amount?: number;
    proposal?: string;
    delivery_time?: number;
  }) {
    return this.request(`/bids/${bidId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async acceptBid(bidId: string) {
    return this.request(`/bids/${bidId}/accept`, {
      method: 'POST',
    });
  }

  async deleteBid(bidId: string) {
    return this.request(`/bids/${bidId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;