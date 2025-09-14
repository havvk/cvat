# 指南: 从零开始搭建 CVAT 环境

本文档旨在提供一个清晰、完整的指南, 用于在开发主机上从零开始安装、配置并运行一个功能完备的 CVAT (Computer Vision Annotation Tool) 实例, 包括 Serverless AI 工具的支持.

## 目标

搭建一个稳定、可用于生产的 CVAT 环境, 并为后续部署自定义 AI 模型做好准备.

## 先决条件

在开始之前, 请确保您的开发主机 (例如, 一个远程服务器) 已经安装了以下软件:

1.  **Git**: 用于从 GitHub 克隆 CVAT 仓库.
2.  **Docker**: 用于运行容器化应用.
3.  **Docker Compose**: 用于编排和管理多容器的 CVAT 应用.

---

## 部署流程

**以下所有命令均应在您的开发主机上执行.**

### 第 1 步: 准备安装目录并克隆 CVAT

1.  **创建工作目录**: 建议将所有应用安装在 `/app` 目录下.

    ```bash
    sudo mkdir -p /app && sudo chown $(whoami):$(whoami) /app
    cd /app
    ```

2.  **克隆 CVAT 仓库**:
    建议克隆最新的稳定版本,以避免潜在的兼容性问题.

    ```bash
    git clone https://github.com/cvat-ai/cvat.git
    cd cvat
    ```

### 第 2 步: 理解并配置环境变量 (混合模式推荐)

CVAT 的配置是通过环境变量来完成的。在我们的实践中发现，不同类型的变量，其最佳配置方式有所不同。因此，我们推荐采用 `.env` 文件和 `docker-compose.override.yml` 文件并用的“混合模式”。

#### 为何采用混合模式？

- **`.env` 文件**: Docker Compose 会首先读取此文件，主要用于**变量替换**。也就是说，`docker-compose.yml` 文件中的 `${VARIABLE}` 占位符，会由此文件中的值替换。`CVAT_HOST` 就是一个典型的例子，它被用于 `traefik` 服务的路由规则中。
- **`docker-compose.override.yml`**: 在此文件中通过 `environment` 块为服务设置环境变量，是**最可靠、优先级最高**的方式。它可以避免 `.env` 文件可能存在的编码、格式解析问题，确保配置被容器精准加载。对于需要传递给 CVAT 应用本身的变量（如数据库、邮件、功能开关等），推荐使用此方法。

#### A. `.env` 文件配置

在项目根目录下创建 `.env` 文件，用于存放需要被 Docker Compose 文件自身引用的变量。

```bash
# .env

# CVAT_HOST 必须是您访问 CVAT 时使用的主要主机名 (域名或IP).
# 它将被用于替换 docker-compose.yml 中的 ${CVAT_HOST} 占位符。
CVAT_HOST=<your_primary_hostname>
```

#### B. `docker-compose.override.yml` 文件配置

在项目根目录下创建或编辑 `docker-compose.override.yml` 文件，用于存放所有需要传递给容器应用的环境变量。

下面的模板使用了 YAML 的“锚点”(&)功能，可以高效地为所有相关服务应用同一套配置。

