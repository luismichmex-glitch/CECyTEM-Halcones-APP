import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Construyendo aplicación para producción...');
execSync('npm run build', { stdio: 'inherit' });

const distDir = path.resolve('dist');
fs.writeFileSync(path.join(distDir, '.nojekyll'), '\n');

console.log('Desplegando en la rama gh-pages de GitHub...');
const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();

process.chdir(distDir);
try {
  execSync('git init', { stdio: 'ignore' });
  execSync('git config user.name "luismichmex-glitch"', { stdio: 'ignore' });
  execSync('git config user.email "luismichmex@gmail.com"', { stdio: 'ignore' });
  execSync('git add -A', { stdio: 'ignore' });
  execSync('git commit -m "deploy: GitHub Pages build"', { stdio: 'ignore' });
  execSync(`git push -f "${remoteUrl}" HEAD:gh-pages`, { stdio: 'inherit' });
  console.log('¡Despliegue a GitHub Pages completado con éxito!');
} finally {
  process.chdir('..');
  fs.rmSync(path.join(distDir, '.git'), { recursive: true, force: true });
}
