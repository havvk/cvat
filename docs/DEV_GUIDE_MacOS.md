# CVAT 本地开发环境搭建指南 (macOS Apple Silicon 平台)

## 1. 前言

本指南旨在记录在 macOS Apple Silicon (M1/M2/M3) 平台上，从零开始搭建 CVAT 本地开发环境并成功运行 Python 测试套件的全过程。由于 CVAT 项目的复杂性以及本地环境的多样性，搭建过程会涉及多个环节，本指南将提供一套经过验证的、清晰的步骤，以规避我们曾遇到的各种“坑”。

## 2. 环境准备

在开始之前，请确保您的系统已安装以下工具：
*   **Homebrew**: macOS 的包管理器。
*   **Docker Desktop**: 用于运行项目所需的容器化服务。
*   **Git**: 用于代码版本控制。
*   **Node.js** 和 **Python 3.11+**: 推荐使用 Homebrew 进行安装 (`brew install node python@3.11`)。

## 3. 搭建步骤

**第一步：获取并合并代码**

```bash
# 从你的分叉克隆代码
git clone <你的仓库地址>
cd cvat

# 添加官方仓库作为上游
git remote add upstream https://github.com/cvat-ai/cvat.git

# 获取官方更新
git fetch upstream

# 合并官方 develop 分支到你当前的分支
# 注意：这一步很可能会产生代码冲突，需要您根据实际情况手动解决
git merge upstream/develop
```

**第二步：配置 Python 虚拟环境**

```bash
# 确保你已经安装了 Python 3.11 或更高版本
# brew install python@3.11

# （如果存在）删除旧的虚拟环境
rm -rf .venv

# 创建新环境
python3.11 -m venv .venv

# 激活新环境 (后续所有 Python 相关命令都在此环境下执行)
source .venv/bin/activate
```

**第三步：安装系统级依赖**

```bash
# 为 node-canvas 和 aiohttp 提供依赖
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# 为 Shapely 提供依赖
brew install geos
```

**第四步：修正项目配置文件**

1.  **修正 `cvat-sdk` 的打包配置**:
    此步骤是为了解决 `pip install -e` 安装本地包时的元数据冲突问题，同时也是为了**解决核心的 NumPy 版本冲突**。打开 `cvat-sdk/pyproject.toml` 文件，用以下内容**完全替换**原文件。新配置将 `numpy` 的版本要求从 `>=2` 修改为了 `<2`，从而解决了与科学计算生态包的兼容性问题。

    ```toml
    [build-system]
    requires = ["setuptools", "wheel"]
    build-backend = "setuptools.build_meta"

    [project]
    name = "cvat-sdk"
    version = "2.43.1"
    description = "CVAT REST API"
    readme = "README.md"
    requires-python = ">=3.9"
    license = { text = "MIT License" }
    keywords = ["OpenAPI", "OpenAPI-Generator", "CVAT REST API"]
    authors = [
      { name = "CVAT.ai team", email = "support@cvat.ai" },
    ]
    classifiers = [
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ]
    dependencies = [
        "attrs >= 21.4.0",
        "packaging >= 21.3",
        "Pillow >= 10.3.0",
        "platformdirs >= 2.1.0",
        "tqdm >= 4.64.0",
        "tuspy == 0.2.5",
        "typing_extensions >= 4.2.0",
        "inflection >= 0.5.1",
        "ruamel.yaml>=0.17.21"
    ]

    [project.urls]
    Homepage = "https://github.com/cvat-ai/cvat"

    [project.optional-dependencies]
    masks = ["numpy<2,>=1.22"]
    pytorch = ["torch", "torchvision", "scikit-image>=0.24", "cvat-sdk[masks]"]

    [tool.setuptools]
    packages = ["cvat_sdk"]

    [tool.isort]
    profile = "black"
    forced_separate = ["tests"]
    line_length = 100
    skip_gitignore = true
    known_first_party = ["cvat_sdk"]
    ```

2.  **修正 Docker Compose 文件**:
    为了让测试框架能够正确地命名和管理容器，需要将以下文件中**所有**的 `container_name:` 指令全部注释掉。
    *   `docker-compose.yml`
    *   `components/serverless/docker-compose.serverless.yml`
    *   `tests/docker-compose.minio.yml`
    *   `tests/docker-compose.file_share.yml`
    *   `tests/docker-compose.test_servers.yml`

