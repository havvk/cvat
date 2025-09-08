
import json
import os
import re
import sys

def to_camel_case(text):
    # 移除大部分特殊字符，但保留字母、数字和空格
    s = re.sub(r'[^a-zA-Z0-9\s]', '', text).strip()
    if not s:
        return ""
    parts = s.split()
    # 将第一个单词小写，其余单词首字母大写
    return parts[0].lower() + ''.join(word.capitalize() for word in parts[1:])

def run_refactoring():
    # 定义文件和目录的绝对路径
    base_dir = os.path.dirname(os.path.abspath(__file__))
    progress_file_path = os.path.join(base_dir, 'i18n_progress.json')
    en_translation_path = os.path.join(base_dir, 'cvat-ui/public/locales/en-US/translation.json')
    zh_translation_path = os.path.join(base_dir, 'cvat-ui/public/locales/zh/translation.json')
    search_directory = os.path.join(base_dir, 'cvat-ui/src')

    # 检查所有文件路径是否存在
    for path in [progress_file_path, en_translation_path, zh_translation_path, search_directory]:
        if not os.path.exists(path):
            print(f"错误：路径不存在 - {path}")
            sys.exit(1)

    # 读取国际化进度文件
    try:
        with open(progress_file_path, 'r', encoding='utf-8') as f:
            progress_data = json.load(f)
    except Exception as e:
        print(f"错误：无法读取或解析 {progress_file_path}: {e}")
        sys.exit(1)


    # 确保 CamelCaseKeys 部分存在
    if 'CamelCaseKeys' not in progress_data:
        progress_data['CamelCaseKeys'] = {'todo_keys': [], 'completed_keys': []}

    todo_keys = progress_data['CamelCaseKeys'].get('todo_keys', [])
    completed_keys = progress_data['CamelCaseKeys'].get('completed_keys', [])

    if not todo_keys:
        print("没有在 todo_keys 中找到需要处理的键。")
        return

    # 读取语言文件
    try:
        with open(en_translation_path, 'r', encoding='utf-8') as f:
            en_data = json.load(f)
        with open(zh_translation_path, 'r', encoding='utf-8') as f:
            zh_data = json.load(f)
    except Exception as e:
        print(f"错误：无法读取语言文件: {e}")
        sys.exit(1)


    # 遍历待办列表中的键
    for key in list(todo_keys):
        # 只处理包含空格的键
        if ' ' in key:
            new_key = to_camel_case(key)
            if not new_key or new_key == key:
                continue

            print(f"正在处理键: '{key}' -> '{new_key}'")

            # 1. 在 .tsx 文件中搜索并替换
            for root, _, files in os.walk(search_directory):
                for file in files:
                    if file.endswith('.tsx'):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f_read:
                                content = f_read.read()

                            # 使用正则表达式精确匹配 t('key') 或 t("key")
                            # 以避免错误地替换出现在其他地方的子字符串
                            # Pattern explanation:
                            # t\(          # Matches "t(" literally
                            # ['"]        # Matches a single or double quote
                            # {re.escape(key)} # Matches the literal key, escaping any special regex characters in it
                            # ['"]        # Matches the closing single or double quote
                            # \)           # Matches the closing parenthesis
                            pattern = f"(?<!\w)t\(['\"]{re.escape(key)}['\"]\)"
                            new_content = re.sub(pattern, f"t('{new_key}')", content)

                            if new_content != content:
                                print(f"  - 正在更新文件: {file_path}")
                                with open(file_path, 'w', encoding='utf-8') as f_write:
                                    f_write.write(new_content)
                        except Exception as e:
                            print(f"  - 处理文件时出错 {file_path}: {e}")

            # 2. 更新语言文件
            if key in en_data:
                en_data[new_key] = en_data.pop(key)
            if key in zh_data:
                zh_data[new_key] = zh_data.pop(key)

            # 3. 更新进度文件
            if key in todo_keys:
                todo_keys.remove(key)
            if new_key not in completed_keys:
                completed_keys.append(key)

    # 写回更新后的数据
    progress_data['CamelCaseKeys']['todo_keys'] = todo_keys
    progress_data['CamelCaseKeys']['completed_keys'] = completed_keys

    try:
        with open(progress_file_path, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f, indent=2, ensure_ascii=False)
        with open(en_translation_path, 'w', encoding='utf-8') as f:
            json.dump(en_data, f, indent=4, ensure_ascii=False)
        with open(zh_translation_path, 'w', encoding='utf-8') as f:
            json.dump(zh_data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"错误：写入文件失败: {e}")
        sys.exit(1)

    print("所有键处理完毕。")

if __name__ == '__main__':
    run_refactoring()
