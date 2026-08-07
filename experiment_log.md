# CVAT 依赖问题排查实验记录

**目标:** 解决在 macOS Apple Silicon 平台上，CVAT 修改版（SAM2 特性）的 Python 库版本冲突问题，特别是围绕 `av`, `numpy`, 和 `cython`。

## 实验日期
2025-09-02

## 初始状态
- 项目代码已重置到初始状态。
- 遵循 `DEV_GUIDE_MacOS.md` 指南，但刻意跳过了部分配置文件修改步骤。

## 实验过程

### 步骤 1: 尝试在不修改版本锁定的情况下生成依赖

- **操作**: 用户尝试直接执行 `DEV_GUIDE_MacOS.md` 中的第三步，运行 `bash cvat/requirements/regenerate.sh` 来重新生成 `requirements.txt`。
- **意图**: 验证官方默认的依赖配置是否能直接在新环境中工作，尽量避免修改配置文件。
- **观察到的现象**: 命令执行失败。日志显示在处理 `av==9.2.0` 包时，发生 Cython 编译错误 (`Cython.Compiler.Errors.CompileError: av/logging.pyx`)。
- **分析**:
    - 错误信息 `Cannot assign type '''... except? 0 nogil''' to '''... noexcept nogil'''` 表明 `av==9.2.0` 的代码与当前环境的 Cython 编译器版本 (很可能是 v3.x) 不兼容。
    - 这验证了 `DEV_GUIDE_MacOS.md` 中锁定 `av` 版本的重要性。

### 步骤 2: 遵循指南，锁定 `av` 版本

- **操作**:
    1.  分析了错误日志，确认问题根源在于 `av` 版本。
    2.  读取 `utils/dataset_manifest/requirements.in` 文件，确认了其中指定的版本为 `av==9.2.0`。
    3.  根据 `DEV_GUIDE_MacOS.md` 的建议，将该文件中的 `av==9.2.0` 修改为 `av==10.0.0`。
- **发现**:
    - 之前的尝试失败，恰恰是因为跳过了指南中“锁定关键包版本”这一关键步骤。
    - 直接使用未修改的配置文件是行不通的，因为该修改版 CVAT 的依赖需求已经发生了变化。

## 下一步计划
- 重新运行 `bash cvat/requirements/regenerate.sh`，验证 `av` 版本修正后是否能成功生成依赖。
- 继续按照 `DEV_GUIDE_MacOS.md` 的步骤进行，并记录每一步的观察和发现。
### 步骤 3: 解决 `av` 版本冲突

- **操作**: 再次运行 `bash cvat/requirements/regenerate.sh`。
- **观察到的现象**: 命令再次失败，但错误信息变为 `Requirements conflict: SpecifierRequirement('''av==10.0.0'''), SpecifierRequirement('''av==9.2.0''')`。
- **分析**:
    - 这表明 `pip-tools` 从不同的 `.in` 文件中读取到了两个相互冲突的 `av` 版本要求。
    - 我们在 `utils/dataset_manifest/requirements.in` 中指定了 `10.0.0`，但项目中存在另一个文件要求 `9.2.0`。
- **定位冲突源**:
    - 使用 `search_file_content` 在所有 `*.in` 文件中搜索 `av==`。
    - 发现 `cvat/requirements/base.in` 文件中也存在 `av==9.2.0` 的硬编码。
- **解决**:
    - 将 `cvat/requirements/base.in` 文件中的 `av==9.2.0` 也修改为 `av==10.0.0`，以统一版本要求。

### 步骤 4: 解决 `numpy` 版本冲突

- **操作**: 第三次运行 `bash cvat/requirements/regenerate.sh`。
- **观察到的现象**: 命令失败，提示 `numpy` 版本冲突。日志显示 `opencv-python-headless` の最新版要求 `numpy>=2`，而 `datumaro` 等包要求 `numpy<2`。
- **分析**:
    - 这验证了 `DEV_GUIDE_MacOS.md` 中关于 `numpy` v1/v2 兼容性问题的警告。
    - 根本原因在于用户之前跳过了指南的第四步“修正项目配置文件”，没有对 `cvat-sdk` 的 `numpy` 依赖进行版本限制。
- **解决**:
    1.  **遵循指南**: 使用 `DEV_GUIDE_MacOS.md` 中提供的完整内容，替换 `cvat-sdk/pyproject.toml` 文件。这为 `cvat-sdk[masks]` 依赖项增加了 `numpy<2,>=1.22` 的明确约束。
    2.  **主动防御**: 为防止 `pip-tools` 自动选择与 `numpy<2` 不兼容的 `opencv` 版本，在 `utils/dataset_manifest/requirements.in` 中添加了 `<4.12` 的版本上限。

