import json
import re

def parse_txt():
    # File uses UTF-8 or maybe EUC-KR, let's try UTF-8
    filepath = "c:\\Users\\HP\\.gemini\\antigravity\\영어공부앱\\# 영어 핵심 동사 100 완벽 가이드 🇺🇸.txt"
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        with open(filepath, 'r', encoding='cp949') as f:
            lines = f.readlines()

    data = []
    
    current_chapter = ""
    current_verb_intro = ""
    current_day = None
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
            
        # Match Chapter
        if line.startswith("## CHAPTER"):
            current_chapter = line.replace("##", "").strip()
            
        # Match Verb intro: ### **HAVE — 기본 개념:**
        elif line.startswith("### **") and "기본 개념" in line:
            verb_match = re.search(r'\*\*(.*?)\s*—\s*기본 개념:\*\*', line)
            if verb_match:
                verb_name = verb_match.group(1).strip()
            else:
                verb_name = line.replace("### **", "").split("—")[0].strip()
            
            # Read explanation
            i += 1
            intro_text = []
            while i < len(lines) and not lines[i].strip().startswith("---") and not lines[i].strip().startswith("**DAY"):
                if lines[i].strip():
                    intro_text.append(lines[i].strip())
                i += 1
            current_verb_intro = " ".join(intro_text)
            continue
            
        # Match Day: **DAY 1 — HAVE ① : "소유하다 / 가지고 있다" (possession)**
        elif line.startswith("**DAY"):
            day_match = re.search(r'\*\*DAY\s+(\d+)\s+—\s+(.*?)\s*:\s*"(.*?)"\s*(?:\((.*?)\))?\*\*', line)
            if day_match:
                day_num = int(day_match.group(1))
                verb_phrase = day_match.group(2).strip()
                korean_meaning = day_match.group(3).strip()
                english_meaning = day_match.group(4).strip() if day_match.group(4) else ""
                
                # Next is usually the quote
                i += 1
                quote = ""
                if i < len(lines) and lines[i].strip().startswith(">"):
                    quote = lines[i].strip().replace(">", "").strip().replace("*", "")
                    i += 1
                
                # Next is explanation
                explanation = []
                while i < len(lines) and not lines[i].strip().startswith("- ") and not lines[i].strip().startswith("---"):
                    if lines[i].strip():
                        explanation.append(lines[i].strip().replace("*", ""))
                    i += 1
                
                # Next are bullet points (examples)
                examples = []
                while i < len(lines) and lines[i].strip().startswith("- "):
                    examples.append(lines[i].strip().replace("- ", ""))
                    i += 1
                    
                data.append({
                    "day": day_num,
                    "chapter": current_chapter,
                    "verb": verb_phrase.split(" ")[0] if " " in verb_phrase else verb_phrase, # strip numerals
                    "verb_full": verb_phrase,
                    "korean_meaning": korean_meaning,
                    "english_meaning": english_meaning,
                    "quote": quote,
                    "explanation": " ".join(explanation),
                    "examples": examples
                })
                continue
        i += 1
        
    js_content = f"const vocabData = {json.dumps(data, ensure_ascii=False, indent=2)};\n"
    with open("c:\\Users\\HP\\.gemini\\antigravity\\영어공부앱\\data.js", 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"Successfully parsed {len(data)} items to data.js")

if __name__ == "__main__":
    parse_txt()