3.  **修正 `generate.sh`**:
    `cvat-sdk/gen/generate.sh` 脚本存在一些路径处理和参数引用问题，会导致执行失败。请用以下内容**完全替换**该文件的原始内容：

    ```bash
    #!/bin/sh

    # Copyright (C) CVAT.ai Corporation
    #
    # SPDX-License-Identifier: MIT

    set -e

    # Get the absolute path to the script\'\''s directory
    # Using parameter expansion for robustness (${0%/*})
    SCRIPT_DIR="$(cd "${0%/*}" && pwd)"

    # Load environment variables from .env file
    if [ -f "${SCRIPT_DIR}/../../.env" ]; then
        set -o allexport
        source "${SCRIPT_DIR}/../../.env"
        set +o allexport
    fi

    GENERATOR_VERSION="v6.0.1"

    VERSION="2.43.1"
    LIB_NAME="cvat_sdk"
    LAYER1_LIB_NAME="${LIB_NAME}/api_client"
    DST_DIR="${SCRIPT_DIR}/.."
    DOCS_DIR="${DST_DIR}/docs"
    GEN_DIR="${SCRIPT_DIR}"
    POST_PROCESS_SCRIPT="${GEN_DIR}/postprocess.py"
    SCHEMA_PATH="${DST_DIR}/../cvat/schema.yml"

    rm -f -r "$DOCS_DIR" "${DST_DIR}/${LAYER1_LIB_NAME}" \
        "${DST_DIR}/requirements/api_client.txt"

    # Pass template dir here
    # https://github.com/OpenAPITools/openapi-generator/issues/8420
    docker run --rm -u "$(id -u):$(id -g)" \
        -v "${SCHEMA_PATH}:/mnt/schema.yml:ro" \
        -v "${GEN_DIR}:/mnt/gen:ro" \
        -v "${DST_DIR}:/mnt/dst" \
        -w /mnt/dst \
        openapitools/openapi-generator-cli:${GENERATOR_VERSION} generate \
            -t "/mnt/gen/templates/openapi-generator/" \
            -i "/mnt/schema.yml" \
            --config "/mnt/gen/generator-config.yml" \
            -p "packageVersion=$VERSION" \
            -p "httpUserAgent=cvat_sdk/$VERSION" \
            -g python \
            -o "."

    echo "VERSION = \"$VERSION\"" > "${DST_DIR}/${LIB_NAME}/version.py"
    mv "${DST_DIR}/requirements.txt" "${DST_DIR}/requirements/api_client.txt"

    API_DOCS_DIR="${DOCS_DIR}/apis/"
    MODEL_DOCS_DIR="${DOCS_DIR}/models/"
    mkdir -p "${API_DOCS_DIR}"
    mkdir -p "${MODEL_DOCS_DIR}"

    # Use a find command to robustly move files and handle cases where no files match
    find "${DOCS_DIR}" -maxdepth 1 -type f -name \'*Api.md*' -exec mv {} "${API_DOCS_DIR}" \;
    find "${DOCS_DIR}" -maxdepth 1 -type f -name \'*.md*' -exec mv {} "${MODEL_DOCS_DIR}" \;

    if [ -f "${DST_DIR}/api_summary.md" ]; then
        mv "${DST_DIR}/api_summary.md" "${DOCS_DIR}"
    fi

    # Do custom postprocessing for code files
    if [ -z "$VENV_PYTHON" ]; then
        VENV_PYTHON=python
    fi

    "$VENV_PYTHON" "${POST_PROCESS_SCRIPT}" --schema "${SCHEMA_PATH}" \
        --input-path "${DST_DIR}/${LIB_NAME}"

    # Do custom postprocessing for docs files
    "$VENV_PYTHON" "${POST_PROCESS_SCRIPT}" --schema "${SCHEMA_PATH}" \
        --input-path "$DOCS_DIR" --file-ext \'.md*'
    ```

4.  **为 Pytest 配置 Django 支持**:
    为了让 `pytest` 能够正确加载 Django 应用并找到测试，需要在项目根目录的 `pyproject.toml` 文件中**追加**以下内容。

    ```toml
    [tool.pytest.ini_options]
    DJANGO_SETTINGS_MODULE = "cvat.settings.testing"
    python_files = "tests.py test_*.py *_tests.py"
    ```

5.  **修正测试清理脚本**:
    在 `tests/python/shared/fixtures/init.py` 文件中，`pytest` 的会话结束清理钩子 `pytest_sessionfinish` 中有一行 `dropdb test_db` 命令。此命令在数据库不存在时会报错退出，为了增强脚本的健壮性，需要为其增加 `--if-exists` 参数。

