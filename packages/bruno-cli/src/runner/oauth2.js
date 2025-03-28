const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TokenStore = require('./tokenStore');
const { makeAxiosInstance } = require('../utils/axios-instance');

const grant_type = {
  CLIENT_CREDENTIALS: 'client_credentials',
  PASSWORD: 'password',
};

class OAuthClient {
  constructor(config) {
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      accessTokenUrl: config.accessTokenUrl,
      scope: config.scope || '',
      grantType: config.grantType || grant_type.CLIENT_CREDENTIALS,
      
      // Password grant type specific fields
      username: config.username,
      password: config.password,
    };

    this.tokenStore = new TokenStore();
    this.axiosInstance = makeAxiosInstance();

    // Validate configuration based on grant type
    this.validateConfig();
  }

  validateConfig() {
    const requiredFields = ['clientId', 'clientSecret', 'accessTokenUrl'];

    if (this.config.grantType === 'password') {
      requiredFields.push('username', 'password');
    }

    const missingFields = requiredFields.filter((field) => !this.config[field]);
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required configuration fields: ${missingFields.join(', ')}`
      );
    }
  }

  async getValidToken() {
    try {
      const tokens = await this.tokenStore.getTokens();

      if (this.isTokenExpired(tokens)) {
        console.warn('Token expired, fetching new token...');
        return await this.fetchNewToken();
      }

      if (tokens && tokens.access_token) {
        const now = Date.now();
        // Add 60 second buffer to ensure token doesn't expire during use
        if (now < tokens.created_at + (tokens.expires_in - 60) * 1000) {
          return tokens.access_token;
        }

        if (tokens.refresh_token) {
          try {
            return await this.refreshToken(tokens.refresh_token);
          } catch (refreshError) {
            console.warn(
              'Token refresh failed, fetching new token:',
              refreshError.message
            );
          }
        }
      }

      return await this.fetchNewToken();
    } catch (error) {
      throw new Error(`Failed to get valid token: ${error.message}`);
    }
  }

  async fetchNewToken() {
    try {
      const requestBody = this.buildTokenRequestBody();
      console.log(this.config)
      const response = await this.axiosInstance.post(this.config.accessTokenUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      const tokens = {
        ...response.data,
        created_at: Date.now(),
        grant_type: this.config.grantType,
      };

      await this.tokenStore.saveTokens(tokens);
      return tokens.access_token;
    } catch (error) {
      const errorMessage =
        error.response?.data?.error_description ||
        error.response?.data?.error ||
        error.message;
      throw new Error(`Token fetch failed: ${errorMessage}`);
    }
  }

  buildTokenRequestBody() {
    const body = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: this.config.scope,
    };

    switch (this.config.grantType) {
      case 'password':
        return {
          ...body,
          grant_type: 'password',
          username: this.config.username,
          password: this.config.password,
        };
      case 'client_credentials':
        return {
          ...body,
          grant_type: 'client_credentials',
        };
      default:
        throw new Error(`Unsupported grant type: ${this.config.grantType}`);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await this.axiosInstance.post(
        this.config.accessTokenUrl,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const tokens = {
        ...response.data,
        created_at: Date.now(),
        grant_type: this.config.grantType,
      };

      await this.tokenStore.saveTokens(tokens);
      return tokens.access_token;
    } catch (error) {
      // Clear tokens if refresh fails
      await this.tokenStore.clearTokens();
      throw error;
    }
  }

  // Utility method to check if token is expired
  isTokenExpired(tokens) {
    if (!tokens || !tokens.created_at || !tokens.expires_in) {
      return true;
    }
    const now = Date.now();
    return now >= tokens.created_at + (tokens.expires_in - 60) * 1000;
  }
}

module.exports = OAuthClient;
