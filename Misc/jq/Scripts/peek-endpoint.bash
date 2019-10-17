#!/usr/bin/env bash

if (( $# < 2 )); then
  cat <<HELP_TEXT

Usage: $0 <http-method> <path> < <open-api-v2-json-file>

  Selects the given method of the given path from an OpenAPI v2 document
  streamed in via stdin.

  Outputs nothing if no endpoint is found for the given method+path.

Parameters:

  <http-method>   Any HTTP method that the API will respond to.

  <path>          Endpoint path.
                  Use {} to indicate a path parameter of any name.
                  Exact parameter names are not supported at this time.
                  A trailing / is optional, and is normalized out.

Examples:

  $0 get /components < api-doc.json

    Gets an endpoint "GET /components".

  $0 patch /components/{}/detail < api-doc.json

    Gets an endpoint "PATCH /components/{component-id}/detail"

  $0 patch /components/{}/detail/ < api-doc.json

    Same as previous example.

HELP_TEXT

  exit 0
fi

endpoint_method=$(echo "$1" | tr 'A-Z' 'a-z' | tr -d ' ')
endpoint_path=${2%/}
endpoint_path=/${2#/}
endpoint_path=${endpoint_path//'{}'/'[{][^{}]+[}]'}

# echo "method=$endpoint_method"
# echo "path=$endpoint_path"

jq '.paths
  | to_entries
  | .[]
  | select(.key | test("^'"$endpoint_path"'/?$"))
  | .value.'"$endpoint_method"