6.  **修正 Dockerfile 以统一 Python 和 FFmpeg 版本 (一次性修复)**:
    为了从根源上解决本地环境与容器环境不一致的问题，我们需要对项目根目录下的 `Dockerfile` 进行几处关键修改。这些修改确保了 Docker 内部的构建环境与我们本地的 Python 3.11 环境完全对齐。

    *   **统一构建阶段的 Python 版本**: 在 `build-image-base` 阶段，同样安装 `python3.11` 并使用 `update-alternatives` 将其设置为默认的 `python3`。这确保了在构建 Python wheel 包时使用正确的 Python 版本。
    *   **升级 FFmpeg 版本**: 为了兼容新版的 `av` 视频处理库，将 `build-image-av` 阶段中的 `FFMPEG_VERSION` 从 `4.3.1` 升级到 `6.0`。
    *   **修正 FFmpeg 路径**: 同样在 `build-image-av` 阶段，将 `ARG PKG_CONFIG_PATH` 修改为 `ENV PKG_CONFIG_PATH`，以确保 `av` 在编译时能正确找到我们新安装的 FFmpeg 6.0。



**第五步：生成并安装 Python 依赖 (核心步骤)**

此步骤的核心是预先锁定几个关键库的正确版本，以规避我们已知的兼容性陷阱。

1.  **锁定关键包版本**:
    在对应的 `.in` 文件中，**直接修改**或**添加**对应的行，将以下几个关键包的版本锁定。

    *   在 `cvat/requirements/base.in` 中:
        *   `django-allauth[saml]` 修改为 `django-allauth[saml]==0.58.2`
        *   `django-rq` 修改为 `django-rq==2.10.3`
        *   `rq` 修改为 `rq==1.16.0`
        *   添加 `async-timeout` (为了兼容新版 `redis` 库)
    *   在 `utils/dataset_manifest/requirements.in` 中:
        *   `av` 修改为 `av==10.0.0` (这是我们找到的与项目代码API及编译环境都兼容的“黄金版本”)

2.  **安装依赖生成工具**:
    ```bash
    pip install pip-compile-multi PySocks
    ```

3.  **重新生成 `requirements.txt`**:
    现在，基于我们修改后的 `.in` 文件，重新生成最终的依赖列表。
    ```bash
    bash cvat/requirements/regenerate.sh
    ```

4.  **安装依赖**:
    现在所有版本都已在 `requirements.txt` 文件中正确固定，我们可以直接进行安装。
    ```bash
    pip install -r cvat/requirements/development.txt -r cvat/requirements/testing.txt -r tests/python/requirements.txt -r tests/perf/requirements.txt -e './cvat-sdk[masks,pytorch]' -e ./cvat-cli --extra-index-url https://download.pytorch.org/whl/cpu
    ```

**第六步：安装 JavaScript 依赖**

```bash
corepack enable
yarn install
```

**第七步：生成 SDK 客户端代码**

```bash
bash cvat-sdk/gen/generate.sh
```

**第八步：运行 Python 测试套件**

1.  **启动 Docker 服务**:
    ```bash
    # --compatibility 参数至关重要，它确保容器名使用下划线分隔
    docker-compose -p test --compatibility -f docker-compose.yml -f docker-compose.dev.yml up -d
    ```

2.  **初始化数据库**:
    ```bash
    # 复制 SQL 恢复脚本
    docker cp tests/python/shared/assets/cvat_db/restore.sql test_cvat_db_1:/tmp/restore.sql
    # 复制测试数据
    docker cp tests/python/shared/assets/cvat_db/data.json test_cvat_server_1:/tmp/data.json
    # 加载测试数据
    docker exec test_cvat_server_1 python manage.py loaddata /tmp/data.json
    # 创建并恢复测试数据库
    docker exec test_cvat_db_1 psql -U root -d postgres -v from=cvat -v to=test_db -f /tmp/restore.sql
    ```

3.  **执行测试**:
    为了确保使用的是虚拟环境中的 Python 解释器和依赖，请使用 `python -m pytest` 来运行测试。同时，为了让 `pytest` 能找到 `perfkit` 这个本地性能测试包，我们需要将它的父目录 `tests/perf` 添加到 `PYTHONPATH` 中。

    ```bash
    PYTHONPATH=./tests/perf python -m pytest
    ```

## 附录A：解决 Docker 环境 Python 版本不一致问题

