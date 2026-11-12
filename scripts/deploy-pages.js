import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Construyendo aplicación para producción...');
execSync('npm run build', { stdio: 'inherit' });

const distDir = path.resolve('dist');
fs.writeFileSync(path.join(distDir, '.nojekyll'), '\n');

const gitBin = fs.existsSync('C:\\Users\\Lab. SGTI\\Documents\\Halcones_app\\.toolchain\\mingit\\cmd\\git.exe')
  ? '"C:\\Users\\Lab. SGTI\\Documents\\Halcones_app\\.toolchain\\mingit\\cmd\\git.exe"'
  : 'git';

console.log('Desplegando en la rama gh-pages de GitHub...');
const remoteUrl = execSync(`${gitBin} config --get remote.origin.url`, { encoding: 'utf-8' }).trim();

process.chdir(distDir);
try {
  execSync(`${gitBin} init`, { stdio: 'ignore' });
  execSync(`${gitBin} config user.name "luismichmex-glitch"`, { stdio: 'ignore' });
  execSync(`${gitBin} config user.email "luismichmex@gmail.com"`, { stdio: 'ignore' });
  execSync(`${gitBin} add -A`, { stdio: 'ignore' });
  execSync(`${gitBin} commit -m "deploy: Laboratorio Tactico y Ejercicios"`, { stdio: 'ignore' });
  execSync(`${gitBin} push -f "${remoteUrl}" HEAD:gh-pages`, { stdio: 'inherit' });
  console.log('¡Despliegue a GitHub Pages completado con éxito!');
} finally {
  process.chdir('..');
  fs.rmSync(path.join(distDir, '.git'), { recursive: true, force: true });
}
