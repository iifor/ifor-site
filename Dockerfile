# 构建：docker build --build-arg SITE_URL=https://你的域名 -t ifor-site .
FROM node:22-alpine AS build
ARG SITE_URL
ENV SITE_URL=$SITE_URL
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行：只带生产依赖和构建产物
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4321
USER node
CMD ["node", "dist/server/entry.mjs"]
