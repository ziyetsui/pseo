import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../../backend/openapi/openapi.json", import.meta.url);
const target = new URL("../src/lib/api/", import.meta.url);
const document = JSON.parse(await readFile(source, "utf8"));
const nameOf = (value) => value.replace(/[^A-Za-z0-9_$]/g, "_");
function render(schema) {
  if (schema.$ref) return nameOf(schema.$ref.split("/").at(-1));
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((item) => JSON.stringify(item)).join(" | ");
  if (schema.anyOf || schema.oneOf) return (schema.anyOf ?? schema.oneOf).map(render).join(" | ");
  if (schema.allOf) return schema.allOf.map(render).join(" & ");
  if (schema.type === "array") return `Array<${render(schema.items ?? {})}>`;
  if (schema.type === "object" || schema.properties) {
    const properties = Object.entries(schema.properties ?? {}).map(([key, value]) =>
      `${JSON.stringify(key)}${schema.required?.includes(key) ? "" : "?"}: ${render(value)};`,
    );
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      properties.push(`[key: string]: ${render(schema.additionalProperties)};`);
    }
    return properties.length ? `{ ${properties.join(" ")} }` : schema.additionalProperties === false ? "Record<string, never>" : "Record<string, unknown>";
  }
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (["string", "boolean", "null"].includes(schema.type)) return schema.type;
  return "unknown";
}
let output = "// Generated from backend/openapi/openapi.json. Run pnpm generate:api.\n";
for (const [name, schema] of Object.entries(document.components.schemas)) {
  output += `export type ${nameOf(name)} = ${render(schema)};\n`;
}
const paths = Object.entries(document.paths).filter(([, value]) => value.get);
for (const [exportName, kind] of [["ApiQueries", "query"], ["ApiPathParams", "path"]]) {
  output += `export interface ${exportName} {\n`;
  for (const [path, value] of paths) {
    const fields = (value.get.parameters ?? []).filter((parameter) => parameter.in === kind);
    output += `  ${JSON.stringify(path)}: ${fields.length ? `{ ${fields.map((parameter) => `${JSON.stringify(parameter.name)}${parameter.required ? "" : "?"}: ${render(parameter.schema)};`).join(" ")} }` : "Record<string, never>"};\n`;
  }
  output += "}\n";
}
output += "export interface ApiResponses {\n";
for (const [path, value] of paths) {
  output += `  ${JSON.stringify(path)}: ${render(value.get.responses["200"].content["application/json"].schema)};\n`;
}
output += "}\nexport type ApiPath = keyof ApiResponses;\n";
const schemas = `${JSON.stringify({ components: document.components, paths: Object.fromEntries(paths.map(([path, value]) => [path, { response: value.get.responses["200"].content["application/json"].schema }])) }, null, 2)}\n`;
await mkdir(target, { recursive: true });
const files = [["generated.ts", output], ["schema.generated.json", schemas]];
if (process.argv.includes("--check")) {
  for (const [name, expected] of files) {
    const actual = await readFile(new URL(name, target), "utf8");
    if (actual !== expected) throw new Error(`${name} does not match the backend OpenAPI contract`);
  }
  console.log("Generated API contract matches backend OpenAPI.");
} else {
  for (const [name, contents] of files) await writeFile(new URL(name, target), contents);
  console.log(`Generated API contract in ${fileURLToPath(target)}`);
}
