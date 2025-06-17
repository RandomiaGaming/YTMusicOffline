#!/bin/sh
set -euo pipefail

# Ensure python is installed
if ! command -v python >/dev/null 2>&1; then
    echo
    echo "Python is required to run YTMusicOffline but it could not be found."
    echo "You may need to edit your PATH or download it from https://www.python.org/downloads/"
    echo
    read -n 1 -s -p "Press any key to exit..."
    echo
    exit 1
fi

# Combine the command line args so they are ready to forward to python
ARGS="$@"

# Launch extractor.py and return its status code
python "$(dirname "$0")/extractor.py" "$ARGS"
exit $?