import json
import os
import re
import sys

def is_valid_key(key):
    """Applies a set of heuristics to determine if a string is a valid i18n key."""
    # Rule 1: Length must be greater than 2
    if len(key) <= 2:
        return False
    # Rule 2: Must not contain invalid characters often found in bad regex matches
    if any(c in key for c in '{(./:;,'):
        return False
    # Rule 3: Must contain at least one letter
    if not any(c.isalpha() for c in key):
        return False
    return True

def run_verification():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    progress_file_path = os.path.join(base_dir, 'i18n_progress.json')
    en_translation_path = os.path.join(base_dir, 'cvat-ui/public/locales/en-US/translation.json')
    zh_translation_path = os.path.join(base_dir, 'cvat-ui/public/locales/zh/translation.json')

    for path in [progress_file_path, en_translation_path, zh_translation_path]:
        if not os.path.exists(path):
            print(f"错误：关键文件不存在 - {path}")
            sys.exit(1)

    try:
        with open(progress_file_path, 'r', encoding='utf-8') as f:
            progress_data = json.load(f)
        with open(en_translation_path, 'r', encoding='utf-8') as f:
            en_data = json.load(f)
        with open(zh_translation_path, 'r', encoding='utf-8') as f:
            zh_data = json.load(f)
    except Exception as e:
        print(f"错误：无法读取或解析JSON文件: {e}")
        sys.exit(1)

    # Use the language files as the source of truth for valid keys
    valid_en_keys = set(en_data.keys())
    valid_zh_keys = set(zh_data.keys())

    components_to_verify = ['Text', 'Tooltip']
    all_errors = False

    for component_name in components_to_verify:
        if component_name not in progress_data:
            print(f"警告：在 i18n_progress.json 中未找到组件 '{component_name}'，跳过检查。")
            continue

        component_data = progress_data[component_name]
        files_to_check = component_data.get('completed_files', [])
        verification_errors = []

        print(f"--- 正在检查组件: {component_name} ---")

        for file_rel_path in files_to_check:
            file_abs_path = os.path.join(base_dir, file_rel_path)
            if not os.path.exists(file_abs_path):
                error_msg = f"文件未找到: {file_rel_path}"
                print(f"  - {error_msg}")
                verification_errors.append({"file": file_rel_path, "key": None, "error": error_msg})
                all_errors = True
                continue

            try:
                with open(file_abs_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                keys_in_file = re.findall(r"[^\w]t\(['\"](.*?)['\"]\)", content)

                for key in keys_in_file:
                    key = key.strip()
                    if not is_valid_key(key):
                        continue

                    # Check against the keys from translation files
                    if key not in valid_en_keys:
                        error_msg = f"键 '{key}' 在英文语言文件中不存在。"
                        print(f"  - 错误 (文件: {file_rel_path}): {error_msg}")
                        verification_errors.append({"file": file_rel_path, "key": key, "error": error_msg})
                        all_errors = True
                    if key not in valid_zh_keys:
                        error_msg = f"键 '{key}' 在中文语言文件中不存在。"
                        print(f"  - 错误 (文件: {file_rel_path}): {error_msg}")
                        verification_errors.append({"file": file_rel_path, "key": key, "error": error_msg})
                        all_errors = True

            except Exception as e:
                error_msg = f"处理文件时出错: {e}"
                print(f"  - {error_msg}")
                verification_errors.append({"file": file_rel_path, "key": None, "error": error_msg})
                all_errors = True

        component_data['verification_errors'] = verification_errors
        if not verification_errors:
            component_data['verification_status'] = 'passed'
            print(f"组件 '{component_name}' 检查通过，未发现错误。")
        else:
            component_data['verification_status'] = 'failed'
            print(f"组件 '{component_name}' 检查发现错误。详情请查看 i18n_progress.json。")

    try:
        with open(progress_file_path, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"错误：写入进度文件失败: {e}")
        sys.exit(1)

    print("\n--- 验证完成 ---")
    if not all_errors:
        print("所有指定组件均未发现问题。")
    else:
        print("在部分组件中发现了问题，请检查 i18n_progress.json 文件获取详细的错误报告。")

if __name__ == '__main__':
    run_verification()
