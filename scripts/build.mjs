import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const categories = ['立绘', '立绘系列', '插画'];
const base = 'https://sus66618.github.io/ai-girls-gallery/';
const items = [];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const href = value => value.split('/').map(encodeURIComponent).join('/');

async function walk(folder) {
  const entries = await fs.readdir(path.join(root, folder), {withFileTypes:true});
  entries.sort((a,b) => a.name.localeCompare(b.name, 'zh-CN'));
  for (const entry of entries) {
    const relative = folder + '/' + entry.name;
    if (entry.isDirectory()) await walk(relative);
    else if (/\.(png|jpe?g|webp|gif)$/i.test(entry.name)) {
      const buffer = await fs.readFile(path.join(root, relative));
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const metadata = await sharp(buffer).metadata();
      const id = crypto.createHash('sha256').update(relative).digest('hex').slice(0,16);
      await fs.mkdir(path.join(root, 'previews'), {recursive:true});
      await sharp(buffer).rotate().resize({width:480,height:600,fit:'inside',withoutEnlargement:true}).webp({quality:78}).toFile(path.join(root, `previews/${id}.webp`));
      const parts = relative.split('/');
      const category = parts[0];
      const collection = parts.length > 2 ? parts.slice(1,-1).join(' / ') : '场景与故事';
      const number = items.filter(x => x.category === category && x.collection === collection).length + 1;
      items.push({id,path:relative,url:href(relative),preview:`previews/${id}.webp`,category,collection,title:`${collection} · ${String(number).padStart(2,'0')}`,filename:entry.name,width:metadata.width,height:metadata.height,bytes:buffer.length,sha256});
    }
  }
}
for (const category of categories) await walk(category);
await fs.writeFile(path.join(root,'gallery.json'), JSON.stringify(items,null,2) + '\n');
const cards = items.map(item=>`<article class="card" data-id="${item.id}"><button class="art" data-open="${item.id}" aria-label="查看 ${escape(item.title)}"><img src="${item.preview}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async" alt="${escape(item.category+' / '+item.title)}"></button><div class="caption"><div><span>${escape(item.category)}</span><h3>${escape(item.title)}</h3></div><a class="download-icon" href="${item.url}" download="${escape(item.filename)}" aria-label="下载原图 ${escape(item.title)}">↓</a></div></article>`).join('\n');
const collections = [...new Set(items.map(x=>x.collection))];
const cover = items.find(x=>x.category === '插画') || items[0];
await sharp(path.join(root,cover.path)).resize(1200,630,{fit:'contain',background:'#f4f0e8'}).jpeg({quality:85}).toFile(path.join(root,'social-cover.jpg'));
let html = await fs.readFile(path.join(root,'scripts/template.html'),'utf8');
const values = {CARDS:cards,COUNT:items.length,SIZE:Math.round(items.reduce((s,x)=>s+x.bytes,0)/1048576),COLLECTIONS:collections.map(x=>`<option>${escape(x)}</option>`).join('')};
html = html.replace(/\{\{(CARDS|COUNT|SIZE|COLLECTIONS)\}\}/g, (_,key)=>values[key]);
await fs.writeFile(path.join(root,'index.html'),html);
await fs.writeFile(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`);
await fs.writeFile(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}</loc></url></urlset>\n`);
console.log(JSON.stringify({images:items.length,bytes:items.reduce((s,x)=>s+x.bytes,0),collections:collections.length}));
