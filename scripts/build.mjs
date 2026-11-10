import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const categories = ['立绘', '立绘系列', '插画'];
const repository = 'https://github.com/sus66618/ai-girls-gallery';
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
const collections = [...new Set(items.map(x=>x.collection))];

// GitHub 原生 README 图墙，缩略图点击后打开对应原图。
function imageTable(group, folder) {
  const relative = target => href(path.posix.relative(folder, target));
  const rows = [];
  for (let index = 0; index < group.length; index += 3) {
    const cells = group.slice(index,index+3).map(item => `<td align="center" width="33%"><a href="${relative(item.path)}"><img src="${relative(item.preview)}" height="230" alt="${escape(item.title)}"></a><br>${escape(item.title)}<br><a href="${relative(item.path)}">查看原图</a> · <a href="https://raw.githubusercontent.com/sus66618/ai-girls-gallery/main/${item.url}">下载原图</a></td>`);
    rows.push('<tr>' + cells.join('') + '</tr>');
  }
  return '<table>\n' + rows.join('\n') + '\n</table>';
}

const folders = new Set(items.map(item => path.posix.dirname(item.path)));
for (const category of categories) folders.add(category);
for (const folder of folders) {
  const group = items.filter(item => item.path.startsWith(folder+'/'));
  const heading = folder.split('/').at(-1);
  const back = href(path.posix.relative(folder,'README.md'));
  const subfolders = [...new Set(group.map(item => path.posix.dirname(item.path)))].filter(name => name !== folder);
  const navigation = subfolders.map(name => `- [${name.split('/').at(-1)}](${href(path.posix.relative(folder,name))}/)`).join('\n');
  await fs.writeFile(path.join(root,folder,'README.md'), `# ${heading}\n\n[返回图库首页](${back}) · ${group.length} 张原图\n\n点击缩略图查看原图。打开文件后，可使用 GitHub 的下载按钮保存原文件。\n\n${navigation}\n\n${imageTable(group,folder)}\n`);
}
const names = ['GPT','Claude','DeepSeek','Gemini','千问','Grok','Kimi','MiniMax','智谱','混元','豆包（Seed）'];
const featured = names.map(name => items.find(item => item.category === '立绘' && item.collection === name)).filter(Boolean);
const categoryLinks = categories.map(category => `| [${category}](${href(category)}/) | ${items.filter(item=>item.category===category).length} |`).join('\n');
const series = [...new Set(items.filter(item=>item.category==='立绘系列').map(item=>item.collection))].map(name=>`[${name}](${href('立绘系列/'+name)}/)`).join(' · ');
const readme = `# AI娘图库 · AI Girls Gallery\n\n**${items.length} 张原始图片 · 11 位 AI 娘 · 13 个服装主题系列**\n\nAI 拟人角色的立绘、换装与故事插画。直接在 GitHub 浏览，点击缩略图查看大图，进入原图页面后点击下载按钮保存。\n\n**[全部原图 ZIP](${repository}/releases/latest/download/ai-girls-all.zip) · [分类压缩包](${repository}/releases/latest) · [使用与来源](USAGE.md)**\n\n## 认识她们\n\n${imageTable(featured,'')}\n\n## 浏览全部作品\n\n| 分类 | 原图数量 |\n| --- | --- |\n${categoryLinks}\n\n### 主题系列\n\n${series}\n\n## 下载\n\n| 压缩包 | 内容 |\n| --- | --- |\n| [全部作品](${repository}/releases/latest/download/ai-girls-all.zip) | 298 张完整原图 |\n| [立绘](${repository}/releases/latest/download/characters.zip) | 91 张 |\n| [立绘系列](${repository}/releases/latest/download/collections.zip) | 143 张 |\n| [插画](${repository}/releases/latest/download/illustrations.zip) | 64 张 |\n\n原始图片合计约 506 MiB。压缩包保留云盘的文件夹层级、文件名和图片格式。仓库的 gallery.json 记录每张原图的尺寸、字节数和 SHA-256。缩略图仅供浏览，下载入口提供原始文件。\n\n## 创作与署名\n\n- 原始角色立绘与设计来自 Bilibili 创作者 **[ZipZipPipe](https://space.bilibili.com/4168597)**。\n- 其他衍生立绘、服装系列与插画由 **sus66618** 策划整理，使用 GPT 生图工具生成，模型名称按整理者提供记为 **Image 2.5**。\n- 整理者对其有权许可的新增生成作品开放免费使用、修改、商用和再分发，无强制署名要求。原始第三方作品和标识依照各自权利人的许可使用，详见 [USAGE.md](USAGE.md)。\n\n喜欢她们的话，欢迎 **Star、分享链接，或者在 Issue 展示二创作品**。\n\n## English\n\nAn open collection of **298 AI girl / AI gijinka artworks**, featuring GPT, Claude, DeepSeek, Gemini, Qwen, Grok, Kimi, MiniMax, GLM, Hunyuan and Seed. Browse character art, themed outfits and illustrations directly on GitHub. Click thumbnails to view originals, or download complete ZIP archives from [Releases](${repository}/releases/latest).\n\nOriginal designs are credited to **ZipZipPipe**. Additional AI-generated artwork is curated by **sus66618**. See [usage and credits](USAGE.md) for permissions. Stars, shares and fan creations are welcome.\n\n## 更新预览\n\n将新图放入三个素材目录后，运行 \`npm ci\` 和 \`npm run build\`，生成缩略图、各级 README 图墙及文件校验清单。预览生成脚本采用 MIT 许可。\n`;
await fs.writeFile(path.join(root,'README.md'),readme);
console.log(JSON.stringify({images:items.length,bytes:items.reduce((s,x)=>s+x.bytes,0),collections:collections.length}));