```yaml
# docker-compose.override.yml

# 定义一个名为 'cvat-environment' 的通用环境配置锚点
x-cvat-environment: &cvat-environment
  environment:
    # --- 基础配置 (必须) ---
    # ALLOWED_HOSTS 会被 CVAT 应用直接读取
    ALLOWED_HOSTS: "<your_external_domain>,<your_lan_ip>,localhost,cvat-server"

    # --- 语言配置 (可选) ---
    LANGUAGE_CODE: "zh-Hans"

    # --- 邮件服务配置 (可选, 邀请用户功能需要) ---
    EMAIL_BACKEND: "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST: "your.smtp.server.com"
    EMAIL_PORT: 587
    EMAIL_HOST_USER: "your-email@example.com"
    EMAIL_HOST_PASSWORD: "your-generated-email-auth-code" # 注意：这里是授权码，不是登录密码！
    EMAIL_USE_TLS: "True"
    DEFAULT_FROM_EMAIL: "your-email@example.com"

services:
  cvat_server:
    <<: *cvat-environment # 应用通用配置

  cvat_worker_import:
    <<: *cvat-environment # 应用通用配置

  cvat_worker_export:
    <<: *cvat-environment # 应用通用配置

  cvat_worker_annotation:
    <<: *cvat-environment # 应用通用配置

  # 为所有其他 worker 也应用此配置...
  cvat_worker_utils:
    <<: *cvat-environment
  cvat_worker_quality_reports:
    <<: *cvat-environment
  cvat_worker_chunks:
    <<: *cvat-environment
  cvat_worker_consensus:
    <<: *cvat-environment
  cvat_worker_webhooks:
      <<: *cvat-environment
```
**请务必将上面模板中的占位符替换为你的真实信息。**

### 第 3 步: 启动 CVAT 服务

```bash
# 你的命令中应该包含所有需要用到的 compose 文件
docker compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml -f docker-compose.override.yml up -d --build
```

### 第 4 步: 创建管理员账户

```bash
docker compose exec cvat_server python3 manage.py createsuperuser
```

### 第 5 步: 访问 CVAT

现在, 您应该可以通过您在 `CVAT_HOST` 中设置的主机名进行访问了.

---
## 问题排查

在部署或升级后, 您可能会遇到一些常见问题.

### 问题 1: 访问时出现 "Bad Gateway" 或 "404 Not Found"

这通常是由于服务之间的网络问题或配置错误引起的.

#### 1.1 检查容器状态

首先, 检查所有 Docker 容器是否都处于 `Up` 或 `healthy` 状态.

```bash
docker compose ps
```

#### 1.2 `cvat_clickhouse` 容器不断重启

如果 `cvat_clickhouse` 容器的状态显示为 `Restarting`, 这通常与自定义配置不兼容有关.

*   **原因**: 您可能使用了与当前 CVAT 版本不兼容的 `clickhouse_tuning.xml` 文件.
*   **解决方案**:
    1.  **禁用自定义配置**: 在 `docker-compose.override.yml` 文件中, 注释掉挂载 `clickhouse_tuning.xml` 的那一行.
        ```diff
        services:
          cvat_clickhouse:
            volumes:
              # - ./clickhouse_tuning.xml:/etc/clickhouse-server/config.d/tuning.xml:ro
        ```
    2.  **重建服务**:
        ```bash
        docker compose up -d --force-recreate
        ```

#### 1.3 `traefik` 代理配置错误

如果所有容器都正常运行, 但仍然出现 "Bad Gateway", 问题可能出在 `traefik` 的路由配置上.

*   **检查 `traefik` 日志**:
    ```bash
    docker compose logs traefik
    ```
    如果您在日志中看到 `DownstreamStatus=502`, 这意味着 `traefik` 无法从上游服务 (`cvat_ui` 或 `cvat_server`) 获得有效响应.

*   **检查 `cvat_ui` 端口配置**:
    在 `docker-compose.yml` 文件中, `traefik` 通过 `labels` 来发现和配置服务. 确保 `cvat_ui` 服务的负载均衡端口正确无误.

    *   **错误配置 (示例)**:
        ```yaml
        services:
          cvat_ui:
            labels:
              # 这个端口可能是错误的, cvat/ui 镜像默认监听 80 端口
              traefik.http.services.cvat-ui.loadbalancer.server.port: "8000"
        ```

    *   **修正**:
        将 `server.port` 修改为 `80`.
        ```diff
        services:
          cvat_ui:
            labels:
              traefik.http.services.cvat-ui.loadbalancer.server.port: "80"
        ```

    *   **应用更改**:
        修改 `docker-compose.yml` 文件后, 强制重新创建服务.
        ```bash
        docker compose up -d --force-recreate
        ```