### 步骤 5: 解除 `numpy` 的过度约束

- **操作**: 第四次运行 `bash cvat/requirements/regenerate.sh`。
- **观察到的现象**: 仍然是 `numpy` 版本冲突。但这次的冲突更为具体：`opencv-python-headless==4.11.0.86` 要求 `numpy>=1.23.5`，而另一个依赖要求 `numpy~=1.22.2`。
- **分析**:
    - 我们之前对 `opencv-python-headless` 的版本限制 (`<4.12`) 生效了，使其版本从 `4.12.0.88` 回退到了 `4.11.0.86`。
    - 然而，`4.11.0.86` 在 Python 3.11 上依然有较高的 `numpy` 版本要求 (`>=1.23.5`)。
    - 同时，项目中存在一个过于严格的 `numpy` 版本约束 `~=1.22.2`，它阻止了版本解析器选择 `1.23.5` 或更高版本。
- **定位与解决**:
    - 经搜索，在 `cvat/requirements/base.in` 文件中找到了 `numpy~=1.22.2` 这个过于严格的约束。
    - 为了解决冲突，遵循“最小约束”原则，将其放宽为 `numpy>=1.22,<2`。这个范围既满足了 `opencv` 的要求，也确保了与 `numpy` v1 生态的兼容性。

### 步骤 6: 成功生成依赖文件

- **操作**: 第五次运行 `bash cvat/requirements/regenerate.sh`。
- **观察到的现象**: 命令执行成功！所有的 `requirements.txt` 文件都已成功生成。
- **分析**:
    - 通过逐一解决 `av` 和 `numpy` 的版本冲突，我们终于为 `pip-tools` 提供了一套一致且可解析的依赖约束。
    - 这证明了之前的分析是正确的：问题的根源在于多个配置文件中对同一个库存在相互冲突的、过于严格的版本要求。通过遵循指南并采用“最小约束”原则，我们解决了这个死锁。

### 步骤 7: 解决 `pip install` 阶段的版本冲突

- **操作**: 运行 `pip install ...` 命令安装所有依赖。
- **观察到的现象**: `pip` 报错，提示 `Cannot install av==10.0.0 and av==12.0.0`。
- **分析**:
    - `pip install -r file1.txt -r file2.txt ...` 命令会尝试合并解决所有文件中的依赖。
    - 尽管我们通过 `pip-tools` 统一了核心依赖，但安装命令中包含的 `tests/python/requirements.txt` 文件包含了与我们选择的 `av==10.0.0` 不一致的版本 `av==12.0.0`。
- **定位与解决**:
    - 搜索所有 `*.txt` 文件，发现 `tests/python/requirements.txt` 中硬编码了 `av==12.0.0`。
    - 为了保持整个项目的一致性，将该文件中的版本也修改为 `av==10.0.0`。

### 步骤 8: 解决 `requests` 版本冲突

- **操作**: 再次运行 `pip install ...` 命令。
- **观察到的现象**: `pip` 报错，提示 `Cannot install requests==2.32.4 and requests==2.32.5`。
- **分析**:
    - 与 `av` 的问题相同，这是由于 `pip install` 命令中包含的多个 `requirements.txt` 文件包含了不一致的 `requests` 版本。
- **定位与解决**:
    - 搜索所有 `*.txt` 文件，发现 `tests/perf/requirements.txt` 和 `tests/python/requirements.txt` 中硬编码了 `requests==2.32.4`，而核心依赖要求 `requests==2.32.5`。
    - 为了保持一致性，将这两个测试依赖文件中的版本也修改为 `2.32.5`。

### 步骤 9: 解决 `boto3` 版本冲突

- **操作**: 再次运行 `pip install ...` 命令。
- **观察到的现象**: `pip` 报错，提示 `Cannot install boto3==1.35.95 and boto3==1.40.21`。
- **分析**:
    - 与之前的问题模式相同，`tests/python/requirements.txt` 文件包含了与其他核心依赖不一致的 `boto3` 版本。
- **定位与解决**:
    - 搜索发现 `tests/python/requirements.txt` 中硬编码了 `boto3==1.35.95`。
    - 为了保持一致性，将其版本修改为 `boto3==1.40.21`。

### 步骤 10: 解决 `Pillow` 版本冲突

