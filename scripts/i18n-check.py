import os
import re
import json

def find_i18n_keys(src_dir):
    """遍历源代码目录，找出所有使用 t('xxx') 或 t("xxx") 调用的 key"""
    pattern = r"t\(['\"]([^'\"]+)['\"]\)"
    keys = set()
    
    for root, dirs, files in os.walk(src_dir):
        for filename in files:
            if filename.endswith('.js') or filename.endswith('.jsx'):
                filepath = os.path.join(root, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = re.findall(pattern, content)
                        for match in matches:
                            if is_valid_i18n_key(match):
                                keys.add(match)
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
    
    return sorted(list(keys))

def is_valid_i18n_key(key):
    """判断是否为有效的 i18n key"""
    if not key:
        return False
    
    if len(key) < 3:
        return False
    
    if not re.match(r'^[A-Z_]+\.[A-Z_]+', key):
        return False
    
    invalid_patterns = [
        r'\.', r'\\n', r'\s', r'\-', r'\/', r'\{', r'\}',
        'button', 'input', 'script', 'settings', 'link', 'span', 'div', 'svg', 'td',
        'codemirror', 'lodash', 'moment', 'dayjs', 'zod', 'dotenv',
        'inherit', 'custom', 'key', 'something', 'cancelled',
        'echo json', 'npm install', 'collection.bru', 'my-request.bru'
    ]
    
    for pattern in invalid_patterns:
        if pattern in key.lower():
            return False
    
    return True

def load_translation(filepath):
    """加载翻译文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return {}

def get_all_keys_from_dict(d, parent_key=''):
    """递归获取字典中所有的键，格式为 PARENT.CHILD"""
    keys = []
    for k, v in d.items():
        new_key = f"{parent_key}.{k}" if parent_key else k
        if isinstance(v, dict):
            keys.extend(get_all_keys_from_dict(v, new_key))
        else:
            keys.append(new_key)
    return keys

def add_missing_keys(translation_dict, missing_keys):
    """向翻译字典中添加缺失的键"""
    for key in missing_keys:
        parts = key.split('.')
        current = translation_dict
        
        for i, part in enumerate(parts):
            if part not in current:
                if i == len(parts) - 1:
                    current[part] = key.split('.')[-1].replace('_', ' ')
                else:
                    current[part] = {}
            current = current[part]

def main():
    src_dir = os.path.join(os.path.dirname(__file__), '..', 'packages', 'bruno-app', 'src')
    zh_file = os.path.join(src_dir, 'i18n', 'translation', 'zh.json')
    en_file = os.path.join(src_dir, 'i18n', 'translation', 'en.json')
    
    print("=" * 60)
    print("i18n Key Checker")
    print("=" * 60)
    
    print("\n1. 正在检索源代码中的 i18n key...")
    code_keys = find_i18n_keys(src_dir)
    print(f"   找到 {len(code_keys)} 个 unique key")
    
    print("\n2. 正在加载翻译文件...")
    zh_trans = load_translation(zh_file)
    en_trans = load_translation(en_file)
    
    zh_keys = get_all_keys_from_dict(zh_trans)
    en_keys = get_all_keys_from_dict(en_trans)
    
    print(f"   zh.json 中有 {len(zh_keys)} 个 key")
    print(f"   en.json 中有 {len(en_keys)} 个 key")
    
    print("\n3. 正在比对缺失的 key...")
    
    missing_in_zh = sorted([k for k in code_keys if k not in zh_keys])
    print(f"\n   在 zh.json 中缺失的 key ({len(missing_in_zh)} 个):")
    if missing_in_zh:
        for k in missing_in_zh:
            print(f"     - {k}")
    else:
        print("     无缺失")
    
    missing_in_en = sorted([k for k in code_keys if k not in en_keys])
    print(f"\n   在 en.json 中缺失的 key ({len(missing_in_en)} 个):")
    if missing_in_en:
        for k in missing_in_en:
            print(f"     - {k}")
    else:
        print("     无缺失")
    
    unused_in_zh = sorted([k for k in zh_keys if k not in code_keys])
    unused_in_en = sorted([k for k in en_keys if k not in code_keys])
    
    print(f"\n4. 可选：未使用的 key（可能已废弃）")
    print(f"   zh.json 中未使用的 key ({len(unused_in_zh)} 个):")
    if len(unused_in_zh) > 0:
        for k in unused_in_zh[:10]:
            print(f"     - {k}")
        if len(unused_in_zh) > 10:
            print(f"     ... 还有 {len(unused_in_zh) - 10} 个")
    else:
        print("     无")
    
    print(f"\n   en.json 中未使用的 key ({len(unused_in_en)} 个):")
    if len(unused_in_en) > 0:
        for k in unused_in_en[:10]:
            print(f"     - {k}")
        if len(unused_in_en) > 10:
            print(f"     ... 还有 {len(unused_in_en) - 10} 个")
    else:
        print("     无")
    
    if missing_in_zh or missing_in_en:
        print("\n5. 正在自动补充缺失的 key...")
        
        if missing_in_zh:
            add_missing_keys(zh_trans, missing_in_zh)
            with open(zh_file, 'w', encoding='utf-8') as f:
                json.dump(zh_trans, f, ensure_ascii=False, indent=4)
            print(f"   zh.json 已补充 {len(missing_in_zh)} 个 key")
        
        if missing_in_en:
            add_missing_keys(en_trans, missing_in_en)
            with open(en_file, 'w', encoding='utf-8') as f:
                json.dump(en_trans, f, ensure_ascii=False, indent=4)
            print(f"   en.json 已补充 {len(missing_in_en)} 个 key")
        
        print("\n补充完成！请手动更新中文翻译内容。")
    
    print("\n" + "=" * 60)
    print("检查完成")
    print("=" * 60)

if __name__ == '__main__':
    main()