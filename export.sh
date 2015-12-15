#!/usr/bin/env bash
set -e

if [ ! -e "blender-path" ]; then
   echo 'Create a file called "blender-path" including this line:'
   echo 'BLENDER="<path to blender>"'
   exit 1
fi

. blender-path
SCRIPT=blender-export.py

for i in $*; do
    TGT=`echo "$i" | sed "s/.blend/.three.json/"`

    echo "## Converting $i"
    "$BLENDER" "$i" --background --python "$SCRIPT" -- "$TGT"

done
