#!/bin/sh

# Converts sqldeveloper JSON export to markdown table with header row.
# Assumes each record has its properties listed in the same order as the according
# column item in the columns list.
markdown_table_from_sqldeveloper_json() {
  local item_filter_criteria
  local item_filter_step

  item_filter_criteria=$1
  shift

  if [[ $item_filter_criteria == -h || $item_filter_criteria == --help ]]; then
    cat <<END_HELP

Usage:

  pbpaste | markdown_table_from_sqldeveloper_json [filter-process]
  markdown_table_from_sqldeveloper_json [filter-process] < file.json > out.md

Converts the JSON export from SQLDeveloper into a Markdown table fit for Github.

==== Args ====

  [filter-process] - Optional jq operation/chain predicate to check per-item.
    If this operation/chain evaluates to true then the item is kept.
    When omitted, default behavior is to keep all items.

==== Helpful Snippets ====

Comparing against a property is simple enough:

  markdown_table_from_sqldeveloper_json '.item_prop == "Foo"'

Checking if a prop value is in a given set is a bit more verbose:

  markdown_table_from_sqldeveloper_json '.item_prop | [
    . == "Foo",
    . == "Bar",
    . == "Zap",
    . == "Gorf"
  ] | any'

END_HELP

    return 0
  fi

  if [[ -n $item_filter_criteria ]]; then
    item_filter_step="| map(select(${item_filter_criteria}))"
  fi

  jq -r '[
    ([ .results[0].columns | map(.name | split("_") | join("\\_")) | join(" | ") ]),
    ([ .results[0].columns | map(":--") | join(" | ") ]),
    (.results[0].items '"$item_filter_step"' | map(values | join(" | ")))
  ]
  | flatten | map("| \(.) |") | join("\n")'
}
