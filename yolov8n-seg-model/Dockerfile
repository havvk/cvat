# 1. 使用一个轻量的 Python 官方镜像作为基础
FROM python:3.9-slim

# 2. 安装系统级依赖 (特别是 OpenCV 需要的)
#    -y: 自动确认
#    --no-install-recommends: 避免安装不必要的包
#    && rm -rf /var/lib/apt/lists/*: 清理缓存, 减小镜像体积
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libv4l-dev \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. 设置工作目录
WORKDIR /opt/nuclio

# 4. 安装核心 Python 依赖
RUN pip install --no-cache-dir ultralytics torch torchvision opencv-python-headless supervision scikit-image Pillow

# 5. 将我们的模型和处理脚本复制到镜像中
COPY best.pt .
COPY main.py .
