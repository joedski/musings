#!/usr/bin/env bash

if (( $# < 1 )); then
  cat <<HELP_TEXT

Usage: $0 {definition-names...} < <open-api-v2-json-file>

  Filters the definitions object of a given API doc to just the
  named items.

Parameters:

  {definition-names...}   One or more definition names.
                          Matches are exact, no substring searching
                          or case conversion is done.
                          Any definitions not found will not be output,
                          so if no definitions match, the output is "{}".

Examples:

  $0 Foo < api-doc.json

    Narrows down the definitions object to just the Foo definition.

  $0 Foo Bar < api-doc.json

    Narrows down the definitions object to just Foo and Bar.

HELP_TEXT

  exit 0
fi

key_checks=()

for def_name in "$@"; do
  key_checks=( "${key_checks[@]}" "or .key == \"$def_name\"" )
done

full_condition="${key_checks[*]}"
full_condition="${full_condition#or }"

jq '.definitions | with_entries(select('"$full_condition"'))'
