FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --shell /usr/sbin/nologin satisfactory
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/README.md /app/.env.example ./
RUN mkdir -p /app/logs /app/data /satisfactory /backups \
  && chown -R satisfactory:satisfactory /app /satisfactory /backups
USER satisfactory
ENV NODE_ENV=production
EXPOSE 7777/tcp 7777/udp 8888/tcp 3000/tcp
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/src/index.js"]
