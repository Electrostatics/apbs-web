#!/bin/bash

# Recreate config file
rm -rf ./env-config*.js
# touch ./env-config.js

# Create unique environment file name
current_time=$(date "+%s%N")
env_config_filename=/env-config_$(echo $current_time).js
env_config_filename=./env-config.js
touch $env_config_filename

# Add assignment 
echo "window._env_ = {" >> $env_config_filename
# echo "window._env_ = {" >> ./env-config.js

# Read each line in .env file
# Each line represents key=value pairs
while read -r line || [[ -n "$line" ]];
do
  # Ignore:
  #   - lines beginning with '#'
  #   - empty lines
  if [[ ${line:0:1} != "#" && -n $line ]]; then

    # Split env variables by character `=`
    if printf '%s\n' "$line" | grep -q -e '='; then
      varname=$(printf '%s\n' "$line" | sed -e 's/=.*//')
      varvalue=$(printf '%s\n' "$line" | sed -e 's/^[^=]*=//')
    fi

    # Read value of current variable if exists as Environment variable
    value=$(printf '%s\n' "${!varname}")
    # Otherwise use value from .env file
    [[ -z $value ]] && value=${varvalue}
    
    # Append configuration property to JS file
    echo "  $varname: \"$value\"," >> $env_config_filename
    # echo "  $varname: \"$value\"," >> ./env-config.js
  fi
done < ./.env
# echo $env_config_filename
# sed -i 's/env-config.js/'$env_config_filename'/g' ../public/index.html

echo "}" >> $env_config_filename
# echo "}" >> ./env-config.js
