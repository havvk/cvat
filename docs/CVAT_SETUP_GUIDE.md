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

### 第 2 步: 配置环境变量 (`.env` 文件)

CVAT 的核心配置在 `.env` 文件中. 请根据您的需求创建此文件.

```bash
# 切换到 cvat 目录
cd /app/cvat

# 创建 .env 文件
cat <<EOF > .env
# CVAT_HOST 必须是您访问 CVAT 时使用的主要主机名 (域名或IP).
# 注意: 这里只能填写一个值!
CVAT_HOST=<your_primary_hostname>

# ALLOWED_HOSTS 是一个用逗号分隔的列表, 包含所有允许访问此服务的域名/IP.
# 为了同时支持内网、外网和内部服务间通信, 推荐使用以下格式.
ALLOWED_HOSTS=<your_external_domain>,<your_lan_ip>,localhost,cvat-server

# 如果需要, 请配置您的代理服务器
# HTTP_PROXY=http://127.0.0.1:8118
# HTTPS_PROXY=http://127.0.0.1:8118
EOF
```

**配置示例:**

*   **场景**: 主要通过外网域名 `home.havvk.cc` 访问, 服务器的局域网 IP 是 `192.168.8.6`.
*   **配置**: 
    ```
    CVAT_HOST=home.havvk.cc
    ALLOWED_HOSTS=home.havvk.cc,192.168.8.6,localhost,cvat-server
    ```

#### 可选配置: 设置默认界面语言

CVAT 支持多语言界面。您可以为整个实例设置一个全局的默认语言。

在 `.env` 文件中加入以下配置：
```
# 设置默认语言为简体中文
LANGUAGE_CODE=zh-Hans
```
*   `zh-Hans` 代表简体中文。
*   `zh-Hant` 代表繁体中文。
*   默认值为 `en-us` (美式英语)。

设置后，新用户或未指定语言偏好的用户，将默认看到中文界面。

### 第 3 步: 启动 CVAT 服务

```bash
# 注意: 如果您使用了 docker-compose.override.yml, 请确保在命令中包含它
docker compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml up -d --build
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

## 后续步骤

基础环境搭建完成后, 您可能希望部署自定义的 AI 模型. 请参考:

*   **[../custom_ai_model/DEPLOY_CUSTOM_MODEL_GUIDE.md](../custom_ai_model/DEPLOY_CUSTOM_MODEL_GUIDE.md)**