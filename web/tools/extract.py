import re, json, sys, os, glob
import xml.etree.ElementTree as ET
src=sys.argv[1]; out=sys.argv[2]
KEEP={'Solid','Solid2','Solid3','UnmovableSolid','SolidMove','Spike','Spike2','JumpThrough','UnmovableJumpThrough',
      'JumpBoost','Portal','RocketLauncher','Coin','EndFlag','Collider','GroundPoundSolid','SpriteFontDeluxe','SpriteFontDeluxeW',
      'LayoutNumber','Tiledbackground','Veil','MoveArea','ButtonTrigger','Decor','Decor2'}
levels={}
for f in glob.glob(os.path.join(src,'Level *.xml')):
    name=os.path.basename(f)[:-4]
    m=re.fullmatch(r'Level (\d+)',name)
    if not m: continue
    n=int(m.group(1))
    if n>60: continue
    root=ET.parse(f).getroot()
    W=int(root.find('size/width').text); H=int(root.find('size/height').text)
    objs=[]; bg=None
    for layer in root.iter('layer'):
        vis=layer.findtext('initially-visible')=='1'
        lname=layer.get('name')
        if lname=='Background': bg=layer.findtext('background-color')
        for inst in layer.iter('instance'):
            t=inst.get('type')
            if t not in KEEP: continue
            w=inst.find('world')
            g=lambda k: float(w.findtext(k))
            o={'t':t,'x':round(g('x'),2),'y':round(g('y'),2),'w':round(g('width'),2),'h':round(g('height'),2),
               'hx':round(g('hotspotX'),3),'hy':round(g('hotspotY'),3),'a':round(g('angle'),6)}
            if not vis: o['hid']=1
            o['uid']=int(inst.get('uid'))
            if t in ('MoveArea','ButtonTrigger','RocketLauncher','Coin'):
                iv2=inst.find('instance-variables')
                if iv2 is not None: o['v']={c.tag:c.text for c in iv2}
            if t=='MoveArea':
                for b in inst.iter('behavior-instance'):
                    if b.get('type')=='Zigzag':
                        o['zz']={c.tag:c.text for c in b.find('properties')}
            p0=inst.find('properties')
            if p0 is not None and p0.findtext('initial-visibility')=='Invisible': o['inv']=1
            iv=inst.find('instance-variables')
            if iv is not None and t in ('JumpBoost','Portal','Spike','Spike2'):
                o['v']={c.tag:c.text for c in iv}
            if t.startswith('SpriteFont') or t=='LayoutNumber':
                p=inst.find('properties')
                o['text']=p.findtext('text'); o['scale']=float(p.findtext('scale') or 1)
                o['al']=float(p.findtext('horizontal-alignment') or 0)
                vv=inst.find('instance-variables')
                if vv is not None and vv.findtext('default'): o['def']=vv.findtext('default')
            objs.append(o)
    levels[n]={'n':n,'w':W,'h':H,'bg':bg,'objs':objs}
json.dump([levels[k] for k in sorted(levels)],open(out,'w'),separators=(',',':'))
print(len(levels), os.path.getsize(out))
