FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --frozen-lockfile

COPY server.js ./
COPY init_db.js ./

# Carpeta de imágenes de productos (montada como volumen en producción)
RUN mkdir -p asset

EXPOSE 3001
CMD ["node", "server.js"]
