# 指南: 为 CVAT 部署自定义 YOLOv8 自动标注模型

本文档详细说明了如何在基于 Docker Compose 的 CVAT 环境中, 部署一个自定义的 YOLOv8 模型作为 Serverless 功能 (Nuclio Function), 以实现自动标注。

## 目标

将一个预训练的 YOLOv8 模型 (例如 `yolov8n.pt` 或 `yolov8n-seg.pt`) 集成到 CVAT 中, 使用户可以在 "Models" 页面找到并使用它进行自动目标检测或实例分割。

## 先决条件

1.  **CVAT 已运行**: 一个通过 `docker-compose.yml` 和 `components/serverless/docker-compose.serverless.yml` 成功启动的 CVAT 实例。
2.  **主机访问**: 可以通过 SSH 访问部署 CVAT 的主机。
3.  **`nuctl` CLI**: 在开发主机上已经安装了 `nuctl` 命令行工具。
4.  **网络代理 (如果需要)**:
    *   Docker 守护进程本身已配置为使用 HTTP/HTTPS 代理, 以便能从 Docker Hub 拉取镜像。
    *   终端环境已准备好代理 (如果需要 `wget` 等命令)。

---

## 部署方案

以下方案展示了如何根据您的模型类型（目标检测或实例分割）来部署 YOLOv8 模型。

### 方案一：部署目标检测模型 (Object Detection)

此方案提供了一个适用于**目标检测**任务的通用模板。其 `main.py` 脚本中的后处理逻辑默认会将模型输出转换为**边界框 (Bounding Boxes)**。这是 `custom_ai_model` 目录中提供的默认实现。

#### 第 1 步: 准备模型功能文件

所有必需的文件都已存放在 `custom_ai_model` 目录中。

*   `function.yaml`: Nuclio 配置文件。
*   `main.py`: 模型推理脚本 (为边界框设计)。
*   `Dockerfile`: 用于构建基础镜像的环境定义。
*   `yolov8n.pt`: 您的目标检测模型权重文件。

#### 第 2 步: 构建基础 Docker 镜像

```bash
# 确保您在 custom_ai_model 目录下
docker build -t yolov8-auto-annotation .
```

#### 第 3 步: 配置并部署

```bash
# 设置 Nuclio Dashboard 地址
export NUCTL_DASHBOARD_URL=http://127.0.0.1:8070

# 确保项目存在
nuctl create project cvat --platform local

# 执行部署
nuctl deploy --project-name cvat --path . --platform local
```

---


### 方案二：部署实例分割模型 (Instance Segmentation)

此方案提供了一个专为**实例分割**任务预先配置好的模板。为了确保环境的稳定和所有依赖的完整性，此方案采用了与方案一相同的两步构建策略：首先构建一个包含所有依赖的“基础镜像”，然后Nuclio会使用这个基础镜像来打包最终的函数。

#### 第 1 步: 准备所有文件

1.  在 CVAT 项目根目录创建一个新文件夹, 例如 `yolov8n-seg-model`。
2.  将您的分割模型文件 (例如 `yolov8n-seg.pt`) 复制到这个新文件夹中, 并**重命名为 `best.pt`**。
3.  在 `yolov8n-seg-model` 文件夹中, 确保您有以下三个最终版本的文件。

**`main.py` 文件:**
```python
import json
import base64
from PIL import Image
import io
import torch
from ultralytics import YOLO
import supervision as sv
from skimage.measure import approximate_polygon, find_contours

def init_context(context):
    context.logger.info("Initializing context for YOLOv8 segmentation...")
    model_path = "/opt/nuclio/best.pt"
    model = YOLO(model_path, task="segment")
    context.user_data.model = model
    context.logger.info("Context initialized successfully.")

def handler(context, event):
    context.logger.info("Running YOLOv8 segmentation model")
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"]))
    threshold = float(data.get("threshold", 0.5))
    
    image = Image.open(buf)
    
    yolo_results = context.user_data.model(image, conf=threshold)[0]
    labels = yolo_results.names
    
    detections = sv.Detections.from_yolov8(yolo_results)
    detections = detections[detections.confidence > threshold]
    
    results = []
    if len(detections) > 0 and detections.mask is not None:
        for i in range(len(detections.xyxy)):
            mask = detections.mask[i]
            class_id = detections.class_id[i]
            
            contours = find_contours(mask, 0.5)
            for contour in contours:
                contour = approximate_polygon(contour, tolerance=2.5)
                if len(contour) < 3:
                    continue
                
                results.append({
                    "confidence": str(detections.confidence[i]),
                    "label": labels[class_id],
                    "points": contour.ravel().tolist(),
                    "type": "polygon",
                })

    return context.Response(body=json.dumps(results),
                            headers={},
                            content_type='application/json',
                            status_code=200)
```

**`Dockerfile` 文件 (用于构建基础镜像):**
```dockerfile
# 1. 使用一个轻量的 Python 官方镜像作为基础
FROM python:3.9-slim

# 2. 安装系统级依赖 (特别是 OpenCV 需要的)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. 设置工作目录
WORKDIR /opt/nuclio

# 4. 安装核心 Python 依赖
RUN pip install --no-cache-dir ultralytics torch torchvision opencv-python-headless supervision scikit-image Pillow

# 5. 将我们的模型和处理脚本复制到镜像中
COPY best.pt .
COPY main.py .
```

