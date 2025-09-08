import json
import re

MAX_KEY_LENGTH = 30

def to_camel_case(text):
    s = re.sub(r'[^a-zA-Z0-9\s]', '', text).strip()
    if not s:
        return ""
    parts = s.split()
    return parts[0].lower() + ''.join(word.capitalize() for word in parts[1:])

def generate_new_keys():
    progress_file_path = '/Users/l.ylive.cn/Library/CloudStorage/OneDrive-个人/cvat/i18n_progress.json'

    with open(progress_file_path, 'r', encoding='utf-8') as f:
        progress_data = json.load(f)

    camel_case_data = progress_data.get('CamelCaseKeys', {})
    todo_keys = camel_case_data.get('todo_keys', [])
    pending_keys = camel_case_data.get('pending_keys', [])
    long_keys_to_review = camel_case_data.get('long_keys_to_review', [])

    existing_new_keys = {item[1] for item in todo_keys}

    for old_key in pending_keys:
        new_key = to_camel_case(old_key)
        if not new_key:
            new_key = 'key' # fallback for empty keys
        
        # Ensure uniqueness
        original_new_key = new_key
        count = 1
        while new_key in existing_new_keys:
            new_key = f'{original_new_key}{count}'
            count += 1
        
        existing_new_keys.add(new_key)

        if len(new_key) > MAX_KEY_LENGTH:
            long_keys_to_review.append([old_key, new_key])
        else:
            todo_keys.append([old_key, new_key])

    camel_case_data['todo_keys'] = todo_keys
    camel_case_data['pending_keys'] = []
    camel_case_data['long_keys_to_review'] = long_keys_to_review

    with open(progress_file_path, 'w', encoding='utf-8') as f:
        json.dump(progress_data, f, indent=2, ensure_ascii=False)

    print("Successfully generated new keys and updated i18n_progress.json")
    print(f"{len(long_keys_to_review)} keys are too long and have been added to 'long_keys_to_review' for manual review.")

if __name__ == '__main__':
    generate_new_keys()