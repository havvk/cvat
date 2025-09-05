# 开发环境搭建指南 (Docker 方案)

本文档详细说明了如何为“多维感知与智能分析子系统”搭建一个基于 Docker 的、隔离且可复现的开发环境。这是官方推荐的配置方式。

---

## 1. 核心优势

- **环境隔离:** 所有依赖（CUDA, cuDNN, PyTorch等）都封装在 Docker 容器内，不污染宿主机操作系统。
- **版本锁定:** 确保所有开发者使用完全一致的库版本，避免“在我电脑上能跑”的问题。
- **快速部署:** 一旦宿主机配置好 Docker，新开发者可以分钟级启动并进入开发环境。

---

## 2. 宿主机一次性环境准备

以下操作仅需在新服务器上执行一次。

### 2.1 安装 Docker Engine

```bash
# 1. 更新软件包列表并安装基础依赖
sudo apt-get update
sudo apt-get install -y ca-certificates curl

# 2. 添加 Docker 的官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 3. 设置 Docker 的软件仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. 安装 Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. (重要) 将当前用户添加到 docker 组以实现免 sudo 执行 docker
sudo usermod -aG docker $USER
```

> **注意:** 执行完 `usermod` 命令后，你需要**退出并重新登录服务器**，用户组权限才会生效。

### 2.2 安装 NVIDIA Container Toolkit

该工具包是让 Docker 能够调用 GPU 的关键。

```bash
# 1. 设置 NVIDIA Container Toolkit 的软件源
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# 2. 安装工具包
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# 3. 重启 Docker 服务以应用更改
sudo systemctl restart docker
```

---

## 3. 项目开发流程

完成一次性准备后，日常开发遵循以下流程。

### 3.1 (可选) 配置代理服务器

如果你的开发网络环境需要通过代理才能访问互联网 (例如公司内网)，请执行以下配置：

1.  复制代理模板文件：
    ```bash
    cp .env.example .env
    ```
2.  编辑 `.env` 文件，填入你的代理服务器地址。**请严格遵守以下规则：**
    -   `HOST_` 开头的变量：供 Docker 守护进程使用，必须填写宿主机本地地址，如 `http://127.0.0.1:7890`。
    -   `CONTAINER_` 开头的变量：供 Docker 容器内部使用，必须填写 `host.docker.internal` 作为地址，如 `http://host.docker.internal:7890`。

> **重要提示：**
> 为了让容器能够成功连接到宿主机上的代理服务，你必须在你的代理软件中，开启“**允许来自局域网(LAN)的连接**” (Allow LAN) 或类似选项。这是一个安全设置，默认通常是关闭的。忘记开启此选项是导致构建失败的最常见原因。

所有项目脚本都将自动检测并使用此文件中的配置。

### 3.2 获取项目代码

在服务器的用户主目录下，克隆本项目：

```bash
git clone https://github.com/havvk/Cable-Protection-System.git
cd Cable-Protection-System
```

### 3.2 构建项目专用 Docker 镜像

为了获得最快的启动速度和最佳的一致性，我们首先需要构建一个预装了所有依赖的 Docker 镜像。这一步是**一次性**的，未来只有当 `requirements.txt` 文件发生变化时才需要重新构建。

```bash
# 赋予构建脚本执行权限
chmod +x build_image.sh

# 执行构建
./build_image.sh
```

构建过程会需要几分钟，因为它正在下载和安装所有 Python 包。

### 3.3 启动开发容器

镜像构建完成后，随时可以通过以下脚本启动一个开发环境：

```bash
# 运行脚本启动容器 (该脚本已在之前步骤中赋予权限)
./run_dev_container.sh
```

执行后，你将直接进入一个**已安装好所有依赖**的容器环境，无需再执行 `pip install`。

### 3.5 日常开发工作流

我们推荐使用 Git 和 rsync 结合的工作流。

- **`git` 用于版本控制:**
  - 对于所有**稳定、可作为版本记录**的代码修改，请使用标准的 `git add`, `git commit`, `git push` 流程。

- **`rsync` 用于快速同步 (推荐):**
  - 对于**临时的、实验性的、不想马上提交**的代码修改，或者需要同步被 `.gitignore` 忽略的文件（如测试数据），请在**本地电脑**上运行同步脚本：
    ```bash
    ./sync_to_dev.sh
    ```
  - 这个脚本采用“白名单”模式，只会同步在脚本内部 `SYNC_ITEMS` 数组中明确定义的目录和文件，非常安全。