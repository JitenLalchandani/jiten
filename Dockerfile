FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json* ./backend/

RUN npm install
RUN npm install --prefix backend

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["node", "backend/server.js"]
