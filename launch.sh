if command -v python >/dev/null 2>&1; then
    python server/server.py
else
    echo "ERROR: Python is not installed or is not added to PATH."
    read -n 1 -s -r -p "Press any key to continue..."
    echo
fi