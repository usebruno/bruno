import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('OpenAPI Path-Based Grouping - Duplicate Names', () => {
  it('should not add suffixes to duplicate operation names in different folders', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Duplicate Names Test API',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'https://api.example.com/v1'
        }
      ],
      paths: {
        // Users folder - should have "Get User Details" operation
        '/users/{id}': {
          get: {
            summary: 'Get User Details',
            operationId: 'getUserDetails',
            responses: {
              200: {
                description: 'User details'
              }
            }
          }
        },
        // Products folder - should also have "Get User Details" operation (different context)
        '/products/{id}/owner': {
          get: {
            summary: 'Get User Details',
            operationId: 'getProductOwnerDetails',
            responses: {
              200: {
                description: 'Product owner details'
              }
            }
          }
        },
        // Orders folder - should also have "Get User Details" operation (different context)
        '/orders/{orderId}/customer': {
          get: {
            summary: 'Get User Details',
            operationId: 'getOrderCustomerDetails',
            responses: {
              200: {
                description: 'Order customer details'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(openApiSpec, { groupBy: 'path' });

    // Find the folders
    const usersFolder = result.items.find((item) => item.name === 'users');
    const productsFolder = result.items.find((item) => item.name === 'products');
    const ordersFolder = result.items.find((item) => item.name === 'orders');

    // Find requests in each folder
    // Users folder: /users/{id} -> should have request directly in users folder
    const usersIdFolder = usersFolder.items.find((item) => item.name === '{id}');
    expect(usersIdFolder).toBeDefined();
    const getUserDetailsRequest = usersIdFolder.items.find((item) => item.type === 'http-request');

    // Products folder: /products/{id}/owner -> should have request in products/{id}/owner
    const productsIdFolder = productsFolder.items.find((item) => item.name === '{id}');
    expect(productsIdFolder).toBeDefined();
    const productsOwnerFolder = productsIdFolder.items.find((item) => item.name === 'owner');
    expect(productsOwnerFolder).toBeDefined();
    const getProductOwnerRequest = productsOwnerFolder.items.find((item) => item.type === 'http-request');

    // Orders folder: /orders/{orderId}/customer -> should have request in orders/{orderId}/customer
    const ordersIdFolder = ordersFolder.items.find((item) => item.name === '{orderId}');
    expect(ordersIdFolder).toBeDefined();
    const ordersCustomerFolder = ordersIdFolder.items.find((item) => item.name === 'customer');
    expect(ordersCustomerFolder).toBeDefined();
    const getOrderCustomerRequest = ordersCustomerFolder.items.find((item) => item.type === 'http-request');

    expect(getUserDetailsRequest).toBeDefined();
    expect(getProductOwnerRequest).toBeDefined();
    expect(getOrderCustomerRequest).toBeDefined();

    // CRITICAL ASSERTIONS: Names should NOT have suffixes
    // Each folder should have its own namespace, so duplicate names across folders should be allowed

    // All requests should have clean names (NO suffixes like "(GET)" or "(1)")
    expect(getUserDetailsRequest.name).toBe('Get User Details');
    expect(getProductOwnerRequest.name).toBe('Get User Details');
    expect(getOrderCustomerRequest.name).toBe('Get User Details');
  });
});
