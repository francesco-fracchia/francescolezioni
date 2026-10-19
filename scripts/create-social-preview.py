from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from pathlib import Path
# Optional authoring tool: python3 -m pip install Pillow fonttools brotli
# Run from the repository root; uses only the bundled, licensed font subsets.
for name,source,axes in [('dm-medium','app/fonts/dm-sans-latin-variable.woff2',{'wght':500}),('manrope-bold','app/fonts/manrope-latin-variable.woff2',{'wght':800})]:
 font=instantiateVariableFont(TTFont(source),axes,inplace=True);font.flavor=None;font.save('/private/tmp/ff-'+name+'.ttf')
font=lambda name,size:ImageFont.truetype('/private/tmp/ff-'+name+'.ttf',size)
image=Image.new('RGB',(1200,630),'#f8faff');d=ImageDraw.Draw(image)
d.rectangle((0,0,12,630),fill='#2563eb')
logo=Image.open('public/francesco-fracchia-logo.png').convert('RGBA');logo.thumbnail((330,110),Image.Resampling.LANCZOS);image.paste(logo,(49,27),logo)
d.text((67,189),'Matematica e',font=font('manrope-bold',76),fill='#0f2d5b')
d.text((67,281),'informatica',font=font('manrope-bold',76),fill='#2563eb')
d.text((71,405),'Ripetizioni per superiori e università',font=font('dm-medium',29),fill='#405775')
d.text((71,452),'A Lodi e online',font=font('dm-medium',29),fill='#405775')
d.line((71,540,1129,540),fill='#d7e2f2',width=2)
d.text((71,565),'lezionifrancesco.app',font=font('dm-medium',23),fill='#0f2d5b')
# A restrained mathematical sketch, separate from the service text.
d.rounded_rectangle((892,186,1128,422),radius=22,fill='#e9f0ff')
d.line((925,367,1095,367),fill='#9eb6df',width=2);d.line((1008,220,1008,389),fill='#9eb6df',width=2)
points=[(x,367-int(((x-1008)/76)**2*124)) for x in range(932,1085)]
d.line(points,fill='#2563eb',width=5);d.ellipse((1003,362,1013,372),fill='#2563eb')
image.save('public/images/lezioni-francesco-social.png',optimize=True)
print('Social preview:',Path('public/images/lezioni-francesco-social.png').stat().st_size,'bytes')
