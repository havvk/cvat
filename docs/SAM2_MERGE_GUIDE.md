# 操作指南：正确合并 SAM2 功能分支

**目标**：在本地创建一个与官方 `cvat/develop` 同步的分支，然后将 `hashjoe/feature/sam2` 的代码合并进来，并成功运行。

---

### **阶段一：代码合并**

#### **第一步：同步到官方最新代码 (重置)**

这一步将确保我们从一个干净的、最新的官方代码状态开始。

**警告：以下命令会丢弃您当前分支上的所有本地修改。在执行前，请确保您已备份任何需要保留的工作。**

```bash
# 1. (如果尚未添加) 添加官方仓库作为上游 (upstream)
git remote add upstream https://github.com/cvat-ai/cvat.git

# 2. 获取官方仓库的最新信息
git fetch upstream

# 3. 切换到你的本地主分支 (通常是 develop)
git checkout develop

# 4. 将你的本地分支强制重置为与官方 develop 分支完全一致
git reset --hard upstream/develop
```

#### **第二步：添加 SAM2 功能分支的远程仓库**

我们需要告诉 Git 从哪里去获取 `feature/sam2` 分支的代码。

```bash
# 1. 添加 hashJoe 的仓库作为一个新的远程，命名为 "hashjoe"
git remote add hashjoe https://github.com/hashJoe/cvat.git

# 2. 从 hashjoe 仓库只获取我们需要的 feature/sam2 分支
git fetch hashjoe feature/sam2
```

#### **第三步：创建新的工作分支并合并**

我们将在一个全新的分支上进行合并操作，这是一种安全的做法，不会污染你的主分支。

```bash
# 1. 基于最新的官方代码，创建一个用于合并的新分支
git checkout -b cvat-with-sam2 upstream/develop

# 2. 在新分支上，开始合并 hashjoe 的 feature/sam2 分支
git merge hashjoe/feature/sam2
```

#### **第四步：解决合并冲突 (如果发生)**

如果 `git merge` 命令因为冲突而暂停，您需要手动编辑冲突文件，解决冲突后，通过 `git add <文件名>` 和 `git merge --continue` 来完成合并。

---

### **阶段二：部署和运行**

在代码成功合并后，执行以下步骤来运行和测试应用。

#### **第五步：构建并启动 CVAT 环境**

此命令会使用 SAM2 插件来构建和启动 CVAT。

```bash
CLIENT_PLUGINS=plugins/sam2 CVAT_HOST=localhost CVAT_VERSION=v2.21.2 docker compose -f docker-compose.yml -f docker-compose.dev.yml -f components/serverless/docker-compose.serverless.yml -p cvat up -d --build
```

#### **第六步：【关键】预构建 SAM2 基础镜像**

这是本次优化的核心。我们将把所有耗时的下载和安装步骤，都集中在这一次性的构建中。

1.  **创建 Dockerfile**:
    在 `serverless/pytorch/facebookresearch/sam2/hiera_large/` 目录下，创建一个名为 `Dockerfile.sam2` 的文件，并填入以下内容（**这是我们今天讨论的最终成果**）：

    ```dockerfile
    # Dockerfile.sam2

    FROM ubuntu:22.04
    ENV DEBIAN_FRONTEND=noninteractive NVIDIA_VISIBLE_DEVICES=all

    # 接收来自 --build-arg 的代理参数
    ARG HTTP_PROXY
    ARG HTTPS_PROXY
    ENV http_proxy=${HTTP_PROXY} https_proxy=${HTTPS_PROXY}

    RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl git python3 python3-pip ffmpeg libsm6 libxext6 \
        && rm -rf /var/lib/apt/lists/*

    WORKDIR /opt/nuclio/sam2

    RUN pip3 install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
        torch torchvision torchaudio pycocotools matplotlib onnxruntime onnx

    RUN pip3 install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
        git+https://github.com/facebookresearch/sam2.git@c2ec8e14a185632b0a5d8b161928ceb50197eddc

    RUN curl -L -O https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt

    RUN ln -s /usr/bin/pip3 /usr/local/bin/pip && \
        ln -s /usr/bin/python3 /usr/bin/python

    ENV PYTHONPATH /opt/nuclio/sam2
    ```

