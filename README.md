[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/hannesj-mcp-graphql-schema-badge.png)](https://mseep.ai/app/hannesj-mcp-graphql-schema)

# GraphQL Schema Model Context Protocol Server

[![smithery badge](https://smithery.ai/badge/@hannesj/mcp-graphql-schema)](https://smithery.ai/server/@hannesj/mcp-graphql-schema)
A Model Context Protocol (MCP) server that exposes GraphQL schema information to Large Language Models (LLMs) like Claude. This server allows an LLM to explore and understand GraphQL schemas through a set of specialized tools.

## Features

- Load any GraphQL schema file specified via command line argument
- Explore query, mutation, and subscription fields
- Look up detailed type definitions
- Search for types and fields using pattern matching
- Get simplified field information including types and arguments
- Filter out internal GraphQL types for cleaner results

## Usage

### Command Line

Run the MCP server with a specific schema file:

```bash
# Use the default schema.graphqls in current directory
npx -y mcp-graphql-schema

# Use a specific schema file (relative path)
npx -y mcp-graphql-schema ../schema.shopify.2025-01.graphqls

# Use a specific schema file (absolute path)
npx -y mcp-graphql-schema /absolute/path/to/schema.graphqls

# Show help
npx -y mcp-graphql-schema --help
```

### Installing via Smithery

To install GraphQL Schema for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@hannesj/mcp-graphql-schema):

```bash
npx -y @smithery/cli install @hannesj/mcp-graphql-schema --client claude
```

### Claude Desktop Integration

To use this MCP server with Claude Desktop, edit your `claude_desktop_config.json` configuration file:

```json
{
  "mcpServers": {
    "GraphQL Schema": {
      "command": "npx",
      "args": ["-y", "mcp-graphql-schema", "/ABSOLUTE/PATH/TO/schema.graphqls"]
    }
  }
}
```

Location of the configuration file:

- macOS/Linux: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `$env:AppData\Claude\claude_desktop_config.json`

### Claude Code Integration

To use this MCP server with Claude Code CLI, follow these steps:

1. **Add the GraphQL Schema MCP server to Claude Code**

   ```bash
   # Basic syntax
   claude mcp add graphql-schema npx -y mcp-graphql-schema

   # Example with specific schema
   claude mcp add shopify-graphql-schema npx -y mcp-graphql-schema  ~/Projects/work/schema.shopify.2025-01.graphqls
   ```

2. **Verify the MCP server is registered**

   ```bash
   # List all configured servers
   claude mcp list

   # Get details for your GraphQL schema server
   claude mcp get graphql-schema
   ```

3. **Remove the server if needed**

   ```bash
   claude mcp remove graphql-schema
   ```

4. **Use the tool in Claude Code**

   Once configured, you can invoke the tool in your Claude Code session by asking questions about the GraphQL schema.

**Tips:**

- Use the `-s` or `--scope` flag with `project` (default) or `global` to specify where the configuration is stored
- Add multiple MCP servers for different schemas with different names (e.g., main API schema, Shopify schema)

## MCP Tools

The server provides the following tools for LLMs to interact with GraphQL schemas:

- `list-query-fields`: Lists all available root-level fields for GraphQL queries
- `get-query-field`: Gets detailed definition for a specific query field in SDL format
- `list-mutation-fields`: Lists all available root-level fields for GraphQL mutations
- `get-mutation-field`: Gets detailed definition for a specific mutation field in SDL format
- `list-subscription-fields`: Lists all available root-level fields for GraphQL subscriptions (if present in schema)
- `get-subscription-field`: Gets detailed definition for a specific subscription field (if present in schema)
- `list-types`: Lists all types defined in the GraphQL schema (excluding internal types)
- `get-type`: Gets detailed definition for a specific GraphQL type in SDL format
- `get-type-fields`: Gets a simplified list of fields with their types for a specific GraphQL object type
- `search-schema`: Searches for types or fields in the schema by name pattern (case-insensitive regex)

## Examples

Example queries to try:

```
What query fields are available in this GraphQL schema?
Show me the details of the "user" query field.
What mutation operations can I perform in this schema?
List all types defined in this schema.
Show me the definition of the "Product" type.
List all fields of the "Order" type.
Search for types and fields related to "customer".
```
