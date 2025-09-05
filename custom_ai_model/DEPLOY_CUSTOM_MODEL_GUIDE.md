# 指南: 为 CVAT 部署自定义 YOLOv8 自动标注模型

本文档详细说明了如何在基于 Docker Compose 的 CVAT 环境中, 部署一个自定义的 YOLOv8 模型作为 Serverless 功能 (Nuclio Function), 以实现自动标注.

## 目标

将一个预训练的 YOLOv8 模型 (例如 `yolov8n.pt`) 集成到 CVAT 中, 使用户可以在 "Models" 页面找到并使用它进行自动目标检测.

## 先决条件

1.  **CVAT 已运行**: 一个通过 `docker-compose.yml` 和 `components/serverless/docker-compose.serverless.yml` 成功启动的 CVAT 实例.
2.  **主机访问**: 可以通过 SSH 访问部署 CVAT 的主机.
3.  **`nuctl` CLI**: 在开发主机上已经安装了 `nuctl` 命令行工具.
4.  **网络代理 (如果需要)**:
    *   Docker 守护进程本身已配置为使用 HTTP/HTTPS 代理, 以便能从 Docker Hub 拉取镜像.
    *   终端环境已准备好代理 (如果需要 `wget` 等命令).

---

## 部署流程

### 第 1 步: 准备模型功能文件

所有必需的文件都已存放在 `custom_ai_model` 目录中.

*   `function.yaml`: Nuclio 配置文件.
*   `main.py`: 模型推理脚本.
*   `Dockerfile`: 用于构建基础镜像的环境定义.
*   `yolov8n.pt`: 模型权重文件 (用户需自行准备).

> **文件来源说明**: `function.yaml` 和 `main.py` 的模板最初来源于社区项目 [kurkurzz/custom-yolov8-auto-annotation-cvat-blueprint](https://github.com/kurkurzz/custom-yolov8-auto-annotation-cvat-blueprint).

### 第 2 步: 构建基础 Docker 镜像

使用当前目录下的 `Dockerfile` 在本地构建一个 Docker 镜像. 这个镜像的名字 (`yolov8-auto-annotation`) 必须与 `function.yaml` 中引用的基础镜像名一致.

```bash
# 确保您在 custom_ai_model 目录下
docker build -t yolov8-auto-annotation .
```
*此过程可能需要几分钟, 因为它需要下载和安装 PyTorch 等库.*

### 第 3 步: 配置并部署

现在, 所有准备工作都已完成, 我们可以使用 `nuctl` 进行部署.

1.  **配置 `nuctl` Dashboard 地址**:
    告诉 `nuctl` 客户端去哪里找到正在运行的 Nuclio 服务.

    ```bash
    # 这个环境变量只在当前终端会话中有效
    export NUCTL_DASHBOARD_URL=http://127.0.0.1:8070
    ```
    *提示: 您可以将这行命令添加到 `~/.bashrc` 或 `~/.zshrc` 中使其永久生效.*

2.  **部署模型**:
    执行部署命令. `nuctl` 会读取当前目录下的 `function.yaml`, 使用我们在第 2 步中构建的本地基础镜像, 并开始部署.

    ```bash
    # 确保项目存在 (如果不存在则创建)
    nuctl create project cvat --platform local

    # 执行部署
    nuctl deploy --project-name cvat \
    --path .
    --platform local
    ```

### 第 4 步: 验证

部署过程可能需要几分钟. 成功后, 打开您的 CVAT 网页, 导航到 "Models" 页面. 您应该能看到一个名为 `custom-model-yolov8` 的模型, 并且其状态为 **ready**.

---

## 关键排错指南

在部署过程中, Nuclio 的状态有时会因为网络中断、构建失败等原因被锁死. 以下是解决这个问题的**最终标准流程**.

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
    使用 `--force` 标志可以强制删除项目及其内部所有状态卡死的函数. 这是最关键的一步.

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
    部署完成后, 打开任意一个标注任务. 在工具栏的 "Magic Wand" (魔法棒) 图标下, 您应该能看到 SAM 相关的 Interactor. 这表明模型已成功部署并可供使用. 您也可以在 Nuclio Dashboard (`http://<your_host>:8070`) 中看到新部署的函数.