- **操作**: 再次运行 `pip install ...` 命令。
- **观察到的现象**: `pip` 报错，提示 `Cannot install Pillow==10.3.0 and pillow==11.3.0`。
- **分析**:
    - 与之前的问题模式完全相同，`imtests/python/requirements.txt` 和 `utils/dicom_converter/requirements.txt` 文件包含了与其他核心依赖不一致的 `Pillow` 版本。
- **定位与解决**:
    - 搜索所有 `*.txt` 文件，发现上述两个文件硬编码了 `Pillow==10.3.0`，而其他文件要求 `pillow==11.3.0`。
    - 为了保持一致性，将这两个文件中的版本也修改为 `11.3.0`。

### 步骤 11: 解决 `python-dateutil` 版本冲突

- **操作**: 再次运行 `pip install ...` 命令。
- **观察到的现象**: `pip` 报错，提示 `Cannot install python-dateutil==2.8.2 and python-dateutil==2.9.0.post0`。
- **分析**:
    - `tests/python/requirements.txt` 文件再次包含了与其他核心依赖不一致的版本。
- **定位与解决**:
    - 搜索发现 `tests/python/requirements.txt` 中硬编码了 `python-dateutil==2.8.2`。
    - 为了保持一致性，将其版本修改为 `python-dateutil==2.9.0.post0`。

### 步骤 12: 最终解决 `numpy` v1/v2 冲突

- **操作**: 再次运行 `pip install ...` 命令。
- **观察到的现象**: `pip` 报错，提示 `Cannot install numpy==1.26.4 and numpy==2.0.0`。
- **分析**:
    - `numpy` v1/v2 的终极冲突在 `pip install` 阶段再次出现。
    - 尽管我们已经通过 `pip-tools` 和修改配置文件在多个层面上限制了 `numpy<2`，但在 `pip` 进行最终依赖解析时，它仍然找到了一个需要 `numpy==2.0.0` 的依赖路径。这可能是某个包的子依赖，或者是从 PyTorch 的 extra index 中引入的。
- **解决**:
    - 采用“全局约束”的策略，在 `pip install` 命令的最前面直接加入 `numpy<2` 的要求。

### 步骤 13: 定位 `numpy==2.0.0` 的来源

- **操作**: 在 `pip install` 命令前添加 `"numpy<2"` 全局约束。
- **观察到的现象**: 依然报错，`pip` 同时看到了 `<2`, `==1.26.4`, `==2.0.0` 三个互相矛盾的 `numpy` 版本要求。
- **分析**:
    - 用户猜测冲突源头是 `./cvat-sdk[masks,pytorch]`。这个猜测非常合理。
    - 尽管我们修改了 `cvat-sdk/pyproject.toml`，但 `[pytorch]` extra 从 `--extra-index-url` 引入的某个包（`torch`, `torchvision`, `scikit-image`）可能带有一个极高优先级的 `numpy==2.0.0` 依赖。
- **实验**:
    - 为了隔离问题，我们尝试从安装命令中暂时移除 `[pytorch]` extra，只保留 `[masks]`。

### 步骤 14: 进一步隔离 `numpy==2.0.0` 的来源

- **操作**: 移除 `[pytorch]` extra 后再次运行 `pip install`。
- **观察到的现象**: 依然报出 `numpy==2.0.0` 的冲突。
- **分析**:
    - 这个惊人的结果排除了 `[pytorch]` extra（即 `torch`, `torchvision` 等）是冲突源的可能性。
    - 嫌疑范围缩小到两个：`./cvat-cli` 包，或者 `--extra-index-url` 本身的行为。`pip` 可能在 PyTorch 的索引中为某个其他依赖找到了需要 `numpy==2.0.0` 的版本。
- **实验**:
    - 为了最终确认问题是否出在 PyTorch 索引上，我们进行下一个实验：在移除 `[pytorch]` extra 的基础上，**同时移除 `--extra-index-url`** 参数。
    - 如果 `numpy==2.0.0` 的冲突消失，则证明是该索引的锅。

### 步骤 15: 发现并修正最终的根源

- **操作**: 在用户的坚持下，再次搜索 `numpy==2.0.0` 这个精确字符串。
- **观察到的现象**: 搜索结果在 `tests/python/requirements.txt` 文件中找到了 `numpy==2.0.0`。
- **分析**:
    - **真正的根源被发现**。我们之前在处理 `boto3`, `Pillow` 等库时，多次修改了 `tests/python/requirements.txt` 文件，但完全忽略了其中 `numpy` 的版本声明。这导致了后续所有关于 `numpy` 的冲突和复杂的排查过程。之前的隔离实验（移除 `[pytorch]` extra 和 `--extra-index-url`）虽然帮助我们排除了其他嫌疑，但也因为这个根本性的错误而未能成功。
