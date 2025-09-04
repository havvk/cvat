# 操作指南：正确合并 SAM2 功能分支

**目标**：在本地创建一个与官方 `cvat/develop` 同步的分支，然后将 `hashjoe/feature/sam2` 的代码合并进来。

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

# 2. 从 hashjoe 仓库获取最新信息
git fetch hashjoe
```

#### **第三步：创建新的工作分支并合并**

我们将在一个全新的分支上进行合并操作，这是一种安全的做法，不会污染你的主分支。

```bash
# 1. 基于最新的官方代码，创建一个用于合并的新分支
git checkout -b cvat-with-sam2 upstream/develop

# 2. 在新分支上，开始合并 hashjoe 的 feature/sam2 分支
git merge hashjoe/feature/sam2
```

#### **第四步：解决合并冲突 (最关键的一步)**

执行 `git merge` 后，极有可能会因为两个分支都修改了相同的文件而产生冲突。Git 会暂停合并，并提示您手动解决。

1.  **识别冲突**：Git 会在终端列出冲突的文件。
2.  **手动编辑**：打开这些冲突文件，您会看到类似以下的标记：
    ```
    <<<<<<< HEAD
    (这部分是您当前分支 cvat-with-sam2 的代码, 即官方CVAT的代码)
    =======
    (这部分是来自 hashjoe/feature/sam2 分支的代码)
    >>>>>>> hashjoe/feature/sam2
    ```
3.  **解决冲突**：
    *   对于每一处冲突，您需要仔细判断，决定保留哪部分代码，或者如何将两部分代码结合起来。
    *   **特别注意**：对于 `package.json`, `pyproject.toml`, `requirements/*.txt` 等依赖管理文件，通常需要谨慎地合并双方的依赖项，而不是简单地选择某一方。
    *   解决完一个文件后，删除其中的 `<<<<<<<`, `=======`, `>>>>>>>` 标记。
4.  **标记为已解决**：
    ```bash
    # 每解决完一个文件，就执行一次 git add
    git add <您刚刚手动解决好的文件名>
    ```
5.  **完成合并**：当您解决完所有冲突并 `git add` 了所有文件后，执行以下命令来完成整个合并过程：
    ```bash
    git merge --continue
    ```
    Git 会打开一个编辑器让您填写合并的提交信息，您可以直接保存退出。