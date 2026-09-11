FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY dist ./dist/

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/app.js"]
