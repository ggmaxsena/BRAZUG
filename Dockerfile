FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tini

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

RUN mkdir -p /uploads

EXPOSE 3000

VOLUME ["/uploads"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
