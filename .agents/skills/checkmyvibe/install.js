#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Source paths in the npm package
const srcSkill = path.join(__dirname, 'SKILL.md');
const srcScripts = path.join(__dirname, 'scripts');
const srcReferences = path.join(__dirname, 'references');
const srcCommands = path.join(__dirname, 'commands');
const srcAdapters = path.join(__dirname, 'adapters');

// Destination selection
const cwd = process.cwd();
const hasLocalClaude = fs.existsSync(path.join(cwd, '.claude'));

const localSkillDest = path.join(cwd, '.claude', 'skills', 'checkmyvibe');
const localCommandsDest = path.join(cwd, '.claude', 'commands');

const globalSkillDest = path.join(os.homedir(), '.claude', 'skills', 'checkmyvibe');
const globalCommandsDest = path.join(os.homedir(), '.claude', 'commands');

function copyRecursiveSync(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((child) => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function installHarnessAdapters() {
  const installed = [];

  try {
    // Cursor rule -> .cursor/rules/
    const cursorRulesDir = path.join(cwd, '.cursor', 'rules');
    const mdcSrc = path.join(srcAdapters, 'checkmyvibe.mdc');
    if (fs.existsSync(path.join(cwd, '.cursor')) && fs.existsSync(mdcSrc)) {
      fs.mkdirSync(cursorRulesDir, { recursive: true });
      fs.copyFileSync(mdcSrc, path.join(cursorRulesDir, 'checkmyvibe.mdc'));
      installed.push(`Cursor rule        -> ${path.relative(cwd, path.join(cursorRulesDir, 'checkmyvibe.mdc'))}`);
    }

    // opencode command -> .opencode/command/
    const opencodeCmdDir = path.join(cwd, '.opencode', 'command');
    const ocSrc = path.join(srcAdapters, 'opencode-checkmyvibe.md');
    if (fs.existsSync(path.join(cwd, '.opencode')) && fs.existsSync(ocSrc)) {
      fs.mkdirSync(opencodeCmdDir, { recursive: true });
      fs.copyFileSync(ocSrc, path.join(opencodeCmdDir, 'checkmyvibe.md'));
      installed.push(`opencode command   -> ${path.relative(cwd, path.join(opencodeCmdDir, 'checkmyvibe.md'))}`);
    }

    // AGENTS.md -> append discovery snippet if not already present
    const agentsPath = path.join(cwd, 'AGENTS.md');
    const snippetSrc = path.join(srcAdapters, 'AGENTS-SNIPPET.md');
    if (fs.existsSync(agentsPath) && fs.existsSync(snippetSrc)) {
      let agentsContent = fs.readFileSync(agentsPath, 'utf8');
      if (!agentsContent.includes('## checkmyvibe')) {
        const snippet = fs.readFileSync(snippetSrc, 'utf8');
        const snippetBody = snippet.split(/^---$/m).pop().trim();
        agentsContent = agentsContent.trimEnd() + '\n\n' + snippetBody + '\n';
        fs.writeFileSync(agentsPath, agentsContent);
        installed.push('AGENTS.md          -> appended checkmyvibe section');
      }
    }
  } catch (err) {
    console.log(`  (adapter installation skipped: ${err.message})`);
  }

  return installed;
}

function performInstall(skillDest, commandsDest) {
  try {
    console.log(`\nInstalling checkmyvibe skill to: ${skillDest}...`);
    
    // Clear skill destination if it already exists (overwrite mode)
    if (fs.existsSync(skillDest)) {
      if (fs.rmSync) {
        fs.rmSync(skillDest, { recursive: true, force: true });
      } else {
        fs.rmdirSync(skillDest, { recursive: true });
      }
    }
    fs.mkdirSync(skillDest, { recursive: true });

    // Copy SKILL.md
    fs.copyFileSync(srcSkill, path.join(skillDest, 'SKILL.md'));
    
    // Copy folders into skill destination
    copyRecursiveSync(srcScripts, path.join(skillDest, 'scripts'));
    copyRecursiveSync(srcReferences, path.join(skillDest, 'references'));
    if (fs.existsSync(srcCommands)) {
      copyRecursiveSync(srcCommands, path.join(skillDest, 'commands'));
    }

    // Install slash commands into agent commands directory
    if (fs.existsSync(srcCommands)) {
      console.log(`Installing slash commands to: ${commandsDest}...`);
      fs.mkdirSync(commandsDest, { recursive: true });
      fs.readdirSync(srcCommands).forEach((cmdFile) => {
        if (cmdFile.endsWith('.md')) {
          fs.copyFileSync(path.join(srcCommands, cmdFile), path.join(commandsDest, cmdFile));
        }
      });
    }

    // Copy adapters into the skill folder so they ship with the skill itself
    if (fs.existsSync(srcAdapters)) {
      copyRecursiveSync(srcAdapters, path.join(skillDest, 'adapters'));
    }

    // Detect other agent harnesses in this project and install their adapters
    const adapters = installHarnessAdapters();

    console.log('\n=========================================');
    console.log('🎉 checkmyvibe Agent Skill & Commands installed!');
    console.log('=========================================');
    console.log('\nHow to run checkmyvibe:');
    console.log('• Full Audit:');
    console.log('  /checkmyvibe  or  "run checkmyvibe"');
    console.log('\n• Focused / Scoped Scans:');
    console.log('  /checkmyvibe secrets   (or /checkmyvibe-secrets)   -> Exposed secrets & .gitignore');
    console.log('  /checkmyvibe auth      (or /checkmyvibe-auth)      -> Authentication checks');
    console.log('  /checkmyvibe db        (or /checkmyvibe-db)        -> Database & BaaS rules / RLS');
    console.log('  /checkmyvibe backend   (or /checkmyvibe-backend)   -> Server-side (auth, db, IDOR, input, payment)');
    console.log('  /checkmyvibe frontend  (or /checkmyvibe-frontend)  -> Client-side (bundle leaks, client auth, pricing)');
    console.log('  /checkmyvibe payment   (or /checkmyvibe-payment)   -> Payment & pricing integrity');
    console.log('=========================================');
    if (adapters.length > 0) {
      console.log('\nOther agent harnesses detected — adapters installed:');
      adapters.forEach((line) => console.log(`  ${line}`));
    }
    console.log('\nUsing Codex, Gemini CLI, Cursor, or another AGENTS.md-based agent?');
    console.log(`Paste the snippet from ${path.join(skillDest, 'adapters', 'AGENTS-SNIPPET.md')} into your AGENTS.md.`);
    console.log('=========================================\n');
  } catch (err) {
    console.error('Error installing skill:', err.message);
    process.exit(1);
  }
}

if (hasLocalClaude) {
  // If .claude folder exists in the project root, install at project level directly
  performInstall(localSkillDest, localCommandsDest);
} else {
  // Prompt user for local vs global/personal installation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('No local .claude/ directory detected in the current working directory.');
  console.log(`1. Install locally to current directory: ${path.join('.claude', 'skills', 'checkmyvibe')} & ${path.join('.claude', 'commands')}`);
  console.log(`2. Install globally/personally: ${globalSkillDest.replace(os.homedir(), '~')} & ${globalCommandsDest.replace(os.homedir(), '~')}`);
  
  rl.question('\nSelect installation destination (1 or 2, default 2): ', (answer) => {
    rl.close();
    const selection = answer.trim();
    if (selection === '1') {
      performInstall(localSkillDest, localCommandsDest);
    } else {
      performInstall(globalSkillDest, globalCommandsDest);
    }
  });
}
