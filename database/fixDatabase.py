import os

# Renames all files in a folder to prefix + originalFileName non recursively
def PrefixFiles(dirpath, prefix):
    for filename in os.listdir(dirpath):
        file_path = os.path.join(dirpath, filename)
        if os.path.isfile(file_path):
            new_filename = prefix + filename
            new_file_path = os.path.join(dirpath, new_filename)
            os.rename(file_path, new_file_path)
            print(f"Renamed: {file_path} -> {new_file_path}")

PrefixFiles("songs", "YT~")
PrefixFiles("thumbnails", "YT~")