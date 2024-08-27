#!/bin/bash

# Function to rename .js files to .ts files
rename_js_to_ts() {
    local folder_path=$1

    # Check if the folder exists
    if [ ! -d "$folder_path" ]; then
        echo "Directory $folder_path does not exist."
        exit 1
    fi

    # Iterate over all .js files in the directory
    for file in "$folder_path"/*.js; do
        # Check if there are any .js files
        if [ -e "$file" ]; then
            # Get the base name of the file without the extension
            base_name=$(basename "$file" .js)
            # Construct the new file name with .ts extension
            new_file="$folder_path/$base_name.ts"
            # Rename the file
            mv "$file" "$new_file"
            echo "Renamed: $file -> $new_file"
        fi
    done
}

# Check if a folder path is provided as an argument
if [ -z "$1" ]; then
    echo "Usage: $0 path/to/your/folder"
    exit 1
fi

# Call the function with the provided folder path
rename_js_to_ts "$1"