---

## 高级配置 (可选)

### 性能调优: 降低 ClickHouse CPU 占用

`clickhouse-server` 服务在默认配置下可能会消耗大量 CPU 资源。您可以通过自定义配置来降低其后台任务的强度。

**注意**: ClickHouse 的配置与其版本密切相关。不正确的配置会导致 `cvat_clickhouse` 容器无法启动。以下配置已经针对 `clickhouse-server:23.11` 版本进行了测试和验证。

#### 方案A: 极限调优 (保持 `background_pool_size=1`)

此方案将 CPU 占用降到最低，但配置较为复杂，需要逐个解决由 `background_pool_size=1` 引发的连锁配置冲突。

1.  **创建 `clickhouse_tuning.xml` 文件**:
    在项目根目录下创建此文件，并填入以下经过验证的兼容配置：

    ```xml
    <clickhouse>
        <!-- background_pool_size 是服务器级别设置 -->
        <background_pool_size>1</background_pool_size>

        <!-- 以下是 MergeTree 引擎相关的设置 -->
        <merge_tree>
            <!--
            根据错误日志，我们需要确保以下参数不大于 (background_pool_size * ratio) (计算结果为 1 * 2 = 2)。
            因此，我们将这些参数从其默认值 (8, 20, 25) 手动调低到 2。
            -->
            <number_of_free_entries_in_pool_to_execute_mutation>2</number_of_free_entries_in_pool_to_execute_mutation>
            <number_of_free_entries_in_pool_to_lower_max_size_of_merge>2</number_of_free_entries_in_pool_to_lower_max_size_of_merge>
            <number_of_free_entries_in_pool_to_execute_optimize_entire_partition>2</number_of_free_entries_in_pool_to_execute_optimize_entire_partition>

            <!-- 以下为原始调优参数 -->
            <parts_to_throw_insert>100</parts_to_throw_insert>
            <inactive_parts_to_throw_insert>100</inactive_parts_to_throw_insert>
            <parts_to_delay_insert>200</parts_to_delay_insert>
            <inactive_parts_to_delay_insert>200</inactive_parts_to_delay_insert>
        </merge_tree>
    </clickhouse>
    ```

2.  **挂载配置文件**:
    在 `docker-compose.override.yml` 文件中，确保 `clickhouse_tuning.xml` 被正确挂载：

    ```yaml
    services:
      cvat_clickhouse:
        volumes:
          - ./clickhouse_tuning.xml:/etc/clickhouse-server/config.d/tuning.xml:ro
    ```

3.  **重启服务**:
    修改配置后，使用 `up` 命令重启服务以应用调优。

#### 方案B: 稳定调优 (推荐)

此方案稍微提高了 `background_pool_size` 的值，避免了复杂的连锁冲突，配置简单，同时也能有效降低 CPU 占用。

1.  **创建 `clickhouse_tuning.xml` 文件**:
    文件内容非常简洁：
    ```xml
    <clickhouse>
        <!--
        为了从根本上避免与多个默认参数的连锁冲突，我们将 background_pool_size 设置为 13。
        这满足了所有约束条件 (13 * 2 = 26 > 25)，同时依然能起到降低CPU占用的作用。
        -->
        <background_pool_size>13</background_pool_size>
    </clickhouse>
    ```

2.  **挂载并重启**:
    同样，确保文件被挂载，然后重启服务即可。

---

## 高级配置：处理共享目录权限

### 1. 问题背景

当以一个非 `root` 的普通用户身份在 Linux 服务器上部署 CVAT，并希望使用一个主机目录作为共享目录（例如，用于存放和准备数据集）时，会遇到一个典型的权限冲突问题。