在开发和构建过程中，我们遇到了一个典型的“在我的电脑上能跑，在容器里跑不起来”的问题。本附录记录了该问题的诊断过程和最终解决方案。

### 问题根源：环境不一致

问题的核心在于本地开发环境与 Docker 容器构建环境之间使用的 Python 版本不一致：

*   **本地环境**: 根据本指南的指导，我们本地的 Python 虚拟环境 (`.venv`) 是使用 `python3.11` 创建的。
*   **容器环境**: `cvat_server` 服务的基础 Docker 镜像 (`ubuntu:22.04`) 默认的 `python3` 命令指向 `python3.10`。

这个不一致导致了以下矛盾：
1.  我们在本地使用 `python3.11` 和 `pip-compile-multi` 生成了 `requirements.txt` 文件。
2.  当 `docker compose build` 命令尝试在容器内根据这份文件安装依赖时，容器内的 `python3.10` 无法满足某些包（如 `contourpy==1.3.3`）对 `Python >= 3.11` 的版本要求，从而导致构建失败。
3.  此外，即使安装了 `python3.11-venv`，在容器内直接运行 `python3 -m venv ...` 也会因为 `python3` 指向 `python3.10` 而找不到对应的 `venv` 模块，导致创建虚拟环境失败。

### 解决方案：统一环境

与其将本地环境降级以适应容器，更优的、一劳永逸的解决方案是**升级容器内的默认 Python 环境**，使其与我们的本地开发环境和指南要求保持一致。

我们通过修改项目根目录下的 `Dockerfile` 来实现这一点。

#### 具体操作

我们在 `Dockerfile` 中安装完所有 `apt` 包之后，紧接着添加了一个 `RUN` 命令，使用 `update-alternatives` 工具来将系统级的 `python3` 命令指向新安装的 `python3.11`。

修改后的 `Dockerfile` 部分内容如下：

```dockerfile
# ... (apt-get install ... python3.11 python3.11-venv etc.)

# Make python3 point to python3.11
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 2

# ... (rest of the Dockerfile)
```

通过这个修改，我们确保了在 Docker 构建的任何阶段，当调用 `python3` 命令时，执行的都是 `python3.11`。这从根源上解决了版本不一致导致的所有问题，统一了开发和生产（容器）环境。改，我们确保了在 Docker 构建的任何阶段，当调用 `python3` 命令时，执行的都是 `python3.11`。这从根源上解决了版本不一致导致的所有问题，统一了开发和生产（容器）环境。

## 附录B：修复因事务隔离导致的后台任务测试失败

在运行测试套件时，我们遇到了一个典型的后台任务测试失败案例。

### 现象

测试在创建一个需要后台处理的任务时失败，断言任务状态应为 `finished`，但实际为 `queued`。

### 根源分析

查看 `rqworker` 容器的日志，我们发现了一个更深层次的错误：`cvat.apps.engine.models.Task.DoesNotExist`。

这是由于 `pytest-django` 的默认行为导致的**事务隔离**问题。测试主进程在一个数据库事务中创建了 `Task` 对象，但并未提交。而 `rqworker` 是一个独立的外部进程，它的数据库连接无法看到这个未提交的事务中的数据，因此在尝试获取该 `Task` 时失败并崩溃。

项目的 `cvat/settings/testing.py` 文件中设计了 `PatchedDiscoverRunner`，试图通过设置 `ASYNC = False` 来让所有任务同步执行以解决此问题。但在我们的环境中，该机制未能对出错的测试用例 `ProjectBackupAPITestCase` 生效。

### 解决方案：强制同步执行

我们没有修改测试代码的等待逻辑，而是遵循了项目“任务应同步执行”的设计思路，通过 Django 的 `@override_settings` 装饰器，将此配置**直接应用**于出错的测试类。

**具体操作**：

在 `cvat/apps/engine/tests/test_rest_api.py` 文件中，为 `ProjectBackupAPITestCase` 类添加了 `@override_settings` 装饰器，强制其使用的 RQ 队列同步执行。

```python
from django.test import override_settings
from django.conf import settings
from copy import deepcopy

TEST_RQ_QUEUES = deepcopy(settings.RQ_QUEUES)
for config in TEST_RQ_QUEUES.values():
    config['ASYNC'] = False

@override_settings(RQ_QUEUES=TEST_RQ_QUEUES)
class ProjectBackupAPITestCase(ExportApiTestBase, ImportApiTestBase):
    # ... a reste of the class
```

这个修改精准地解决了特定测试用例的事务隔离问题，使得测试流程可以继续进行。
