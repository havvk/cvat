import json
import os
import re
import sys
from pathlib import Path

def replace_i18n_strings(target_string, replacements):
    """
    一个最终的、极其健壮的函数，用于替换国际化字符串 t(...)。
    - 能处理单行/多行 (`re.DOTALL`)
    - 能处理多种引号 (' " ` ‘...’)
    - 能处理 `t(key)` 和 `t(key, options)` 两种调用形式
    - 忽略 key 字符串内容前后的空格
    """
    replacements_dict = {item[0].strip(): item[1] for item in replacements}

    # 正则表达式的关键升级：
    # (\s*,.+?)? : 这是一个可选的非贪婪捕获组。
    # \s*,        : 匹配逗号和它前面的空格。
    # .+?         : 非贪婪地匹配后面的所有字符（即 options 对象）。
    # ?           : 使整个组成为可选的，从而同时兼容 t(key) 和 t(key, options)。
    pattern = re.compile(r"""\bt\(\s*(['"`])(.*?)\1(\s*,.+?)?\s*\)""", re.DOTALL)

    def replacer(match):
        # group(1): 引号字符, e.g., '
        # group(2): 旧的 key, e.g., '{{count}} annotating'
        # group(3): 可选的 options 参数, e.g., ', { count: numOfAnnotation }' or None
        quote_char = match.group(1)
        old_content = match.group(2)
        options_arg = match.group(3) or ""  # 如果没有 options，则为空字符串

        lookup_key = old_content.strip()

        if lookup_key in replacements_dict:
            new_key = replacements_dict[lookup_key]

            # 重新构建函数调用：
            # t('newKey' + options_arg + ')'
            # 我们统一使用单引号来净化代码库
            return f"t('{new_key}'{options_arg})"
        else:
            return match.group(0)

    return pattern.sub(replacer, target_string)

def run_refactoring():
    """
    Refactors i18n keys from a progress file, applying changes to specified source files
    and updating translation and progress files.
    """
    try:
        # --- 1. Initialization and Path Setup ---
        base_dir = Path(__file__).parent.resolve()
        progress_file_path = base_dir / 'i18n_progress.json'
        en_translation_path = base_dir / 'cvat-ui/public/locales/en-US/translation.json'
        zh_translation_path = base_dir / 'cvat-ui/public/locales/zh/translation.json'

        print("--- Refactoring I18n Keys ---")

        # --- 2. Load All Necessary Data ---
        print("Loading data files...")
        with open(progress_file_path, 'r', encoding='utf-8') as f:
            progress_data = json.load(f)
        with open(en_translation_path, 'r', encoding='utf-8') as f:
            en_data = json.load(f)
        with open(zh_translation_path, 'r', encoding='utf-8') as f:
            zh_data = json.load(f)

        # --- 3. Consolidate Keys and Files to Process ---
        camel_case_keys_section = progress_data.get('CamelCaseKeys', {})
        todo_keys = camel_case_keys_section.get('todo_keys', [])

        if not todo_keys:
            print("No keys found in 'todo_keys'. Nothing to process.")
            return

        print(f"Found {len(todo_keys)} keys to refactor.")
                # --- !!! 添加这行来进行最终调试 !!! ---
        print("DEBUG: Searching for 'Quick filters' in the loaded keys...")
        found_key = False
        for key_pair in todo_keys:
            if key_pair and key_pair[0] == 'Quick filters':
                print("DEBUG: SUCCESS! Found 'Quick filters' in todo_keys.")
                found_key = True
                break
        if not found_key:
            print("DEBUG: FAILED! 'Quick filters' was NOT found in the 328 loaded keys.")
            # 为了方便调试，可以取消下面这行的注释，它会打印出所有加载的键
            # print("DEBUG: All loaded keys are:", [item[0] for item in todo_keys])


        # Get the unique list of files to modify, as per user's request
        files_to_process = set()
        for component in ['Text', 'Tooltip','Button']:
            files = progress_data.get(component, {}).get('completed_files', [])
            files_to_process.update(files)

        if not files_to_process:
            print("Warning: No completed files found for Text and Tooltip components. Source code will not be modified.")

        print(f"Will process {len(files_to_process)} unique source files.")

        # --- !!! 添加这个最终的调试检查 !!! ---
        target_file_path = 'cvat-ui/src/components/resource-sorting-filtering/filtering.tsx'
        if target_file_path in files_to_process:
            print(f"DEBUG: SUCCESS! Target file '{target_file_path}' is in the processing list.")
        else:
            print(f"DEBUG: FAILED! Target file '{target_file_path}' was NOT found in the processing list.")

        # --- 4. Process Source Files ---
        total_replacements_in_files = 0
        for file_rel_path in sorted(list(files_to_process)):
            file_abs_path = base_dir / file_rel_path
            if not file_abs_path.exists():
                print(f"  - WARNING: File not found, skipping: {file_rel_path}")
                continue

            original_content = file_abs_path.read_text(encoding='utf-8')
            new_content = replace_i18n_strings(original_content, todo_keys)

            if original_content != new_content:
                print(f"  - Updating {file_rel_path}")
                file_abs_path.write_text(new_content, encoding='utf-8')
                total_replacements_in_files += 1

        print(f"Total files updated: {total_replacements_in_files}")

        # --- 5. Update Language Files ---
        print("Updating language files...")
        updated_lang_keys = 0
        key_map = {old: new for old, new in todo_keys}
        for old_key, new_key in key_map.items():
            if old_key in en_data:
                en_data[new_key] = en_data.pop(old_key)
                updated_lang_keys += 1
            if old_key in zh_data:
                zh_data[new_key] = zh_data.pop(old_key)

        print(f"Updated {updated_lang_keys} keys in language files.")

        with open(en_translation_path, 'w', encoding='utf-8') as f:
            json.dump(en_data, f, indent=4, ensure_ascii=False)
        with open(zh_translation_path, 'w', encoding='utf-8') as f:
            json.dump(zh_data, f, indent=4, ensure_ascii=False)

        # --- 6. Update Progress File ---
        print("Updating progress file...")
        completed_keys = camel_case_keys_section.get('completed_keys', [])
        completed_keys.extend(todo_keys)
        camel_case_keys_section['todo_keys'] = []
        camel_case_keys_section['completed_keys'] = completed_keys
        camel_case_keys_section.pop('long_keys_to_review', None) # Clean up old list

        with open(progress_file_path, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f, indent=2, ensure_ascii=False)

        print("--- Refactoring Complete ---")

    except FileNotFoundError as e:
        print(f"Error: Required file not found - {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Could not parse JSON file - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    run_refactoring()
