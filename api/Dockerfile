FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm ci
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
# 根据部署环境设置前端地址（用于CORS和Socket）
ENV FRONTEND_URL=http://localhost

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# 预创建下载目录结构，匹配服务期望
RUN mkdir -p downloads/config downloads/tasks downloads/history

EXPOSE 3001
CMD ["node", "dist/index.js"]

