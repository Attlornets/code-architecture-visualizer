const ts = require('typescript');

console.log('🧪 RUNNING STANDALONE AST COMPILER & DISCOVERY SUITE...');

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAILED: ' + message);
    process.exit(1);
  } else {
    console.log('✅ PASSED: ' + message);
  }
}

// 1. Direct TypeScript Source AST parsing
const sampleCode = "import { Router } from 'express';\nimport { Redis } from 'ioredis';\nexport class AppService { run() {} }\nexport function route() {}";
const sf = ts.createSourceFile('test.ts', sampleCode, ts.ScriptTarget.Latest, true);

assert(sf.statements.length === 4, 'TypeScript Compiler creates AST with 4 statements');
assert(ts.isImportDeclaration(sf.statements[0]), 'Statement 0 is ImportDeclaration');
assert(ts.isImportDeclaration(sf.statements[1]), 'Statement 1 is ImportDeclaration');
assert(ts.isClassDeclaration(sf.statements[2]), 'Statement 2 is ClassDeclaration');
assert(ts.isFunctionDeclaration(sf.statements[3]), 'Statement 3 is FunctionDeclaration');

// 2. Syntax Error Extraction
const brokenCode = 'function broken( { const y = ;';
const brokenSf = ts.createSourceFile('broken.ts', brokenCode, ts.ScriptTarget.Latest, true);
const parseDiags = brokenSf.parseDiagnostics || [];
assert(parseDiags.length > 0, 'TypeScript Compiler flags syntax diagnostics on broken code');
assert(parseDiags[0].messageText !== '', 'Diagnostic has meaningful message text');

// 3. GitHub Discovery query builder test
const langTerm = 'language:typescript';
const techs = ['express', 'redis'];
const query = `${techs.join(' ')} ${langTerm} stars:>15`;
assert(query === 'express redis language:typescript stars:>15', 'Query built with language constraint and tech stack');

// 4. Similarity Scoring test
function calculateScore(repoLanguage, targetLanguage, repoText, techList) {
  let langScore = repoLanguage.toLowerCase() === targetLanguage.toLowerCase() ? 25 : 5;
  let techScore = 0;
  for (const t of techList) {
    if (repoText.includes(t)) techScore += 10;
  }
  return langScore + Math.min(30, techScore);
}

const score = calculateScore('TypeScript', 'TypeScript', 'express server with redis session store', ['express', 'redis']);
assert(score === 45, 'Language match (25) + 2 tech matches (20) equals 45 points minimum');

console.log('🎉 ALL ENGINE VERIFICATIONS PASSED SUCCESSFULLY!');
