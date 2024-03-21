#!/usr/bin/env bash

# Script to copy build files in project to local vault
# 1. Rename .vault_plugin_dir_path_example to .vault_plugin_dir_path
# 2. Edit .vault_plugin_dir_path with your actual path
# 3. Run npm run deploy:local:dev or npm run deploy:local

if [ ! -f .vault_plugin_dir_path ]; then
    echo ".vault_plugin_dir_path file not found!"
    echo "Create it from example file to continue"
    return
fi

plugin_dir=$(head -n 1 .vault_plugin_dir_path)

if [ ! -d "$plugin_dir" ]; then
    echo "Specified directory not found within vault, creating"
    mkdir "$plugin_dir"
fi

{ # try
    cp -fr main.js "$plugin_dir"
    cp -fr manifest.json "$plugin_dir"
    cp -fr styles.css "$plugin_dir"

    printf "Success!\nCopied main.js, manifest.json, and styles.css to %s" "$plugin_dir"
} || { # catch
    echo "Error! Something went wrong while copying over local build files"
    return
}
