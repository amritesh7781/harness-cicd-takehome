FROM node:20-alpine
WORKDIR /app
COPY app/ ./
EXPOSE 8080
USER node
CMD ["node", "server.js"]
