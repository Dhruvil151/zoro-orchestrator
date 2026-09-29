FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY controller/ controller/
COPY tests/ tests/
CMD ["npx", "jest", "tests/council", "--forceExit", "--verbose"]
