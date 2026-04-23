FROM node:lts-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev

COPY dist ./dist
COPY README.md LICENSE glama.json ./

ENTRYPOINT ["node", "dist/index.js"]
