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

此方案提供了一个专为**实例分割**任务预先配置好的模板。为了确保环境的稳定和所有依赖的完整性，此方案采用了与方案一相同的两步构建策略。

#### 第 1 步: 准备文件

此方案所需的所有配置文件 (`main.py`, `Dockerfile`, `function.yaml`) 均已在 `yolov8n-seg-model` 目录中提供，并已配置好。

您唯一需要做的就是，将您自己训练好的 YOLOv8 分割模型权重文件命名为 `best.pt`，然后放入 `yolov8n-seg-model` 目录中，替换掉占位文件即可。

#### 第 2 步: 构建并部署

现在，执行以下两步命令。

```bash
# 进入模型目录
cd yolov8n-seg-model

# 1. 构建包含所有依赖的基础镜像，并命名为 "yolov8-seg-base"
docker build -t yolov8-seg-base .

# 2. 部署函数。Nuclio 会自动读取 function.yaml 并使用我们刚构建的 yolov8-seg-base 镜像
nuctl deploy yolov8-seg --project-name cvat \
    --path .  \
    --platform local
```

#### 第 3 步: 验证

成功后, 在 CVAT 的 "Models" 页面, 您应该能看到一个名为 `yolov8-seg` 的新模型。


---

## 关键排错指南

在部署过程中, Nuclio 的状态有时会因为网络中断、构建失败等原因被锁死。当 `nuctl deploy` 失败后, 再次尝试部署时, 可能会出现 `Function cannot be updated when existing function is being provisioned` 的错误。

以下是解决这个问题的两种方案，推荐优先使用方案一。

### 方案一：精准强制删除单个函数 (推荐)

这个方法可以在不影响项目中其他正常函数的情况下，强制删除那个卡住的特定函数。

1.  **列出所有函数**，找到卡住的函数的确切名称:
    ```bash
    nuctl get function --platform local
    ```

2.  **使用 `--force` 标志强制删除它**:
    ```bash
    # 将 <函数名> 替换为上一步中找到的名称
    nuctl delete function <函数名> --platform local --force
    ```
执行成功后，即可重新部署。

### 方案二：彻底重置整个项目

如果方案一无效，或者您希望清理掉项目中的所有函数，可以使用此“黄金重置”流程。

**警告：此操作会删除该项目下的所有函数，包括那些正常运行的。**

1.  **强制删除整个项目**:
    ```bash
    nuctl delete project cvat --platform local --force
    ```

2.  **重新创建项目**:
    ```bash
    nuctl create project cvat --platform local
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