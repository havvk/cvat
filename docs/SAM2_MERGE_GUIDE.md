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