- **解决**:
    - 将 `tests/python/requirements.txt` 中的 `numpy==2.0.0` 修改为与其他文件一致的 `numpy==1.26.4`。

### 步骤 16: 清理最后的 `psutil` 版本冲突

- **操作**: 再次运行 `pip install ...` 命令。
- **观察到的现象**: `pip` 报错，提示 `Cannot install psutil==5.9.4 and psutil==5.9.8`。
- **分析**:
    - 这是 `tests` 目录下手动维护的 `requirements.txt` 文件与 `pip-tools` 生成的核心依赖文件之间的又一个版本不一致。
- **定位与解决**:
    - 搜索发现 `tests/perf/requirements.txt` 中硬编码了 `psutil==5.9.8`，而核心依赖 `base.txt` 要求 `psutil==5.9.4`。
    - 为了与核心依赖保持一致，将 `tests/perf/requirements.txt` 中的版本也修改为 `5.9.4`。
    - 如果命令成功，则证明 `numpy==2.0.0` 的依赖关系是由 `pytorch` extra 引入的。
    - 这个操作会强制 `pip` 的解析器在任何情况下都必须遵守 `numpy` 版本低于 2 的规则，从而阻止它选择 `2.0.0` 版本。

### 步骤 17: 解决 `pyyaml` 版本冲突

- **操作**: 再次运行 `pip install ...` 命令。
- **观察到的现象**: `pip` 报错，提示 `Cannot install pyyaml==6.0.1 and pyyaml==6.0.2`。
- **分析**:
    - 这是 `tests` 目录下手动维护的 `requirements.txt` 文件与 `pip-tools` 生成的核心依赖文件之间的又一个版本不一致。
- **定位与解决**:
    - 使用 `search_file_content` 搜索所有 `*requirements*.txt` 文件中的 `pyyaml`。
    - 发现 `cvat/requirements/base.txt` 和 `tests/python/requirements.txt` 要求 `pyyaml==6.0.2`，而 `tests/perf/requirements.txt` 要求 `pyyaml==6.0.1`。
    - 核心依赖版本为 `6.0.2`，因此将 `tests/perf/requirements.txt` 中的版本从 `6.0.1` 修改为 `6.0.2`，以达成统一。

### 步骤 18: 解决 `pytest` 版本冲突

- **操作**: 用户手动执行 `pip install` 命令并报告了 `pytest` 版本冲突。
- **观察到的现象**: `pip` 报错，提示 `Cannot install pytest==6.2.5 and pytest==8.3.0`。
- **分析**:
    - 搜索发现冲突源于 `tests/python/requirements.txt` (要求 `6.2.5`) 和 `tests/perf/requirements.txt` (要求 `8.3.0`)。
    - 经查证，`tests/python/requirements.txt` 中的 `allure-pytest==2.14.2` 与 `pytest` 的较新版本兼容。
- **解决**:
    - 为了统一到较新版本，将 `tests/python/requirements.txt` 中的 `pytest==6.2.5` 修改为 `pytest==8.3.0`。

### 步骤 19: 解决 `attrs` 版本冲突

- **操作**: 用户手动执行 `pip install` 命令并报告了 `attrs` 版本冲突。
- **观察到的现象**: `pip` 报错，提示 `cvat-cli` 依赖的 `attrs>=24.2.0` 与固定的 `attrs==21.4.0` 冲突。
- **分析**:
    - 经排查, `cvat-cli` 的依赖 `attrs>=24.2.0` 在 `cvat-cli/requirements/base.txt` 中定义。
    - 而 `cvat/requirements/base.in` 文件将 `attrs` 的版本固定为 `21.4.0`，导致冲突。
- **解决**:
    - 修改 `cvat/requirements/base.in`，将 `attrs` 的版本约束从 `==21.4.0` 放宽至 `>=24.2.0`。
- **策略调整说明**: 从步骤 7 至 18，依赖冲突通过直接修改 `*.txt` 文件解决。本次 `attrs` 冲突，根源为子包 `cvat-cli` 的依赖项 (`attrs>=24.2.0`) 与 `cvat/requirements/base.in` 中固定的版本 (`attrs==21.4.0`) 存在根本矛盾。为从源头解决问题，本次调整解决策略：不再直接修改 `*.txt` 文件，而是修改 `.in` 文件，并重新运行依赖生成脚本。这是自步骤 7 以来，首次需要执行 `bash cvat/requirements/regenerate.sh`。
- **下一步**: 需要运行 `bash cvat/requirements/regenerate.sh` 重新生成 `requirements.txt` 文件以应用此更改。

