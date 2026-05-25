FROM node:20-alpine AS base
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY docker/bullboard/package.json ./
RUN npm install --production

COPY docker/bullboard/server.js ./

USER app
EXPOSE 3002
CMD ["node", "server.js"]
