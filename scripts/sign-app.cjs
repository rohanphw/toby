// Sign executable code, then seal its containing bundles. Chromium data is not code.
const {readdir,open}=require('node:fs/promises');
const path=require('node:path');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const exec=promisify(execFile);
module.exports=async function sign(options){
 const identity='Developer ID Application: Rohan Pahwa (L75A27832H)';
 const binaries=[],bundles=[];
 async function walk(directory){for(const item of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isSymbolicLink())continue;if(item.isDirectory()){await walk(file);if(/\.(app|framework)$/.test(file))bundles.push(file);}else if(item.isFile()){const h=await open(file,'r');const b=Buffer.alloc(4);try{await h.read(b,0,4,0);}finally{await h.close();}if(['cffaedfe','cefaedfe','feedfacf','feedface','cafebabe','bebafeca','cafebabf','bfbafeca'].includes(b.toString('hex')))binaries.push(file);}}}
 await walk(options.app);
 const targets=[...binaries,...bundles,options.app].sort((a,b)=>b.split(path.sep).length-a.split(path.sep).length);
 for(let index=0;index<targets.length;index++){const file=targets[index];const args=['--force','--sign',identity,'--timestamp','--options','runtime'];if(file.endsWith('.app')||!file.endsWith('.dylib')&&!file.endsWith('.node')&&!file.includes('.framework/'))args.push('--entitlements',path.resolve('packaging/entitlements.plist'));args.push(file);await exec('/usr/bin/codesign',args,{timeout:120000});if(index%10===0||index===targets.length-1)console.log(`Signed executable/bundle ${index+1}/${targets.length}`);}
 await exec('/usr/bin/codesign',['--verify','--deep','--strict',options.app],{timeout:120000});
};