具体表现为：
- 在 `docker-compose.override.yml` 中通过“绑定挂载”(Bind Mount) 将一个属于当前用户的主机目录（如 `/home/qingwei/dataset`）挂载到容器中。
- `docker compose up` 启动容器后，该主机目录的所有者被自动修改为一个陌生的用户ID（如 `1000`）。
- 导致当前主机用户失去了对该目录的写入权限，无法自由地准备数据集。

### 2. 问题的根源：用户ID (UID) 不匹配

这个问题的根源在于**主机用户**和**容器内用户**的 ID 不一致。

- **主机用户**：你在服务器上登录的普通用户，例如 `qingwei`，拥有一个自己的用户ID（UID），比如 `1004`。
- **容器用户**：CVAT 的 `cvat/server` 镜像，在构建时，内部创建了一个默认的运行用户（名为 `django`），并硬编码了其用户ID为 `1000`。

当 Docker 将主机目录挂载进容器时，它检测到内外用户ID不匹配。为了保证容器内的程序（以ID `1000` 运行）能正常读写，Docker “自作主张”地将主机目录的所有者强行修改成了 `1000`。这就导致了主机用户 `1004` 失去了对自己目录的控制权。

### 3. 最终解决方案：从源头统一用户ID

最佳解决方案不是在运行时亡羊补牢，而是在构建镜像的源头，就让容器内的用户ID与你的主机用户ID保持一致。

#### 第一步：获取你的主机用户ID和组ID

在你的生产服务器上执行以下命令，获取你当前用户的 UID 和 GID。

```bash
# 获取用户ID (UID)
id -u

# 获取组ID (GID)
id -g
```
请记下这两个数字，在下一步中我们假设它们都是 `1004`。

#### 第二步：修改主 `Dockerfile`

打开项目根目录下的主 `Dockerfile` 文件，找到并修改以下**两处**地方，将所有硬编码的 `1000` 替换成你自己的ID。

1.  **修改创建用户时的 UID**：
    ```dockerfile
    # 找到这一行
    RUN adduser --uid=1000 --shell /bin/bash --disabled-password --gecos "" ${USER}

    # 将其修改为 (假设你的UID是1004)
    RUN adduser --uid=1004 --shell /bin/bash --disabled-password --gecos "" ${USER}
    ```

2.  **修改最终切换用户时的 UID 和 GID**：
    ```dockerfile
    # 找到这一行
    USER 1000:1000

    # 将其修改为 (假设你的UID和GID都是1004)
    USER 1004:1004
    ```

#### 第三步：(重要) 清理旧的数据卷

由于你之前可能已经启动过服务，Docker 会保留一些带有旧权限（所有者为 1000）的数据卷。这会导致新的、以用户 `1004` 运行的容器在启动时，因无法读取旧文件（如 `secret_key.py`, 日志文件等）而产生 `Permission denied` 错误。

因此，我们需要彻底删除这些旧的数据卷。

**警告**：此操作会删除 CVAT 相关的所有数据，包括数据库、密钥、日志等。请确保是在做全新部署或可以接受数据重置。

```bash
# 使用你完整的 docker compose 命令，在末尾加上 down -v
# -v 参数会删除所有关联的命名数据卷
docker compose -f ... down -v
```

#### 第四步：重新构建并启动

现在，万事俱备。我们可以用修改后的 `Dockerfile` 重新构建一个为你“量身定制”的镜像，并启动服务。

1.  **强制无缓存构建 `cvat_server` 镜像**：
    `--no-cache` 标志确保 Docker 不会使用旧的缓存层，而是完全应用我们对 `Dockerfile` 的修改。
    ```bash
    docker compose -f ... build --no-cache cvat_server
    ```

2.  **启动所有服务**：
    ```bash
    docker compose -f ... up -d
    ```

完成这些步骤后，你的 CVAT 实例将会以一个与你主机用户完全匹配的用户ID来运行。你的共享目录所有权将保持不变，容器也能正常启动和读写，所有权限问题都将得到根本解决。

