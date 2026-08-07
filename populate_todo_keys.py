import json
import os

# 定义文件路径
# 假设脚本在 cvat 项目的根目录下运行
TRANSLATION_FILE = os.path.join('cvat-ui', 'public', 'locales', 'en-US', 'translation.json')
PROGRESS_FILE = 'i18n_progress.json'

def populate_todo_keys():
    """
    从 translation.json 读取键，并将它们添加到 i18n_progress.json 的
    todo_keys 中（如果它们尚不存在）。
    """
    try:
        # 读取源翻译文件
        with open(TRANSLATION_FILE, 'r', encoding='utf-8') as f:
            translations = json.load(f)

        # 读取目标进度文件
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            progress_data = json.load(f)

        # 确保目标结构存在
        if 'CamelCaseKeys' not in progress_data:
            progress_data['CamelCaseKeys'] = {}
        if 'todo_keys' not in progress_data['CamelCaseKeys']:
            progress_data['CamelCaseKeys']['todo_keys'] = []

        # 为高效查找，创建已存在键的集合
        # 键是 [value, key] 对中的第二个元素
        existing_keys = {item[1] for item in progress_data['CamelCaseKeys'].get('todo_keys', [])}
        existing_keys.update({item[1] for item in progress_data['CamelCaseKeys'].get('completed_keys', [])})
        existing_keys.update({item[1] for item in progress_data['CamelCaseKeys'].get('pending_keys', [])})

        new_items_added = 0
        # 遍历翻译并添加缺失的条目
        for key, value in translations.items():
            if key not in existing_keys:
                # 跳过只包含空白字符的 value
                if not value or value.isspace():
                    continue
                progress_data['CamelCaseKeys']['todo_keys'].append([value, key])
                existing_keys.add(key)  # 添加到集合以防止在同一次运行中产生重复
                new_items_added += 1

        if new_items_added > 0:
            # 将更新后的数据写回进度文件
            with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
                json.dump(progress_data, f, ensure_ascii=False, indent=2)
            print(f"成功！添加了 {new_items_added} 个新的键值对到 'CamelCaseKeys.todo_keys'。")
        else:
            print("没有新的键需要添加，'todo_keys' 列表已是最新。")

    except FileNotFoundError as e:
        print(f"错误：找不到文件 {e.filename}。请确保脚本在正确的目录下运行。")
    except json.JSONDecodeError as e:
        print(f"错误：解析JSON文件时出错 - {e}")
    except Exception as e:
        print(f"发生未知错误: {e}")

if __name__ == "__main__":
    populate_todo_keys()
