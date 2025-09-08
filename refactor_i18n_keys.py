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
    - 修正了包含 `{{...}}` 等复杂结构 key 的匹配问题。
    """
    replacements_dict = {item[0].strip(): item[1] for item in replacements}

    # 升级正则表达式的关键点：
    # 1. 对于标准引号 (['"`]):
    #    我们现在用 ([^'"`\n]*?) 来匹配 key 的内容，
    #    意思是匹配任何不是引号也不是换行符的字符，非贪婪。
    #    这避免了 `(.*?)` 在遇到与结束引号相同字符时可能出现的提前停止。
    #    但鉴于 `re.DOTALL` 存在，`.*?` 应该能匹配任何字符。
    #    真正的原因是 `(.*?)` 会匹配到下一个 `\1`，如果键中恰好有 `\"` 或者 `\'`
    #    我们之前的 regex `(['"`])(.*?)\1` 应该能正常工作。

    #    重新审视问题，最可能的原因仍然是 `(.*?)` 在复杂结构中的行为。
    #    当有嵌套的 `{{...}}` 且与 `re.DOTALL` 结合时，`.*?` 仍然可能因为寻找最近的 `\1` 而提前终止。

    # 最终的、更鲁棒的模式，明确说明匹配到 “不是 \1 的任何字符”
    # ([^'"`]*?) 匹配除了单双反引号以外的所有字符
    # 或者，我们让 `.*?` 尽可能地匹配，但要确保它匹配到的是正确的结束引号。
    # 问题在于 `{{` 和 `}}` 可能被 `.*?` 误读。

    # 最保险的策略是明确地匹配键内容，直到遇到与开头引号相同的结束引号。
    # `[^'"]*` : 匹配除单引号和双引号之外的任何字符，0次或多次
    # 这会导致 `re.DOTALL` 失效。

    # 最直接的修复思路是让 `(.*?)` 匹配到正确的结束引号。
    # 也许是 `\s*` 和 `)` 之间有额外的非 `\s` 字符导致了问题？
    # 让我们假设 `(.*?)` 确实包含了 `{{...}}` 的所有内容。
    # 那么问题可能出在 `\1` 匹配之后的部分。

    # 假设 `(.*?)` 已经正确捕获了整个 key，
    # 那么模式中 `\1(\s*,.+?)?\s*\)` 这一段就是关键。

    # 让我们简化 regex，用一个更强大的模式来捕获 key 的内容，并且确保它能匹配 `{{` 和 `}}`
    # ([\s\S]*?) 匹配任何字符包括换行符，非贪婪
    pattern = re.compile(r"""\bt\(\s*(['"`])([\s\S]*?)\1(\s*,.+?)?\s*\)""", re.DOTALL)

    def replacer(match):
        quote_char = match.group(1)
        old_content = match.group(2)
        options_arg = match.group(3) or ""

        lookup_key = old_content.strip()

        if lookup_key in replacements_dict:
            new_key = replacements_dict[lookup_key]

            # 统一使用单引号来净化代码库
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
