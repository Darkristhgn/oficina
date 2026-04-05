FROM node:22-alpine

WORKDIR /app

# Copiar dependencias primero (cache layer)
COPY package*.json ./

RUN npm install

# Copiar el resto del proyecto
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
