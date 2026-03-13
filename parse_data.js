const fs = require('fs');
const path = require('path');

function parseTxt() {
    const filePath = path.join(__dirname, '# 영어 핵심 동사 100 완벽 가이드 🇺🇸.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const data = [];
    let currentChapter = "";
    let currentVerbIntro = "";
    
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (!line) {
            i++;
            continue;
        }
        
        if (line.startsWith('## CHAPTER')) {
            currentChapter = line.replace('##', '').trim();
        } else if (line.startsWith('### **') && line.includes('기본 개념')) {
            const verbMatch = line.match(/\*\*(.*?)\s*—\s*기본 개념:\*\*/);
            let verbName = "";
            if (verbMatch) {
                verbName = verbMatch[1].trim();
            } else {
                verbName = line.replace('### **', '').split('—')[0].trim();
            }
            
            i++;
            const introText = [];
            while (i < lines.length && !lines[i].trim().startsWith('---') && !lines[i].trim().startsWith('**DAY')) {
                if (lines[i].trim()) introText.push(lines[i].trim());
                i++;
            }
            currentVerbIntro = introText.join(' ');
            continue;
            
        } else if (line.startsWith('**DAY')) {
            const dayMatch = line.match(/\*\*DAY\s+(\d+)\s+—\s+(.*?)\s*:\s*"(.*?)"\s*(?:\((.*?)\))?\*\*/);
            if (dayMatch) {
                const dayNum = parseInt(dayMatch[1], 10);
                const verbPhrase = dayMatch[2].trim();
                const koreanMeaning = dayMatch[3].trim();
                const englishMeaning = dayMatch[4] ? dayMatch[4].trim() : "";
                
                i++;
                // Skip empty lines after DAY
                while (i < lines.length && !lines[i].trim()) {
                    i++;
                }
                
                let quote = "";
                if (i < lines.length && lines[i].trim().startsWith('>')) {
                    quote = lines[i].trim().replace('>', '').replace(/\*/g, '').trim();
                    i++;
                }
                
                const explanation = [];
                while (i < lines.length && !lines[i].trim().startsWith('- ') && !lines[i].trim().startsWith('---')) {
                    if (lines[i].trim()) explanation.push(lines[i].trim().replace(/\*/g, ''));
                    i++;
                }
                
                const examples = [];
                while (i < lines.length && lines[i].trim().startsWith('- ')) {
                    examples.push(lines[i].trim().replace('- ', ''));
                    i++;
                }
                
                data.push({
                    day: dayNum,
                    chapter: currentChapter,
                    verb: verbPhrase.includes(' ') ? verbPhrase.split(' ')[0] : verbPhrase,
                    verb_full: verbPhrase.replace(/①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩|⑪|⑫|⑬/g, '').trim(),
                    korean_meaning: koreanMeaning,
                    english_meaning: englishMeaning,
                    quote: quote,
                    explanation: explanation.join(' '),
                    examples: examples
                });
                continue;
            }
        }
        i++;
    }
    
    const jsContent = `const vocabData = ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(path.join(__dirname, 'data.js'), jsContent, 'utf8');
    console.log(`Successfully parsed ${data.length} items to data.js`);
}

parseTxt();
