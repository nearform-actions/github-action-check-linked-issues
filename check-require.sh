#!/bin/sh

# This script makes sure there are no occurrences of eval('require') or eval("require")
# inside dist/index.js because that was previously a source of a bug in the `ncc` npm package.
# @see https://github.com/nearform-actions/github-action-check-linked-issues/issues/79
# @see https://github.com/nearform-actions/github-action-check-linked-issues/pull/87

# force tput to use the ansi terminal capabilities
export TERM=ansi

RED_COLOR=$(tput setaf 1)
NO_COLOR=$(tput setaf 9)
BOLD=$(tput bold)
NORMAL=$(tput sgr0)
FILE_PATH="dist/index.js"
SELF_FILE_NAME=${0}

findString() {
  NEEDLE=$1
  ROWS_FOUND_COUNT=$(grep -c "$NEEDLE" "$FILE_PATH")

  if [ "$ROWS_FOUND_COUNT" -ne "0" ]
  then
    echo "️❌ ${RED_COLOR}String \"$NEEDLE\" found in $FILE_PATH${NO_COLOR}, see ${BOLD}${SELF_FILE_NAME}${NORMAL} for more details."
    exit 1
  fi
}

# ----- Run the search

# We would like to search for `require(` but we cannot
# because it occurs in the $FILE_PATH's comments
# and would produce false positives
findString "eval('require')"
findString "eval(\"require\")"

# Everything is OK
exit 0