**`function.yaml` 文件 (最终版):**
```yaml
metadata:
  name: yolov8-seg
  namespace: nuclio
  annotations:
    name: YOLOv8 Segmentation
    type: detector
    framework: ultralytics

spec:
  description: YOLOv8 official segmentation model
  runtime: 'python:3.9'
  handler: main:handler
  eventTimeout: 30s

  build:
    image: nuclio/yolov8-seg-processor
    baseImage: yolov8-seg-base

  triggers:
    myHttpTrigger:
      maxWorkers: 1
      kind: 'http'
      workerAvailabilityTimeoutMilliseconds: 10000
      attributes:
        maxRequestBodySize: 33554432 # 32MB

  platform:
    attributes:
      restartPolicy:
        name: always
        maximumRetryCount: 3
      mountMode: volume
```

#### 第 2 步: 构建并部署

现在, 执行以下两步命令。

```bash
# 进入模型目录
cd yolov8n-seg-model

# 1. 构建包含所有依赖的基础镜像，并命名为 "yolov8-seg-base"
docker build -t yolov8-seg-base .

# 2. 部署函数。Nuclio 会自动读取 function.yaml 并使用我们刚构建的 yolov8-seg-base 镜像
nuctl deploy yolov8-seg --project-name cvat \
    --path .
    --platform local
```

#### 第 3 步: 验证

成功后, 在 CVAT 的 "Models" 页面, 您应该能看到一个名为 `yolov8-seg` 的新模型。


---

## 关键排错指南

在部署过程中, Nuclio 的状态有时会因为网络中断、构建失败等原因被锁死. 以下是解决这个问题的**最终标准流程**。

### 问题现象

当 `nuctl deploy` 失败后, 再次尝试部署时, 出现以下错误:

```
Error - Function cannot be updated when existing function is being provisioned
```
或者在尝试删除项目时, 出现以下错误:
```
Error - Project contains functions
```

### 黄金重置流程 (The Golden Reset Procedure)

这套命令序列可以彻底重置 Nuclio 中某个项目的所有状态, 是解决状态锁死问题的最有效、最直接的方法.

1.  **强制删除整个项目**:
    使用 `--force` 标志可以强制删除项目及其内部所有状态卡死的函数. 这是最关键的一步。

    ```bash
    nuctl delete project cvat --platform local --force
    ```

2.  **重新创建项目**:
    在一个干净的环境中重新创建项目.

    ```bash
    nuctl create project cvat --platform local
    ```

3.  **重新部署**:
    现在, 您可以安全地重新执行部署命令.

    ```bash
    nuctl deploy --project-name cvat \
    --path .
    --platform local
    ```

### 问题现象 2: 部署命令长时间卡在 `Building docker image`

有时, `nuctl deploy` 命令在输出 `Building docker image` 后会长时间没有响应, 看起来像是“卡死”了。但这通常只是假象，背后可能是构建过程极其缓慢，或者 `nuctl` 与 Docker 守护进程的通信被挂起。

#### 诊断步骤

1.  **确认是否真的在构建**:
    打开一个新的终端，运行 `docker stats` 或 `docker ps`。如果能看到一个名字是随机字符串的容器，并且其 CPU 或网络I/O 在变化，那么说明构建在正常进行，只是非常缓慢，需要耐心等待。

2.  **获取详细日志**:
    如果 `docker ps` 中没有构建容器，说明 `nuctl` 可能被挂起。
    *   **增加详细输出**: 在 `nuctl deploy` 命令中加入 `--verbose` 标志，这会让它打印出将要执行的确切 `docker build` 命令。
        ```bash
        nuctl deploy --verbose --project-name cvat ...
        ```
    *   **实时查看构建日志**: 如果上一步确认 `nuctl` 确实调用了 `docker build` 但你看不到进度，可以在新终端中用 `docker ps` 找到构建容器的ID，然后运行 `docker logs -f <container_id>` 来实时追踪构建日志。

3.  **终极解决方案：“硬重启” Docker 服务**
    如果以上方法都无法解决挂起问题，这通常意味着 Docker 守护进程本身处于不稳定状态。重启 Docker 服务是最终的解决方案。
    ```bash
    # 在大多数 Linux 系统上
    sudo systemctl restart docker
    ```
    重启 Docker 后，再重复“黄金重置流程”和部署命令。

---

## 指南: 为 CVAT 部署内置的 SAM 自动分割模型

与完全自定义的模型不同, CVAT 官方已经将 Segment Anything Model (SAM) 集成到了项目中. 因此, 部署它更为简单, 无需手动编写 `function.yaml` 或构建 Docker 镜像.

### 目标

在 CVAT 中启用 SAM 模型, 以便在标注界面中使用 "Interactors" (交互式工具) 进行智能分割.

### 部署流程

部署 SAM 模型需要使用 CVAT `serverless` 目录中提供的预置脚本.

1.  **进入 `serverless` 目录**:
    首先, 通过 SSH 连接到您的 CVAT 主机, 并进入 `cvat/serverless` 目录.

    ```bash
    # 假设您的 CVAT 安装在 /app/cvat
    cd /app/cvat/serverless
    ```

2.  **执行部署脚本**:
    根据您的硬件选择合适的脚本.

    *   **GPU 版本 (推荐)**:
        ```bash
        ./deploy_gpu.sh pytorch/facebookresearch/sam/nuclio/
        ```

    *   **CPU 版本**:
        ```bash
        ./deploy_cpu.sh pytorch/facebookresearch/sam/nuclio/
        ```

    部署过程会自动下载所需的模型和依赖, 并配置好 Nuclio 函数.

3.  **验证**:
    部署完成后, 打开任意一个标注任务. 在工具栏的 "Magic Wand" (魔法棒) 图标下, 您应该能看到 SAM 相关的 Interactor. 这表明模型已成功部署并可供使用. 您也可以在 Nuclio Dashboard (`http://<your_host>:8070`) 中看到新部署的函数。