#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { print } from "graphql/language/index.mjs";
import { buildSchema } from "graphql/utilities/index.mjs";
import { Console } from "node:console";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import chokidar from "chokidar";

globalThis.console = new Console(process.stderr);

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
GraphQL Schema Model Context Protocol Server

Usage: 
  node index.mjs [path/to/schema.graphqls]

Arguments:
  path/to/schema.graphqls  Path to the GraphQL schema file (optional)
                           If not provided, defaults to schema.graphqls

Examples:
  node index.mjs # Uses default schema.graphqls
  node index.mjs ../schema.shopify.2025-01.graphqls # Uses Shopify schema
  node index.mjs /absolute/path/to/custom-schema.graphqls
  `);
  process.exit(0);
}

const schemaArg = args[0];

// Global state for schema and schema path
let currentSchema;
let currentSchemaPath;

const loadSchema = async (schemaPath) => {
  let schemaContent;
  try {
    schemaContent = await readFile(schemaPath, { encoding: "utf-8" });
  } catch (_error) {
    console.error(`Error: Schema file not found at ${schemaPath}`);
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  try {
    const schema = buildSchema(schemaContent);
    console.error(`Schema loaded successfully from ${schemaPath}`);
    return schema;
  } catch (error) {
    console.error(`Error loading schema: ${error.message}`);
    throw error;
  }
};

const initializeSchema = async () => {
  // Default to schema.graphqls if no argument provided
  currentSchemaPath = resolve(schemaArg ?? "schema.graphqls");

  try {
    currentSchema = await loadSchema(currentSchemaPath);
    return currentSchema;
  } catch (error) {
    console.error("Usage: node index.mjs [path/to/schema.graphqls]");
    process.exit(1);
  }
};

const schema = await initializeSchema();

// Extract schema name from file path for server identification
const schemaName = schemaArg ? schemaArg.split("/").pop().replace(".graphqls", "") : "schema";

const server = new McpServer({
  name: `GraphQL Schema: ${schemaName}`,
  version: "1.0.0",
  description: `Provides GraphQL schema information for ${schemaName}`,
});

// Helper function to get current query fields
const getCurrentQueryFields = () => currentSchema.getQueryType()?.getFields();

// Helper function to get current mutation fields  
const getCurrentMutationFields = () => currentSchema.getMutationType()?.getFields();

// Helper function to get current subscription fields
const getCurrentSubscriptionFields = () => currentSchema.getSubscriptionType()?.getFields();

const queryFields = getCurrentQueryFields();

if (queryFields) {
  server.tool(
    "list-query-fields",
    "Lists all of the available root-level fields for a GraphQL query.",
    () => {
      const fields = getCurrentQueryFields();
      return {
        content: [
          {
            type: "text",
            text: fields ? Object.keys(fields).join(", ") : "No query fields available",
          },
        ],
      };
    },
  );

  server.tool(
    "get-query-field",
    "Gets a single GraphQL query field definition in GraphQL Schema Definition Language.",
    { fieldName: z.string() },
    ({ fieldName }) => {
      const fields = getCurrentQueryFields();
      return {
        content: [
          {
            type: "text",
            text: fields?.[fieldName]?.astNode
              ? print(fields[fieldName].astNode)
              : "Field not found or has no definition",
          },
        ],
      };
    },
  );
}

const mutationFields = getCurrentMutationFields();

if (mutationFields) {
  server.tool(
    "list-mutation-fields",
    "Lists all of the available root-level fields for a GraphQL mutation.",
    () => {
      const fields = getCurrentMutationFields();
      return {
        content: [
          {
            type: "text",
            text: fields ? Object.keys(fields).join(", ") : "No mutation fields available",
          },
        ],
      };
    },
  );

  server.tool(
    "get-mutation-field",
    "Gets a single GraphQL mutation field definition in GraphQL Schema Definition Language.",
    { fieldName: z.string() },
    ({ fieldName }) => {
      const fields = getCurrentMutationFields();
      return {
        content: [
          {
            type: "text",
            text: fields?.[fieldName]?.astNode
              ? print(fields[fieldName].astNode)
              : "Field not found or has no definition",
          },
        ],
      };
    },
  );
}

const subscriptionFields = getCurrentSubscriptionFields();

if (subscriptionFields) {
  server.tool(
    "list-subscription-fields",
    "Lists all of the available root-level fields for a GraphQL subscription.",
    () => {
      const fields = getCurrentSubscriptionFields();
      return {
        content: [
          {
            type: "text",
            text: fields ? Object.keys(fields).join(", ") : "No subscription fields available",
          },
        ],
      };
    },
  );

  server.tool(
    "get-subscription-field",
    "Gets a single GraphQL subscription field definition in GraphQL Schema Definition Language.",
    { fieldName: z.string() },
    ({ fieldName }) => {
      const fields = getCurrentSubscriptionFields();
      return {
        content: [
          {
            type: "text",
            text: fields?.[fieldName]?.astNode
              ? print(fields[fieldName].astNode)
              : "Field not found or has no definition",
          },
        ],
      };
    },
  );
}

server.tool("list-types", "Lists all of the types defined in the GraphQL schema.", () => ({
  content: [
    {
      type: "text",
      // Filter out internal GraphQL types
      text: Object.keys(currentSchema.getTypeMap())
        .filter((type) => !type.startsWith("__"))
        .join(", "),
    },
  ],
}));

server.tool(
  "get-type",
  "Gets a single GraphQL type from the schema in the GraphQL Schema Definition Language",
  { typeName: z.string() },
  ({ typeName }) => {
    let text;
    const type = currentSchema.getTypeMap()[typeName];
    if (!type) {
      text = `Type "${typeName}" not found`;
    } else if (!type.astNode) {
      // Handle introspection types and other types without astNodes
      text = `Type: ${typeName}\nDescription: ${type.description ?? "No description"}\nKind: ${type.constructor.name}`;
    } else {
      text = print(type.astNode);
    }

    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "get-type-fields",
  "Gets a simplified list of fields for a specific GraphQL type",
  { typeName: z.string() },
  ({ typeName }) => {
    let text;
    const type = currentSchema.getTypeMap()?.[typeName];
    if (!type) {
      text = `Type "${typeName}" not found`;
    } else if (!("getFields" in type)) {
      text = `Type "${typeName}" is not an object type with fields`;
    } else {
      text = Object.entries(type.getFields())
        .map(([fieldName, field]) => `${fieldName}: ${field.type.toString()}`)
        .join("\n");
    }

    return { content: [{ type: "text", text }] };
  },
);

// Add tool to search for types or fields by name pattern
server.tool(
  "search-schema",
  "Search for types or fields in the schema by name pattern",
  { pattern: z.string() },
  ({ pattern }) => {
    let text = "";
    const searchRegex = new RegExp(pattern, "i");

    // Search types
    const matchingTypes = Object.keys(currentSchema.getTypeMap()).filter(
      (type) => !type.startsWith("__") && searchRegex.test(type),
    );
    text += `Matching types: ${matchingTypes.join(", ") || "None"}`;

    // Search fields in object types
    const matchingFields = Object.entries(currentSchema.getTypeMap())
      .filter(([typeName]) => !typeName.startsWith("__"))
      .flatMap(([typeName, type]) =>
        "getFields" in type
          ? Object.keys(type.getFields())
            .filter((fieldName) => searchRegex.test(fieldName))
            .map((fieldName) => `${typeName}.${fieldName}`)
          : [],
      );
    text += `\nMatching fields: ${matchingFields.join(", ") || "None"}`;

    return { content: [{ type: "text", text }] };
  },
);

// Set up file watching for schema changes
const watcher = chokidar.watch(currentSchemaPath, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true, // don't fire events for the initial scan
});

watcher.on('change', async (path) => {
  console.error(`Schema file changed: ${path}`);
  try {
    // Reload the schema
    const newSchema = await loadSchema(currentSchemaPath);
    currentSchema = newSchema;
    console.error('Schema reloaded successfully');
  } catch (error) {
    console.error(`Failed to reload schema: ${error.message}`);
    // Keep the existing schema if reload fails
  }
});

watcher.on('error', error => {
  console.error(`Watcher error: ${error}`);
});

console.error(`Watching for changes to schema file: ${currentSchemaPath}`);

const transport = new StdioServerTransport();
await server.connect(transport);