### 步骤 20: 解决 `pip install` 阶段的 `OSError` (Operation timed out)

- **初始操作**:
    - 用户成功执行 `bash cvat/requirements/regenerate.sh`。
    - 用户再次执行 `pip install ...` 命令。
- **观察到的现象**:
    - `pip` 在尝试卸载旧版本的 `deepdiff` 包时失败，报错为 `OSError: [Errno 60] Operation timed out`。
    - 错误路径显示项目位于 OneDrive 同步目录中。
- **初步分析与尝试**:
    - 初步判断问题由 OneDrive 客户端同步时锁定文件导致，但用户反馈当时客户端并未运行。
- **最终解决方案与分析**:
    - 用户**启动了 OneDrive 客户端**后，再次运行 `pip install` 命令，**安装成功**。
    - **结论分析**: 错误根源并非客户端锁定文件，而是 macOS 的“文件按需”(Files On-Demand)机制所致。在 OneDrive 客户端未运行时，项目目录中的文件可能处于“存根”状态。当 `pip` 尝试操作这些存根文件时，文件系统需要与 OneDrive 后台服务通信以下载或确认文件状态，但由于客户端未运行，通信超时，导致 `OSError`。启动客户端后，文件系统可以正常处理这些请求，因此安装得以成功。
- **下一步**: 所有依赖已成功安装。可以继续 `DEV_GUIDE_MacOS.md` 中的后续步骤。

### 步骤 21: 安装 JavaScript 依赖

- **操作**: 用户按照 `DEV_GUIDE_MacOS.md` 指引，执行 `corepack enable` 和 `yarn install`。
- **观察到的现象**: 命令成功执行，无错误报告。
- **结论**: 项目所需的前端依赖已成功安装。

### 步骤 22: 生成 SDK 客户端代码

- **操作**: 用户按照 `DEV_GUIDE_MacOS.md` 指引，执行 `bash cvat-sdk/gen/generate.sh`。
- **观察到的现象**: 命令成功执行，无错误报告。
- **结论**: SDK 客户端代码已成功生成。

### 步骤 23: 遵循指南修正 Docker Compose 文件

- **背景**: 用户指出，在运行测试前，需完成 `DEV_GUIDE_MacOS.md` 第四步第二节中对 Docker Compose 文件的修正，否则后续测试会因容器名不匹配而失败。
- **操作**: 检查指导中的 5 个 `docker-compose.*.yml` 文件，并注释掉其中的 `container_name` 指令。
- **结果**:
    - `docker-compose.yml`: 成功注释掉 18 个 `container_name` 指令。
    - `components/serverless/docker-compose.serverless.yml`: 成功注释掉 1 个 `container_name` 指令。
    - 其余 3 个文件无需修改。
- **结论**: 完成了运行测试前必要的文件修正。

### 步骤 24: 配置 Pytest 以支持 Django

- **操作**: 用户在执行 `pytest` 时遇到 `ImproperlyConfigured` 错误，并正确地指出需要为 Pytest 配置 Django 支持。
- **分析**: 错误是由于 `pytest` 未能加载 Django 应用的设置导致的。
- **解决**: 遵循开发指南，在项目根目录的 `pyproject.toml` 文件中添加了 `[tool.pytest.ini_options]` 配置，指定了 `DJANGO_SETTINGS_MODULE`。
- **下一步**: 重新运行 `pytest` 命令。

### 步骤 25: 修正测试清理脚本以避免 `dropdb` 错误

- **操作**: 用户运行 `pytest -x`，测试会话结束后报错 `dropdb: error: database "test_db" does not exist`。
- **分析**: 该错误来自 `pytest_sessionfinish` 清理钩子，因 `dropdb` 命令在数据库不存在时会失败。此问题已在 `DEV_GUIDE_MacOS.md` 中预见。
- **解决**: 遵循开发指南，修改 `tests/python/shared/fixtures/init.py` 文件，为 `dropdb test_db` 命令增加了 `--if-exists` 参数。
- **下一步**: 再次运行 `pytest` 命令。

### 步骤 26: 修复后台任务测试，强制同步执行

