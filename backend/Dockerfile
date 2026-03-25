FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --frozen-lockfile

COPY server.js ./
COPY init_db.js ./

# Carpeta de imágenes de productos (montada como volumen en producción)
RUN mkdir -p asset

EXPOSE 3001

# Inicializa las tablas y luego arranca el servidor
CMD ["sh", "-c", "node init_db.js && node server.js"]