2.  **执行构建命令**:
    在 `serverless/pytorch/facebookresearch/sam2/hiera_large/` 目录下，运行以下命令。**这是解决网络问题的关键**。

    ```bash
    # 假设你的代理在 http://127.0.0.1:8118
    # 对于 Linux 用户，必须使用 --add-host
    # 对于 Mac/Windows Docker Desktop 用户，--add-host 是可选的，但加上也无妨
    docker build \
      --add-host=host.docker.internal:host-gateway \
      --build-arg HTTP_PROXY="http://host.docker.internal:8118" \
      --build-arg HTTPS_PROXY="http://host.docker.internal:8118" \
      -f Dockerfile.sam2 \
      -t sam2-hiera-large-base \
      .
    ```

#### **第七步：修改 `function-gpu.yaml` 并部署**

1.  **编辑 `function-gpu.yaml`**:
    简化该文件，让它直接使用我们刚刚构建的基础镜像。

    ```yaml
    # ... (metadata 部分保持不变) ...
    spec:
      # ... (description, runtime, handler 等保持不变) ...
      build:
        # 定义最终的函数镜像名
        image: cvat.pth.facebookresearch.sam2.hiera_large:latest-gpu
        # 指定我们预构建的基础镜像
        baseImage: sam2-hiera-large-base
        # 移除所有 buildArgs 和 directives！

      # ... (triggers, resources, platform 等保持不变) ...
    ```

2.  **部署函数**:
    现在，`nuctl deploy` 将会跳过所有下载步骤，在几秒内完成部署。

    ```bash
    # 切换到 serverless 目录
    cd serverless/

    # 执行部署脚本，它现在会使用修改后的配置文件
    # 脚本内部的 nuctl deploy 会变得飞快
    ./deploy_gpu.sh pytorch/facebookresearch/sam2
    ```

---

### **附录：Serverless 部署深度排查指南**

#### **问题 1: `docker build` 网络缓慢或失败 (根源)**

*   **现象**: `apt-get`, `pip`, `curl` 或 `git` 命令在构建基础镜像时极其缓慢、超时或报哈希错误。
*   **根源**: 构建容器无法访问主机上的代理服务。在容器内部，`127.0.0.1` 指向容器自身，而不是主机。
*   **终极解决方案**:
    1.  **使用 `host.docker.internal`**: 在 `Dockerfile` 中，将代理地址设置为 `http://host.docker.internal:PORT`。
    2.  **添加 `--add-host` (Linux 用户)**: 在执行 `docker build` 命令时，**必须**添加 `--add-host=host.docker.internal:host-gateway` 参数，以便容器能够解析这个特殊的 DNS 名称。
    3.  **使用国内镜像源**: 在 `Dockerfile` 的 `RUN` 指令中，为 `apt-get` (`sed` 修改 `sources.list`) 和 `pip` (`-i ...`) 指定国内镜像源，可以获得双重加速。

#### **问题 2: `nuctl deploy` 长时间卡住或失败**

*   **现象**: `nuctl deploy` 输出 `Building docker image` 后长时间无响应。
*   **原因**: 如果您**没有**采用两阶段部署，`nuctl` 会在后台执行一个缓慢的 `docker build`。所有在问题1中描述的网络问题都会在这里复现。
*   **解决方案**: **强烈建议放弃在线构建，并遵循本指南中的“阶段二”进行两阶段部署。** 这可以从根本上避免 `nuctl` 在部署时进行复杂的构建操作。

#### **问题 3: 在 macOS (Apple Silicon) 上部署 CPU 函数失败**

*   **现象**: `deploy_cpu.sh` 脚本因 `amd64` 与 `arm64` 架构不兼容而报错。
*   **原因**: 该脚本尝试构建一个仅支持 `amd64` 的 OpenVINO 基础镜像。
*   **解决方案**: 由于部署 SAM2 (PyTorch模型) 不需要 OpenVINO，可以直接编辑 `serverless/deploy_cpu.sh` 脚本，将 `docker build -t cvat.openvino.base ...` 这一行命令注释掉或删除。