- **背景**: 再次运行测试后，遇到新的失败 `AssertionError: 'queued' == 'finished'`。
- **分析**: 该错误是由于测试代码没有等待后台 RQ 任务执行完毕，是典型的异步测试问题。`DEV_GUIDE_MacOS.md` 的附录 B 中描述了此问题及解决方案。

### 步骤 27: 深入分析 `queued` == `finished` 失败

- **背景**: 即使应用了 `DEV_GUIDE_MacOS.md` 中强制同步的方案，`TaskExportTest.test_can_make_abs_frame_id_from_known` 测试依然失败。用户指出此方案可能无效，建议查看容器日志。
- **操作**:
    1.  检查 `docker ps`，确认 `rqworker` 相关的容器是 `test_cvat_worker_import_1`。
    2.  使用 `docker logs test_cvat_worker_import_1` 查看该容器的日志。
- **观察到的现象**:
    - `worker` 容器日志中出现大量 `cvat.apps.engine.models.Task.DoesNotExist` 错误。
    - 同时，还出现了 `psycopg2.OperationalError: FATAL: database "cvat" does not exist` 错误。
- **分析**:
    - **发现根本原因**: `worker` 容器没有加载 `pytest` 使用的测试配置文件 (`cvat.settings.testing`)，而是加载了默认的开发配置文件。
    - **推论**: 这导致了两个核心问题：
        1.  **数据库不匹配**: `pytest` 进程在 `testing.py` 指定的数据库（应为 `test_db`）中创建了 `Task` 对象，而 `worker` 容器却去查询默认配置的 `cvat` 数据库，因此永远找不到对应的 `Task`。
        2.  **配置隔离**: `testing.py` 中用于模拟同步执行和伪 Redis 的 `PatchedDiscoverRunner` 补丁只在 `pytest` 进程中生效，无法影响到在另一个独立容器中运行的 `worker` 进程。
- **结论**: 之前所有针对“同步执行”的修复都只是治标不治本。问题的根源在于测试环境的配置没有被所有相关服务（特别是 `worker` 容器）完全共享。

### 步骤 28: 统一测试环境配置

- **目标**: 确保所有参与测试的服务都使用同一套测试配置和同一个测试数据库。
- **操作**:
    1.  **修改 `docker-compose.dev.yml`**: 为所有 `cvat_worker_*` 服务和 `cvat_server` 服务添加 `DJANGO_SETTINGS_MODULE: cvat.settings.testing` 环境变量。这强制所有容器在开发/测试模式下都加载测试配置文件。
    2.  **修正 `cvat/settings/testing.py`**: 将该文件中的 `DATABASES` 配置从 SQLite 修改为 PostgreSQL，并指向 `test_db` 数据库，与 `DEV_GUIDE_MacOS.md` 中的测试数据库设置保持一致。
    3.  **撤销临时修复**: 恢复之前对 `cvat/apps/dataset_manager/tests/test_formats.py` 文件的修改，移除冗余的 `@override_settings` 装饰器。
- **预期结果**:
    - 所有服务都将连接到正确的 `test_db` 数据库。
    - 所有服务都将继承 `testing.py` 中的设置，包括 `PatchedDiscoverRunner` 带来的 RQ 队列同步执行和 `fakeredis` 补丁，从而从根本上解决事务隔离和数据可见性问题。
- **下一步**: 重启 Docker 容器以应用新配置，然后重新运行 `pytest`。
### 步骤 29: 解决 Docker 构建过程中的 Python 版本问题

- **背景**: 在执行 `docker-compose ... up --build` 命令时，镜像构建失败。
- **观察到的现象**: 日志显示 `ERROR: No matching distribution found for contourpy==1.3.3`，因为该版本需要 Python >= 3.11，而 Docker 构建环境中的 Python 版本过低。
- **分析**:
    - 该问题与 `DEV_GUIDE_MacOS.md` 附录A中描述的“Docker 环境 Python 版本不一致”问题完全一致。
    - `Dockerfile` 的 `build-image-base` 阶段使用的是 `ubuntu:22.04` 默认的 `python3.10`，导致无法安装需要 Python 3.11 的依赖。
- **解决**:
    - **采纳 `DEV_GUIDE_MacOS.md` 的方案**: 修改 `Dockerfile`，在 `build-image-base` 阶段的 `apt-get install` 命令中增加了 `python3.11-dev` 和 `python3.11-venv`，并使用 `update-alternatives` 将 `python3.11` 设置为默认的 `python3`。
- **策略讨论**:
    - `DEV_GUIDE_MacOS.md` 中还提到了修改 `FFMPEG` 版本。
    - **用户决策**: 用户指示暂时不要修改 `FFMPEG` 版本，因为怀疑它可能是之前失败的原因之一，希望先只应用最直接的修复。
