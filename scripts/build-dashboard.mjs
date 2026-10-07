import {spawnSync} from 'node:child_process';
import {resolve,join,relative} from 'node:path';
import {mkdirSync,rmSync,cpSync,readdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';

const root=process.cwd();
const dist=resolve(root,'dist');
if(relative(root,dist)!=='dist')throw new Error('Unexpected output directory');
rmSync(dist,{recursive:true,force:true});
mkdirSync(dist,{recursive:true});
function run(path,args=[]){
 const result=spawnSync(process.execPath,[resolve(root,path),...args],{cwd:root,stdio:'inherit',env:{...process.env,NODE_ENV:'production'},windowsHide:true});
 if(result.status!==0)throw new Error(`Build command failed: ${path}`);
}
run('node_modules/typescript/bin/tsc',['--noEmit','-p','tsconfig.node.json']);
run('node_modules/typescript/bin/tsc',['--noEmit','-p','tsconfig.app.json']);
run('node_modules/@nestjs/cli/bin/nest.js',['build']);
rmSync(join(dist,'server/dashboard/core/services/date-range.test.js'),{force:true});
run('node_modules/vite/bin/vite.js',['build','--config','vite.config.ts']);
cpSync(join(root,'server/dashboard/core/data'),join(dist,'server/dashboard/core/data'),{recursive:true});
mkdirSync(join(dist,'deployment'),{recursive:true});
cpSync(join(root,'deployment/custom-mappings.json'),join(dist,'deployment/custom-mappings.json'));
mkdirSync(join(dist,'dist/client'),{recursive:true});
if(existsSync(join(root,'client/public')))cpSync(join(root,'client/public'),join(dist,'dist/client'),{recursive:true});
for(const entry of readdirSync(join(dist,'client'))){
 if(entry.endsWith('.html')){
  const source=join(dist,'client',entry);
  cpSync(source,join(dist,'dist/client',entry));
  rmSync(source);
 }
}
cpSync(join(root,'scripts/run.sh'),join(dist,'run.sh'));
cpSync(join(root,'.env'),join(dist,'.env'));
run('scripts/prune-smart.js');
const runtimePackage=JSON.parse(readFileSync(join(dist,'package.json'),'utf8'));
runtimePackage.scripts={start:'node server/main.js'};
runtimePackage.main='server/main.js';
writeFileSync(join(dist,'package.json'),JSON.stringify(runtimePackage,null,2)+'\n');
console.log('Dashboard production package built.');
