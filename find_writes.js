const fs = require('fs');

const logPath = 'C:\\Users\\rinal\\.gemini\\antigravity\\brain\\903979fe-7657-4403-a7dd-fa81a66ea9b7\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 426 && obj.tool_calls) {
      for (const tc of obj.tool_calls) {
        if (tc.name === 'write_to_file') {
          console.log(`Found step 426 write_to_file to target: ${tc.args.TargetFile}`);
          fs.writeFileSync('C:\\Users\\rinal\\.gemini\\antigravity\\brain\\903979fe-7657-4403-a7dd-fa81a66ea9b7\\scratch\\step_426_code.jsx', JSON.parse(tc.args.CodeContent));
          console.log('Saved to step_426_code.jsx');
        }
      }
    }
  } catch (e) {
    console.error('Error parsing line:', e.message);
  }
}