- **下一步**: 使用仅修改了 Python 版本的 `Dockerfile` 重新运行 `docker-compose ... up --build` 命令。
### 步骤 30: 解决 Docker 最终镜像中的 Python 版本问题

- **背景**: 修复了 `build-image-base` 阶段的 Python 版本后，再次执行 `docker-compose ... up --build`，构建在最终阶段失败。
- **观察到的现象**: 日志显示 `ERROR: PyYAML-6.0.2-cp311-cp311-manylinux_2_17_aarch64.manylinux2014_aarch64.whl is not a supported wheel on this platform.`
- **分析**:
    - **发现新的不一致**: `.whl` 文件是在 `build-image-base` 阶段由 Python 3.11 (`cp311`) 构建的。然而，`Dockerfile` 的最终镜像阶段在安装这些 `.whl` 文件时，使用的仍然是 `ubuntu:22.04` 默认的 Python 3.10 环境。
    - **结论**: `pip` (Python 3.10) 无法安装为 Python 3.11 构建的 wheel 包，导致 "not a supported wheel" 错误。必须在整个 `Dockerfile` 的所有阶段统一使用 Python 3.11。
- **解决**:
    - **统一最终镜像的 Python 版本**: 修改 `Dockerfile` 的最终镜像构建阶段，将其 `apt-get install` 命令中的 `python3`, `python3-venv`, `libpython3.10` 替换为 `python3.11`, `python3.11-venv`, `libpython3.11`，并同样使用 `update-alternatives` 将 `python3.11` 设为默认。
- **下一步**: 再次运行 `docker-compose ... up --build` 命令。

### 步骤 31: 修复 django_extensions 模块缺失问题

- **背景**: `docker-compose up` 构建成功后, `test_cvat_server_1` 容器反复重启。
- **观察到的现象**: `docker logs test_cvat_server_1` 显示 `ModuleNotFoundError: No module named 'django_extensions'`。
- **分析**:
    - `django_extensions` 在 `cvat/settings/development.py` 中被添加，但 Docker 构建时默认使用 `cvat/requirements/production.txt`，其中不包含此依赖。
    - `docker-compose.dev.yml` 文件用于开发环境，但没有向 Docker build 过程传递正确的构建参数以使用 `development` 配置。
- **解决**:
    - 修改 `docker-compose.dev.yml` 文件，在 `cvat_server` 服务的 `build` 配置中，增加 `args: CVAT_CONFIGURATION: development`。
    - 这确保了在构建开发镜像时，会使用 `cvat/requirements/development.txt`，从而将 `django-extensions` 安装到容器中。

### 步骤 32: 修复 async_timeout 模块缺失问题 (初次尝试)

- **背景**: 修正 `django_extensions` 问题后，`test_cvat_server_1` 容器依然启动失败。
- **观察到的现象**: `docker logs test_cvat_server_1` 显示 `ModuleNotFoundError: No module named 'async_timeout'`。
- **分析**:
    - 错误日志显示，`redis` 库的异步功能 (`redis.asyncio`) 依赖 `async_timeout` 包。
    - 初步判断是 `pip-tools` 未能正确解析 `redis` 的 `[async]` 附加依赖。
- **解决 (尝试一)**:
    - 修改 `cvat/requirements/base.in` 文件，将 `redis==4.6.0` 更改为 `redis[async]==4.6.0`，期望 `pip-tools` 能自动包含子依赖。
- **结果**: 用户反馈，即使在重新生成依赖并强制重新构建镜像后，问题依旧存在。这证明了 `redis[async]` 方案的失败。

### 步骤 33: 重新评估并最终修复 async_timeout 问题

- **背景**: 之前的两种方案（修正构建参数和使用 `redis[async]`) 均未解决 `async_timeout` 模块的缺失问题。
- **重新评估**:
    1.  用户澄清 `DEV_GUIDE_MacOS.md` 并非官方或可靠指南，因此不应盲从。
    2.  用户指出了我之前 `write_file` 操作的严重错误（会清空文件），这提示我必须采用更安全的“读取-附加-写回”模式。
    3.  综合来看，最可靠的方案是放弃依赖解析的“自动挡”，采用“手动挡”——即在 `base.in` 中被直接、显式地声明 `async-timeout`。
