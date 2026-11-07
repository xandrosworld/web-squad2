FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node app/ ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
