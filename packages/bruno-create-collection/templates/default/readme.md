# API Collection Template

This is a well-structured API collection template that demonstrates best practices for organizing API requests using Bruno.

## Structure

```
collection-name
├── environments/         # Environment-specific variables
│   ├── development.bru
│   └── production.bru
├── requests/             # API request definitions
│   ├── folder.bru        # Folder metadata
│   ├── create-user.bru
│   └── get-users.bru
├── collection.bru        # Collection-wide documentation and settings
├── bruno.json            # Collection metadata
└── README.md             # Documentation
```

## Collection Documentation

The `collection.bru` file contains:
- Comprehensive API documentation
- Collection-wide settings and guidelines
- Testing standards and examples
- Environment usage instructions
- Best practices for the collection

## Getting Started

1. Install Bruno: https://www.usebruno.com/
2. Clone this collection
3. Configure environments:
   - Review the environment files in `environments/`
   - Configure your environment variables in Bruno
   - Select the appropriate environment for your testing

## Environments

- **Development**: Local or staging environment configuration
- **Production**: Production environment configuration

## Available Requests

### Users
- `GET /users`: Retrieve paginated list of users with filtering options
- `POST /users`: Create a new user

## Testing

Each request includes tests to verify:
- Response status codes
- Response body structure
- Required fields
- Business logic

## Best Practices

1. Use Bruno's environment system for managing variables
2. Include comprehensive documentation
3. Add tests for each request
4. Use consistent naming conventions
5. Group related requests
6. Include response examples
7. Document error scenarios

## Contributing

1. Follow the existing structure
2. Update tests
3. Document changes
4. Test in all environments

## Support

For issues and questions, please refer to:
- [Bruno Documentation](https://www.usebruno.com/docs)
- [GitHub Issues](https://github.com/usebruno/bruno/issues)