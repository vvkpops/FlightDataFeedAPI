FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Railway injects PORT at runtime; EXPOSE is informational only
EXPOSE ${PORT:-3000}

CMD ["node", "src/index.js"]