- **最终解决方案**:
    1.  将 `cvat/requirements/base.in` 中的 `redis[async]==4.6.0` 还原为 `redis==4.6.0`。
    2.  在该文件中明确添加一行 `async-timeout==4.0.3`。选择 `4.0.3` 版本是基于对 `redis==4.6.0` 库的依赖分析，这是其要求的最低兼容版本，能确保最大稳定性。
    3.  采用安全的文件操作方式，成功将该行添加至 `base.in` 文件末尾。
- **下一步**: 等待用户执行 `bash cvat/requirements/regenerate.sh` 和 `docker-compose ... up --build` 命令，以验证此最终方案的有效性。

### 步骤 34: 解决数据库不存在的问题

- **背景**: 解决了所有 Python 模块缺失问题后，`cvat_server` 容器启动时再次失败。
- **观察到的现象**: 日志显示 `django.db.utils.OperationalError: FATAL: database "test_db" does not exist`。
- **分析**:
    - 应用层已修复，但环境配置存在不匹配。
    - `cvat_server` 根据 `cvat.settings.testing` 的配置，尝试连接名为 `test_db` 的数据库。
    - 但 `cvat_db` 容器根据默认配置，创建的数据库名为 `cvat`。
- **解决**:
    - 修改 `docker-compose.dev.yml` 文件，为 `cvat_db` 服务明确指定一个环境变量 `POSTGRES_DB: test_db`。
    - 这会强制 `postgres` 容器在初始化时创建名为 `test_db` 的数据库，从而与 Django 的测试配置保持一致。
- **下一步**: 需要彻底移除旧的数据库卷并重启整个环境，以确保新的数据库名生效。

### 步骤 35: 解决 uvicorn 模块缺失问题

- **背景**: 数据库连接成功，Django 的数据库迁移也顺利完成后，`cvat_server` 容器中的 `supervisord` 进程在尝试启动 `uvicorn` 时失败。
- **观察到的现象**: 日志显示 `/opt/venv/bin/python3: No module named uvicorn`。
- **分析**: 与之前的 `django-extensions` 问题类似，`uvicorn` 作为一个必要的 Web 服务器，被包含在了生产环境的依赖中，却被遗漏在了开发环境的依赖 (`cvat/requirements/development.in`) 中。
- **解决**:
    - 修改 `cvat/requirements/development.in` 文件，在其中添加一行 `uvicorn`。
- **下一步**: 需要重新运行 `bash cvat/requirements/regenerate.sh` 和 `docker-compose ... up --build` 命令。

### 步骤 36: 解决 Nginx 日志权限问题

- **背景**: 在 `uvicorn` 模块缺失问题解决后，服务基本能运行，但用户在日志中发现了一个关于 `nginx` 的权限告警。
- **观察到的现象**: 日志显示 `nginx: [alert] could not open error log file: open() "/var/log/nginx/error.log" failed (13: Permission denied)`。
- **分析**:
    - 这是典型的容器内文件权限问题。`nginx` 进程以一个非 root 用户运行，但它试图写入的日志文件/目录归 `root` 所有。
    - 尽管这不是一个阻塞性错误，但它会导致 `nginx` 的错误日志丢失，给后续调试带来困难。
- **解决**:
    - 遵循 Docker 的最佳实践，不修改目录权限，而是将 `nginx` 的日志输出重定向到标准输出流。
    - 修改 `cvat/nginx.conf` 文件，将 `error_log` 和 `access_log` 指令的路径分别改为 `/dev/stderr` 和 `/dev/stdout`。
- **下一步**: 需要重新构建镜像以使 `nginx.conf` 的修改生效。

### 步骤 37: 服务成功启动

- **背景**: 完成了对 `uvicorn` 依赖和 `nginx` 日志的修复后，重新构建并启动服务。
- **观察到的现象**: 
    1.  `uvicorn` 成功启动并开始处理请求，日志显示 `INFO: Uvicorn running on socket /tmp/uvicorn.sock`。
    2.  Django 数据库迁移全部成功应用。
    3.  `nginx` 的 `Permission denied` 告警依然存在，但 `nginx` 进程本身成功进入 `RUNNING` 状态，并且其访问日志已按预期输出到 `docker logs` 中。
- **分析**:
    - **核心服务已成功运行！** `uvicorn` 和 `django` 的正常启动是本次调试的主要胜利。
    - `nginx` 的告警是一个非阻塞性的启动问题。它在尝试访问默认日志路径失败后，正确地采纳了我们修改后的配置（输出到标准流）。因此，该告警可以安全地忽略。
- **结论**: 开发和测试环境的核心服务已经全部正常运行。我们已经为执行 `pytest` 测试做好了准备。
