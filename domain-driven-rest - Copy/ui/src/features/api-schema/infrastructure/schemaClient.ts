import { TOOL_API_ROUTES } from "../../../shared/_critical/appMount";
import type { ApiDocument } from "../_dto/apiDocument";

export async function fetchApiDocument(refresh = false): Promise<ApiDocument> {
  const url = refresh
    ? `${TOOL_API_ROUTES.schemaDocument}?${TOOL_API_ROUTES.refreshQuery}=true`
    : TOOL_API_ROUTES.schemaDocument;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch schema.json: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
