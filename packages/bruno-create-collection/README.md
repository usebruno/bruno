# create-collection

A CLI tool to scaffold a basic [Bruno](https://www.usebruno.com) API collection with best practices. This tool helps you quickly set up a well-structured API collection template with environments, sample requests, and proper documentation.

## Features

- 📁 Well-organized collection structure
- 🌍 Multiple environment configurations (development, production)
- 🔑 Environment variable management using Bruno's native system
- 📝 Sample API requests with documentation
- ✅ Built-in request tests
- 📚 Comprehensive documentation

## Prerequisites

- Node.js >= 14.0.0
- [Bruno](https://www.usebruno.com) installed

## Installation & Usage

You can use this package directly with npx:

```bash
npx create-collection [name] [options]
```

Or install it globally:

```bash
npm install -g create-collection
create-collection [name] [options]
```

### Arguments

- `name` - The name of your collection directory (default: "my-bruno-collection")

### Options

```bash
-V, --version  Output the version number
-f, --force    Overwrite target directory if it exists
--no-tree      Skip displaying the directory tree
-h, --help     Display help information
```

### Examples

1. Create a new collection:
```bash
npx create-collection my-api
```

2. Create a collection, overwriting if exists:
```bash
npx create-collection my-api --force
```

3. Create without showing directory tree:
```bash
npx create-collection my-api --no-tree
```

4. Show help:
```bash
npx create-collection --help
```

## Collection Structure

The generated collection follows this structure:

```
my-api/
├── environments/         # Environment configurations
│   ├── development.bru   # Development environment variables
│   └── production.bru    # Production environment variables
├── users/                # User-related API requests
│   ├── folder.bru        # Folder metadata
│   ├── get-users.bru     # Sample GET request with tests
│   └── create-user.bru   # Sample POST request with tests
├── bruno.json            # Collection metadata
├── collection.bru        # Collection-wide documentation and settings
└── README.md             # Repository documentation
```

## Environment Management

The template includes environment configurations in `.bru` files:

### Development Environment (`environments/development.bru`):
- Base configuration for local development
- Sample environment variables
- Non-sensitive default values

### Production Environment (`environments/production.bru`):
- Production-ready configuration
- Uses `{{process.env}}` for sensitive values
- Secure credential management


## Contribute 👩‍💻🧑‍💻

I am happy that you are looking to improve bruno. Please check out the [contributing guide](contributing.md)

Even if you are not able to make contributions via code, please don't hesitate to file bugs and feature requests that needs to be implemented to solve your use case.



## License 📄

[MIT](license.md)

## Support

For issues and questions:
- [Bruno Documentation](https://www.usebruno.com/docs)
- [GitHub Issues](https://github.com/usebruno/bruno/issues)
