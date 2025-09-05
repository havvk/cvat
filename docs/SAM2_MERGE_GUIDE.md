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

#### **第六步：部署 SAM2 无服务器函数**

在 CVAT 服务成功运行后，打开一个新的终端，执行以下命令来部署用于处理 SAM2 模型推理的无服务器函数。

```bash
# 在 CPU 上部署
./serverless/deploy_cpu.sh serverless/pytorch/facebookresearch/sam2
```

---

### **附录：Serverless 函数部署问题排查**

在执行 `./serverless/deploy_cpu.sh` 或 `./serverless/deploy_gpu.sh` 脚本时，可能会遇到一些常见问题。

#### **问题 1: 在 macOS (Apple Silicon / M-系列芯片) 上部署失败**

*   **现象**: `deploy_cpu.sh` 脚本在构建 `cvat.openvino.base` 镜像时报错，提示 `amd64` 与 `arm64` 架构不兼容。
*   **原因**: `deploy_cpu.sh` 脚本硬编码了对一个仅支持 `amd64` (Intel/AMD) 架构的 OpenVINO 基础镜像的构建。
*   **解决方案**: 由于部署 SAM2 (PyTorch模型) 并不需要 OpenVINO，可以直接编辑 `serverless/deploy_cpu.sh` 脚本，将 `docker build -t cvat.openvino.base ...` 这一行命令注释掉。

#### **问题 2: 部署命令长时间卡在 `Building docker image`**

*   **现象**: `nuctl deploy` 命令输出 `Building docker image` 后长时间没有响应。
*   **原因**: 这通常是 `nuctl` 与 Docker 守护进程交互时被挂起，或者后台的 `docker build` 过程极其缓慢。
*   **解决方案**:
    1.  **确认状态**: 在新终端中运行 `docker ps` 检查是否有随机名称的构建容器正在运行。
    2.  **查看日志**: 如果有构建容器，运行 `docker logs -f <container_id>` 来实时查看构建进度。
    3.  **获取命令**: 如果没有构建容器，可以编辑部署脚本，在 `nuctl deploy` 后加入 `--verbose` 参数，这会打印出 `nuctl` 实际执行的 `docker build` 命令。
    4.  **硬重启**: 最终的解决方案通常是重启 Docker 服务 (`sudo systemctl restart docker`)，然后重复“黄金重置流程”（参考 `DEPLOY_CUSTOM_MODEL_GUIDE.md`），再重新部署。

#### **问题 3: 构建过程中网络下载缓慢或失败**

*   **现象**: `apt-get` 或 `pip install` 步骤非常缓慢或连接超时。
*   **原因**: Docker 构建环境无法连接互联网，或访问国外软件源速度慢。
*   **解决方案**:
    1.  **配置代理**: 最佳实践是为 Docker 服务配置全局代理。如果不行，也可以在 `function.yaml` 或 `function-gpu.yaml` 的 `build.directives` 部分，通过 `ENV` 指令注入 `http_proxy` 和 `https_proxy` 环境变量。对于Linux主机，代理地址应设为 `http://127.0.0.1:PORT`。
    2.  **更换镜像源**: 对于 `apt-get` 慢的问题，可以在 `RUN apt-get update` 之前，加入一个 `RUN sed ...` 命令，将软件源更换为国内的镜像（如 `mirrors.aliyun.com`）。
