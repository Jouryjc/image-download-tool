#!/usr/bin/env bash
set -euo pipefail

# 构建并推送前后端镜像到远程仓库
# 依赖：已安装 Docker，并可访问目标 Registry
# 环境变量：
# - REGISTRY_HOST: 目标仓库地址（示例：docker.io、registry.cn-hangzhou.aliyuncs.com）
# - NAMESPACE: 命名空间/用户名（示例：youruser 或 your-namespace）
# - TAG: 镜像标签（默认：latest）
# - VITE_API_URL: 前端构建时注入后端 API 地址（示例：https://your-backend-domain/api）
# - DOCKER_USERNAME / DOCKER_PASSWORD：如需登录 Docker Hub
# - ALIYUN_USERNAME / ALIYUN_PASSWORD：如需登录阿里云 ACR

REGISTRY_HOST=${REGISTRY_HOST:-docker.io}
NAMESPACE=${NAMESPACE:?请设置 NAMESPACE}
TAG=${TAG:-latest}
VITE_API_URL=${VITE_API_URL:-http://localhost:3001/api}

FRONTEND_IMAGE="${REGISTRY_HOST}/${NAMESPACE}/image-download-tool-frontend:${TAG}"
BACKEND_IMAGE="${REGISTRY_HOST}/${NAMESPACE}/image-download-tool-backend:${TAG}"

echo "==> 构建后端镜像: ${BACKEND_IMAGE}"
docker build -f api/Dockerfile -t "${BACKEND_IMAGE}" ./api

echo "==> 构建前端镜像: ${FRONTEND_IMAGE} (VITE_API_URL=${VITE_API_URL})"
docker build -f Dockerfile.frontend --build-arg "VITE_API_URL=${VITE_API_URL}" -t "${FRONTEND_IMAGE}" .

echo "==> 尝试登录 Registry: ${REGISTRY_HOST}"
if [[ "${REGISTRY_HOST}" == "docker.io" ]]; then
  if [[ -n "${DOCKER_USERNAME:-}" && -n "${DOCKER_PASSWORD:-}" ]]; then
    echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
  else
    echo "未设置 DOCKER_USERNAME/DOCKER_PASSWORD，跳过 docker.io 登录（如已登录则忽略）"
  fi
else
  if [[ -n "${ALIYUN_USERNAME:-}" && -n "${ALIYUN_PASSWORD:-}" ]]; then
    echo "${ALIYUN_PASSWORD}" | docker login "${REGISTRY_HOST}" -u "${ALIYUN_USERNAME}" --password-stdin
  else
    echo "未设置 ALIYUN_USERNAME/ALIYUN_PASSWORD，尝试匿名推送（可能失败）"
  fi
fi

echo "==> 推送镜像"
docker push "${BACKEND_IMAGE}"
docker push "${FRONTEND_IMAGE}"

echo "==> 完成: ${BACKEND_IMAGE} 与 ${FRONTEND_IMAGE} 已推送"