### 附录：失败的尝试与解析

在调试过程中，我们曾尝试过在 `docker-compose.override.yml` 中使用 `user: "1004"` 指令来强制容器使用主机用户ID。

这个方法虽然能解决共享目录的所有权问题，但它会导致一个新的、更棘手的问题：容器内的启动脚本 `backend_entrypoint.sh` 因为所有者是 `1000` 而用户 `1004` 没有执行权限，导致容器无限重启。

这证明，仅仅在运行时指定用户是不够的，必须在构建镜像时就统一用户ID，才是最干净、最可靠的方案。

---

## 高级配置：用户注册管理

在生产环境中，为了安全起见，必须关闭公共注册功能，并采用管理员控制的方式来添加新用户。

### 1. 关闭公共注册

在我们的调试中发现，此版本的 CVAT 无法通过环境变量来关闭注册。最直接、最可靠的禁用方法是直接移除注册功能的 URL 入口。

#### 操作步骤：

##### 原理说明
> 这种方法之所以能让前端的“创建账户”链接消失，是因为前端 UI 在加载时，会向后端 API 查询服务器信息，其中就包括是否允许注册的标志。后端在响应这个查询时，会检查名为 `rest_register` 的 URL 是否存在。当我们注释掉 `urls.py` 中的代码后，后端找不到该 URL，便认为注册功能已禁用，从而告知前端不要显示注册链接。

1.  **修改 `cvat/apps/iam/urls.py` 文件**：
    找到以下这行代码：
    ```python
    path("register", RegisterViewEx.as_view(), name=BASIC_REGISTER_PATH_NAME),
    ```
    将其注释掉：
    ```python
    # path("register", RegisterViewEx.as_view(), name=BASIC_REGISTER_PATH_NAME),
    ```

2.  **重新构建并重启服务**：
    因为这是一个后端代码的修改，你需要重新构建 `cvat_server` 镜像并重启服务。
    ```bash
    # 重新构建
    docker compose -f ... build --no-cache cvat_server

    # 重启服务
    docker compose -f ... up -d
    ```
    完成后，访问注册页面将会返回 404 Not Found。

### 2. 安全地添加新用户

关闭公共注册后，你有以下两种推荐的方式来添加新用户：

#### 方式一：管理员手动创建 (最直接)

作为管理员，你可以登录到 CVAT 的后台管理界面来手动为新用户创建账号，然后将用户名和初始密码告诉他们。

1.  访问后台地址：`http://<你的服务器IP>:<端口>/admin`
2.  使用你创建的超级用户登录。
3.  在后台的 "Users" 部分，点击 "Add user"，然后填写信息即可。

#### 方式二：通过“组织(Organization)”功能发送邀请 (推荐)

这是 CVAT 设计的团队协作模式，也是最接近“邀请链接”的模式。

1.  **管理员创建一个“组织”**：在 CVAT 主界面中，你可以创建一个组织。
2.  **管理员邀请成员**：进入组织管理页面，点击“邀请成员”(Invite Members)。
3.  **发送邀请邮件**：在邀请框中输入新用户的邮箱地址。CVAT 会向这个邮箱发送一封包含专属邀请链接的邮件。
4.  **用户通过链接注册/加入**：用户点击邮件中的链接即可完成注册或加入组织。

#### **启用邀请功能的前提：配置邮件服务**

要让“组织邀请”能够正常发送邮件，你**必须**通过环境变量提供一个有效的 SMTP 邮件服务器配置。具体配置方法请参考本指南的“第 2 步: 理解并配置环境变量 (混合模式推荐)”章节。

## 后续步骤

基础环境搭建完成后, 您可能希望部署自定义的 AI 模型. 请参考:

*   **[../custom_ai_model/DEPLOY_CUSTOM_MODEL_GUIDE.md](../custom_ai_model/DEPLOY_CUSTOM_MODEL_GUIDE.md)**