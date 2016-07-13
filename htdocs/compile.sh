#!/bin/bash
PATH=$PATH:~/node_modules/.bin/
#npm install babel-plugin-transform-react-jsx
babel consult.js --plugins transform-react-jsx --out-file consult-compiled.js
