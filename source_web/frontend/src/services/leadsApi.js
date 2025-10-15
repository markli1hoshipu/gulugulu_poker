// Lead Generation API Service
import { databaseService } from './databaseService';

const API_BASE_URL = import.meta.env.VITE_BACKEND_LEAD_API_URL || 'http://localhost:9000';

class LeadsApiService {
  constructor() {
    this.token = null;
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
  }

  // Get authentication headers - uses OAuth token from localStorage
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Use OAuth token from localStorage instead of dev token
    const realToken = localStorage.getItem('id_token');
    if (realToken) {
      headers['Authorization'] = `Bearer ${realToken}`;
    }

    return headers;
  }

  // Get development token for testing
  async getDevToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/dev-token`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Failed to get dev token: ${response.status}`);
      }

      const data = await response.json();
      if (data.token) {
        this.setToken(data.token);
        return data.token;
      }
      throw new Error('No token received from server');
    } catch (error) {
      console.error('Error getting dev token:', error);
      throw error;
    }
  }

  // Ensure token is available (wrapper for getDevToken)
  async ensureToken() {
    if (!this.token) {
      await this.getDevToken();
    }
  }



  // Lead management endpoints
  async getLeads(page = 1, perPage = 50, filters = {}, userEmail = null) {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...filters
      });

      // Backend uses DATABASE_URL from .env, no need for db_name parameter
      const url = `${API_BASE_URL}/api/leads?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting leads:', error);
      throw error;
    }
  }

  // Create a new lead
  async createLead(leadData) {
    try {
      // Use real OAuth token instead of dev token to save to correct user database
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        },
        body: JSON.stringify(leadData)
      });

      if (!response.ok) {
        // Try to parse error message from response body
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // If parsing fails, use default error message
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  // Update lead status
  async updateLeadStatus(leadId, status) {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      // Use the general update endpoint with only status field
      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(`Failed to update lead status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  }

  // Delete a single lead
  async deleteLead(leadId) {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  }

  // Clear all leads
  async clearAllLeads() {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing all leads:', error);
      throw error;
    }
  }



  // Upload data to table
  async uploadDataToTable(file, tableName = 'leads') {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/leads/data/upload?table_name=${tableName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading data to table:', error);
      throw error;
    }
  }

  // Get lead statistics
  async getLeadStats() {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/stats`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting lead stats:', error);
      throw error;
    }
  }

  // Get leads with personnel data
  async getLeadsWithPersonnel(options = {}) {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const {
        page = 1,
        per_page = 50,
        status = null,
        search = null,
        industry = null,
        location = null,
        include_recent = false,
        userEmail = null
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: per_page.toString()
      });

      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (industry) params.append('industry', industry);
      if (location) params.append('location', location);
      if (include_recent) params.append('include_recent', 'true');

      // Backend uses DATABASE_URL from .env, no need for db_name parameter
      const url = `${API_BASE_URL}/api/leads/with-personnel?${params}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting leads with personnel:', error);
      throw error;
    }
  }

  // Scrape leads using workflow system
  async scrapeLeads(location, industry, keywords = [], maxResults = 50) {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/workflow/execute`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          workflow_name: 'yellowpages_linkedin',
          location: location,
          industry: industry,
          keywords: keywords,
          max_results: maxResults,
          session_name: `Chat Query - ${new Date().toLocaleString()}`,
          user_id: 'frontend_user'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const workflowResult = await response.json();
      
      // If workflow is immediately completed, return the results
      if (workflowResult.status === 'completed') {
        return {
          status: 'success',
          message: 'Leads scraped successfully',
          total_found: workflowResult.leads_created || 0,
          leads: workflowResult.leads || []
        };
      }
      
      // If workflow is async, poll for results
      if (workflowResult.session_id) {
        return await this.pollForWorkflowResults(workflowResult.session_id, maxResults);
      }
      
      throw new Error('Workflow execution failed');
      
    } catch (error) {
      console.error('Error scraping leads:', error);
      return {
        status: 'error',
        message: error.message,
        total_found: 0,
        leads: []
      };
    }
  }

  // Poll for workflow results
  async pollForWorkflowResults(sessionId, maxResults = 50) {
    const maxAttempts = 30; // 30 seconds timeout
    const pollInterval = 1000; // 1 second
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Check session status
        const statusResponse = await fetch(`${API_BASE_URL}/api/leads/session/${sessionId}/status`, {
          method: 'GET',
          headers: this.getHeaders()
        });

        if (!statusResponse.ok) {
          throw new Error(`HTTP error! status: ${statusResponse.status}`);
        }

        const status = await statusResponse.json();
        
        if (status.status === 'completed') {
          // Get results
          const resultsResponse = await fetch(`${API_BASE_URL}/api/leads/session/${sessionId}/results`, {
            method: 'GET',
            headers: this.getHeaders()
          });

          if (!resultsResponse.ok) {
            throw new Error(`HTTP error! status: ${resultsResponse.status}`);
          }

          const results = await resultsResponse.json();
          
          return {
            status: 'success',
            message: 'Leads scraped successfully',
            total_found: results.results?.leads?.length || 0,
            leads: results.results?.leads?.slice(0, maxResults) || []
          };
        }
        
        if (status.status === 'failed') {
          throw new Error(status.error_message || 'Workflow execution failed');
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new Error('Workflow polling timeout - results may still be processing');
  }

  // Parse natural language query and extract lead search parameters
  parseLeadQuery(query) {
    const lowercaseQuery = query.toLowerCase();
    
    // Extract location
    const locationPatterns = [
      /in\s+([a-zA-Z\s,]+?)(?:\s+for|\s+looking|\s*$)/,
      /from\s+([a-zA-Z\s,]+?)(?:\s+for|\s+looking|\s*$)/,
      /at\s+([a-zA-Z\s,]+?)(?:\s+for|\s+looking|\s*$)/
    ];
    
    let location = null;
    for (const pattern of locationPatterns) {
      const match = lowercaseQuery.match(pattern);
      if (match) {
        location = match[1].trim();
        break;
      }
    }

    // Extract industry/company type
    const industryPatterns = [
      /(?:find|look for|search for|get)\s+([a-zA-Z\s]+?)\s+(?:companies|businesses|firms)/,
      /([a-zA-Z\s]+?)\s+(?:companies|businesses|firms)/
    ];
    
    let industry = null;
    for (const pattern of industryPatterns) {
      const match = lowercaseQuery.match(pattern);
      if (match) {
        industry = match[1].trim();
        break;
      }
    }

    // Extract keywords
    const keywords = [];
    if (industry) {
      keywords.push(industry);
    }

    return {
      location,
      industry,
      keywords,
      isLeadQuery: !!(location && industry)
    };
  }

  // Add lead to CRM system
  async addLeadToCRM(leadId, personnelId = null) {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const requestBody = {};
      if (personnelId) {
        requestBody.personnel_id = personnelId;
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/add-to-crm`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error adding lead to CRM:', error);
      throw error;
    }
  }

  // Get cached AI suggestions for a lead (returns null if not cached)
  async getCachedAISuggestions(leadId) {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/ai-suggestions/cached`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting cached AI suggestions:', error);
      throw error;
    }
  }

  // Regenerate AI suggestions for a lead (always generates fresh analysis)
  async regenerateAISuggestions(leadId) {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/ai-suggestions/regenerate`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error regenerating AI suggestions:', error);
      throw error;
    }
  }

  // Export leads to CSV
  async exportLeadsToCSV() {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/data/export/leads?format=csv`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Backend returns JSON with CSV content
      const data = await response.json();
      const csvContent = data.content;
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `leads_export_${timestamp}.csv`;

      // Create blob from CSV content and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Parse CSV to get row count for stats
      const rows = csvContent.split('\n').filter(row => row.trim().length > 0);
      const total_rows = Math.max(0, rows.length - 1); // Exclude header row
      
      return {
        total_leads: total_rows,
        total_rows: total_rows,
        personnel_count: data.personnel_count || 0,
        filename: filename
      };
    } catch (error) {
      console.error('Error exporting leads to CSV:', error);
      throw error;
    }
  }

  // Generate email for a lead using CRM-style AI generation
  async generateEmail(leadId, customPrompt = '') {
    try {
      // Use real OAuth token instead of dev token for authentication
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const requestBody = {
        custom_prompt: customPrompt
      };

      const response = await fetch(`${API_BASE_URL}/api/leads/generate-email/${leadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating email:', error);
      throw error;
    }
  }

  // Get lead email history
  async getLeadEmailHistory(leadId, limit = 20) {
    try {
      // const authFetch = this.getAuthFetch();

      // const response = await authFetch(`${API_BASE_URL}/api/leads/lead/${leadId}/email-history?limit=${limit}`, {
      //   method: 'GET'
      // });

      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/lead/${leadId}/email-history?limit=${limit}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting lead email history:', error);
      throw error;
    }
  }

  // Get lead info for email generation
  async getLeadInfoForEmail(leadId) {
    try {
      // const authFetch = this.getAuthFetch();

      // const response = await authFetch(`${API_BASE_URL}/api/leads/lead/${leadId}/info`, {
      //   method: 'GET'
      // });

      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/lead/${leadId}/info`, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting lead info for email:', error);
      throw error;
    }
  }

  // Send email
  async sendEmail(toEmail, subject, body, leadId = null) {
    try {
      // Use real OAuth token instead of dev token for authentication
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const requestBody = {
        to_email: toEmail,
        subject: subject,
        body: body
      };

      if (leadId) {
        requestBody.lead_id = leadId;
      }

      // Check if user logged in with Google and has OAuth token for Gmail API
      const authProvider = localStorage.getItem('auth_provider');
      if (authProvider === 'google') {
        const googleToken = localStorage.getItem('google_access_token');
        if (googleToken && googleToken !== 'undefined' && googleToken !== 'null') {
          requestBody.provider = 'gmail';
          requestBody.access_token = googleToken;
          console.log('Using Gmail API for sending email');
        }
      } else if (authProvider === 'microsoft') {
        const microsoftToken = localStorage.getItem('microsoft_access_token');
        if (microsoftToken && microsoftToken !== 'undefined' && microsoftToken !== 'null') {
          requestBody.provider = 'outlook';
          requestBody.access_token = microsoftToken;
          console.log('Using Outlook API for sending email');
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        },
        body: JSON.stringify(requestBody)
      });

      // const authFetch = this.getAuthFetch();

      // const response = await authFetch(`${API_BASE_URL}/api/leads/send-email`, {
      //   method: 'POST',
      //   headers: this.getHeaders(),
      //   body: JSON.stringify(requestBody)
      // });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Check for email replies and update lead status if positive
  async checkReplies(leadId, daysBack = 7) {
    try {
      // Use real OAuth token instead of dev token for authentication
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Check if user logged in with Google and has Gmail OAuth token
      const authProvider = localStorage.getItem('auth_provider');
      if (authProvider !== 'google') {
        throw new Error('Gmail access required for checking replies. Please log in with Google.');
      }

      const googleToken = localStorage.getItem('google_access_token');
      if (!googleToken || googleToken === 'undefined' || googleToken === 'null') {
        throw new Error('Gmail access token not found. Please re-authenticate with Google.');
      }

      const requestBody = {
        provider: 'gmail',
        access_token: googleToken,
        lead_id: leadId,
        days_back: daysBack
      };

      console.log('Checking replies for lead:', leadId);

      const response = await fetch(`${API_BASE_URL}/api/leads/check-replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Check replies result:', result);
      return result;

    } catch (error) {
      console.error('Error checking replies:', error);
      throw error;
    }
  }

  // Get email templates
  async getEmailTemplates() {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/email-templates`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting email templates:', error);
      throw error;
    }
  }

  // Get email configuration status
  async getEmailConfig() {
    try {
      if (!this.token) {
        await this.getDevToken();
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/email-config`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting email config:', error);
      throw error;
    }
  }

  // Get email timeline for a lead (for timeline visualization)
  async getLeadEmailTimeline(leadId, options = {}) {
    try {
      // Use real OAuth token instead of dev token for authentication
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const {
        limit = 50,
        days_back = 30,
        direction = 'all'
      } = options;

      const params = new URLSearchParams({
        limit: limit.toString(),
        days_back: days_back.toString(),
        direction: direction
      });

      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/email-timeline?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting lead email timeline:', error);
      throw error;
    }
  }

  // Get email statistics for a lead (for timeline header)
  async getLeadEmailStats(leadId) {
    try {
      // Use real OAuth token instead of dev token for authentication
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/email-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting lead email stats:', error);
      throw error;
    }
  }

  // ===== AI-POWERED LEAD GENERATION METHODS =====

  // Parse natural language prompt into structured intent
  async aiParsePrompt(prompt, validateIntent = true) {
    try {
      const realToken = localStorage.getItem('id_token');

      const params = new URLSearchParams({
        prompt,
        validate_intent: validateIntent
      });

      const response = await fetch(`${API_BASE_URL}/api/leads/ai-parse?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error parsing AI prompt:', error);
      throw error;
    }
  }

  // Generate leads using AI prompt parsing + Apollo search
  async aiGenerateLeads({
    prompt,
    maxResults = 50,
    minScore = 30,
    saveToDatabase = true,
    validateIntent = true
  }) {
    try {
      const realToken = localStorage.getItem('id_token');

      const params = new URLSearchParams({
        prompt,
        max_results: maxResults,
        min_score: minScore,
        save_to_database: saveToDatabase,
        validate_intent: validateIntent
      });

      const response = await fetch(`${API_BASE_URL}/api/leads/ai-generate?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating AI leads:', error);
      throw error;
    }
  }

  // Get example prompts for AI lead generation
  async aiGetExamples() {
    try {
      const realToken = localStorage.getItem('id_token');

      const response = await fetch(`${API_BASE_URL}/api/leads/ai-examples`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting AI examples:', error);
      throw error;
    }
  }

  // Check AI service health
  async aiHealthCheck() {
    try {
      const realToken = localStorage.getItem('id_token');

      const response = await fetch(`${API_BASE_URL}/api/leads/ai-health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking AI health:', error);
      throw error;
    }
  }

  // ===== TWO-STAGE WORKFLOW METHODS =====

  /**
   * STAGE 1: Preview leads without contact enrichment
   * Uses Google Maps for fast company discovery (no Apollo credits)
   * Returns company data only (cheap)
   */
  async previewLeads(params) {
    try {
      const realToken = localStorage.getItem('id_token');

      const {
        industry,
        location,
        maxResults = 50,
        companySize,
        keywords
      } = params;

      // Build natural language prompt for AI parsing
      // Prioritize keywords over industry for specific searches
      let prompt = '';
      if (keywords && keywords.length > 0) {
        // Use keywords as the primary search term
        prompt = keywords.join(' ');
        if (location) {
          prompt += ` in ${location}`;
        }
        if (companySize) {
          prompt += ` with company size ${companySize}`;
        }
      } else if (industry && location) {
        prompt = `${industry} companies in ${location}`;
        if (companySize) {
          prompt += ` with ${companySize} employees`;
        }
      } else if (industry) {
        prompt = `${industry} companies`;
      } else if (location) {
        prompt = `companies in ${location}`;
      } else {
        throw new Error('Either industry, location, or keywords is required');
      }

      const queryParams = new URLSearchParams({
        prompt,
        max_results: maxResults.toString()
      });

      const response = await fetch(
        `${API_BASE_URL}/api/leads/ai-preview?${queryParams}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${realToken}`
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `Preview failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error previewing leads:', error);
      throw error;
    }
  }

  /**
   * STAGE 2: Enrich selected leads with email contacts
   * Takes company IDs and returns leads with emails (no phone)
   */
  async enrichLeads(params) {
    try {
      // Use real OAuth token instead of dev token (same approach as checkReplies)
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const {
        companyIds,
        companies,  // Full company data for Google Maps → Apollo hybrid lookup
        jobTitles,
        department,
        seniorityLevel
      } = params;

      const response = await fetch(
        `${API_BASE_URL}/api/workflow/enrich`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${realToken}`
          },
          credentials: 'include',
          body: JSON.stringify({
            company_ids: companyIds,
            companies: companies || [],  // Send company data for hybrid enrichment
            job_titles: jobTitles || null,
            department: department || null,
            seniority_level: seniorityLevel || null
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Enrichment failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error enriching leads:', error);
      throw error;
    }
  }

  /**
   * Get enrichment history for the current user
   */
  async getEnrichmentHistory(limit = 100) {
    try {
      // Use real OAuth token instead of dev token (same approach as checkReplies)
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/enrichment-history?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${realToken}`
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to fetch enrichment history: ${response.status}`);
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Error fetching enrichment history:', error);
      throw error;
    }
  }

  /**
   * Find leads by company name
   */
  async findLeadsByCompany(companyName) {
    try {
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/leads?company=${encodeURIComponent(companyName)}&page_size=10`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${realToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to find leads: ${response.status}`);
      }

      const data = await response.json();
      return data.leads || [];
    } catch (error) {
      console.error('Error finding leads by company:', error);
      throw error;
    }
  }

  /**
   * Batch check which companies already exist in database
   */
  async batchCheckCompaniesExist(companyNames) {
    try {
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/leads/batch-check-exists`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${realToken}`
          },
          body: JSON.stringify({ company_names: companyNames })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to batch check companies: ${response.status}`);
      }

      const data = await response.json();
      return data; // Returns { "Company A": true, "Company B": false, ... }
    } catch (error) {
      console.error('Error batch checking companies:', error);
      throw error;
    }
  }

  /**
   * Create personnel record
   */
  async createPersonnel(personnelData) {
    try {
      const realToken = localStorage.getItem('id_token');
      if (!realToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/personnel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${realToken}`
          },
          body: JSON.stringify(personnelData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create personnel: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating personnel:', error);
      throw error;
    }
  }
}

// Create singleton instance
const leadsApiService = new LeadsApiService();

export default leadsApiService; 