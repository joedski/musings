#!/usr/bin/env bash

if (( $# < 2 )); then
  cat <<HELP_TEXT

Usage: $0 <property-name> <property-value> < <open-api-v2-json-file>

  Shows the description of an endpoint found by its Operation ID.

  Outputs nothing if no endpoint is found with the given Operation ID.

Parameters:

  <property-name>   Name of the property to check.

  <property-value>  Value of the property so named.
                    You must quote strings.
                    No case conversion is performed, matching is exact.
                    You can specify objects and arrays, but you have to
                    specify the full such things.

Examples:

  $0 operationId '"getFooBar"' < api-doc.json

    Gets an endpoint whose Operation ID is the string "getFooBar".

HELP_TEXT

  exit 0
fi

endpoint_prop_name=$1
endpoint_prop_value=$2

jq '
  .paths
  | with_entries(
    .value
    |= with_entries(
      select(.value.'"$endpoint_prop_name"' == '"$endpoint_prop_value"')
    )
    | select(.value | length > 0)
  )'
